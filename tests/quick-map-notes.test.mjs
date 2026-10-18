import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = new Map();
globalThis.Hooks = {
  once(name, cb) {listeners.set(name, cb);},
  on(name, cb) {listeners.set(name, cb);}
};
const players = [
  {id:'p-1',isGM:false,name:'Player One'},
  {id:'p-2',isGM:false,name:'Player Two'},
  {id:'g-1',isGM:true,name:'GM'}
];
const journalMap = new Map();
const settings = new Map();
let createCalls = 0;
let lastJournalData = null;
let lastPageData = null;
let createdPages = 0;
let issuedNote = null;
let noteShouldFail = false;
let uploadCalls = [];
const scene = {
  id: 'scene-123', name: 'Maryland Heights',
  async createEmbeddedDocuments(kind,data) {
    assert.equal(kind,'Note');
    if(noteShouldFail) throw Error('Scene rejected note');
    issuedNote = data[0];
    return [{id:'note1',...issuedNote}];
  }
};

globalThis.game = {
  user:{isGM:true},
  users:players,
  journal: {
    get(id){return journalMap.get(id);},
    [Symbol.iterator](){return journalMap.values();}
  },
  settings: {
    register(key,name,opts){settings.set(`${key}:${name}`,opts.default);},
    get(key,name){return settings.get(`${key}:${name}`);},
    async set(key,name,value){settings.set(`${key}:${name}`,value);}
  }
};
globalThis.CONST={JOURNAL_ENTRY_PAGE_FORMATS:{HTML:1}};
globalThis.CONFIG={queries:{}};
globalThis.foundry={
  utils:{randomID(){return 'Abc12345';}},
  applications:{
    api:{DialogV2:{async input(){return null;}}},
    apps:{
      FilePicker:{
        async uploadPersistent(...args) {
          uploadCalls.push(args);
          return {path:`storage/stl-quick-map-notes/${args[2].name}`};
        }
      }
    }
  }
};
globalThis.JournalEntry={
  async create(data){
    createCalls++;lastJournalData=data;
    const id=`newjournal${createCalls}`;
    const j={id,name:data.name,folder:data.folder,ownership:data.ownership,flags:data.flags,
      pages:(data.pages??[]).map((p,i)=>({id:`newpage${createCalls}-${i}`,...p})),
      async createEmbeddedDocuments(kind,pageData) {
        assert.equal(kind,'JournalEntryPage');
        const pages=pageData.map(data=>({id:`added-page${++createdPages}`,...data}));
        lastPageData=pageData[0];
        this.pages.push(...pages);
        return pages;
      }};
    journalMap.set(id,j);
    return j;
  }
};
globalThis.ui={notifications:{info(){},error(){},warn(){}}};
globalThis.canvas={scene,ready:true,dimensions:{sceneRect:{x:0,y:0,width:500,height:500}}};

const {ICONS,escapeHtml,journalHtml,hexColor,buildOwnership,buildPlayerOwnership,makeNoteData,createQuickMapNote,uploadNewIcon, isModuleSuppliedJournal, isRulesReferenceName, isRulesReferenceJournal, buildJournalOptions,playerIconValid,validatePlayerNoteRequest,encodePlayerImage,decodePlayerImage,submitPlayerNoteRequest,verifyPlayerNoteQuery,handlePlayerNoteQuery,ensurePlayerMapNotesFolder,findPlayerMapJournal,canReadPlayerMapJournal,tutorialSlides,isTutorialDismissed,dismissQuickMapTutorial,showQuickMapTutorial,listVisibleSceneNotes,findQuickNoteHtml,panToQuickNote,planSelectedTokensToNote,moveSelectedTokensToQuickNote,showFindQuickNotes} = await import('../scripts/main.mjs');

const baseForm = ()=>({
  title:'Old Warehouse',description:'Possible <danger> & clues',
  existingJournal:'',visibility:'gm',iconPreset:ICONS[0][1],
  iconSize:'40',tint:'#edab12',applyTint:true,globallyVisible:false
});

test('Foundry 14 hook registers adjacent Place/Find buttons for players and GMs in Token Controls',()=>{
  assert.equal(typeof listeners.get('init'),'function');
  listeners.get('init')();
  const controls={
    tokens:{tools:{select:{order:1},target:{order:2}}},
    notes:{tools:{select:{order:1},create:{order:2}}}
  };
  listeners.get('getSceneControlButtons')(controls);
  assert.equal(controls.tokens.tools.stlQuickMapNote.button,true);
  assert.equal(controls.tokens.tools.stlQuickMapNote.order,3);
  assert.equal(controls.tokens.tools.stlQuickMapNote.visible,true);
  assert.equal(controls.tokens.tools.stlQuickMapNote.title,'Place Quick Note');
  assert.equal(controls.tokens.tools.stlFindQuickNote.title,'Find Quick Note');
  assert.equal(controls.tokens.tools.stlFindQuickNote.order,4);
  assert.equal(controls.tokens.tools.stlFindQuickNote.button,true);
  assert.equal(controls.notes.tools.stlQuickMapNote,undefined);
  assert.equal(controls.notes.tools.stlFindQuickNote,undefined);
  game.user.isGM=false;
  const controls2={tokens:{tools:{select:{order:1}}},notes:{tools:{select:{order:1}}}};
  listeners.get('getSceneControlButtons')(controls2);
  assert.equal(controls2.tokens.tools.stlQuickMapNote.button,true);
  assert.equal(controls2.tokens.tools.stlFindQuickNote.button,true);
  game.user.isGM=true;
});

test('control hook tolerates unavailable Token Controls without altering Journal Notes',()=>{
  const controls={notes:{tools:{select:{order:1}}}};
  listeners.get('getSceneControlButtons')(controls);
  assert.deepEqual(Object.keys(controls.notes.tools),['select']);
});

test('GM-only, limited, observer and selected player ownership',()=>{
  assert.deepEqual(buildOwnership('gm',{},players),{default:0});
  assert.deepEqual(buildOwnership('pin',{},players),{default:1});
  assert.deepEqual(buildOwnership('read',{},players),{default:2});
  assert.deepEqual(buildOwnership('specific',{'p-1':'1','p-2':'2','g-1':'2'},players),
    {default:0,'p-1':1,'p-2':2});
  assert.deepEqual(buildOwnership('unknown',{},players),{default:0});
});

test('escape HTML in new Journal text and normalize color',()=>{
  assert.equal(escapeHtml('<b>"&\'</b>'), '&lt;b&gt;&quot;&amp;&#39;&lt;/b&gt;');
  assert.equal(journalHtml('Hello <GM>\nNext'),'<p>Hello &lt;GM&gt;<br>Next</p>');
  assert.equal(hexColor('not-a-color'),'#FFFFFF');
  assert.equal(hexColor('#abcdef'),'#ABCDEF');
});

test('native Note payload stores icon src/tint, size, fog and Journal references',()=>{
  const n=makeNoteData({x:10.6,y:20.2,title:'Warehouse',journalId:'a',pageId:'b',
    icon:ICONS[0][1],tint:'#6699cc',size:48,globallyVisible:true});
  assert.equal(n.entryId,'a');
  assert.equal(n.pageId,'b');
  assert.deepEqual(n.texture,{src:ICONS[0][1],tint:'#6699CC'});
  assert.equal(n.global,true);
  assert.equal(n.x,11);
  assert.equal(n.iconSize,48);
});

test('creates native Journal + Page and one Note using explicit GM-only permission',async()=>{
  const before=createCalls;
  const {journal,note}=await createQuickMapNote({scene,at:{x:120,y:230},form:baseForm(),users:players});
  assert.equal(createCalls,before+1);
  assert.deepEqual(journal.ownership,{default:0});
  assert.equal(lastJournalData.pages[0].ownership.default,-1);
  assert.match(lastJournalData.pages[0].text.content,/&lt;danger&gt; &amp; clues/);
  assert.equal(note.entryId,journal.id);
  assert.equal(note.pageId,journal.pages[0].id);
  assert.equal(note.texture.tint,'#EDAB12');
  assert.equal(note.global,false);
});

test('specific player permissions applied to new Journal, GM never included',async()=>{
  const form=baseForm();
  form.visibility='specific';form['perm_p-1']='1';form['perm_p-2']='2';form['perm_g-1']='2';
  await createQuickMapNote({scene,at:{x:10,y:20},form,users:players});
  assert.deepEqual(lastJournalData.ownership,{default:0,'p-1':1,'p-2':2});
});

test('linking an existing Journal does not update or replace it',async()=>{
  const existing={id:'existing-123',name:'GM Secrets',ownership:{default:0},pages:[{id:'secret-page'}]};
  journalMap.set(existing.id,existing);
  const before=createCalls;
  const form=baseForm();form.existingJournal=existing.id;form.title='GM Pin';form.visibility='read';
  const {note,linkedExisting}=await createQuickMapNote({scene,at:{x:12,y:18},form,users:players});
  assert.equal(createCalls,before);
  assert.equal(linkedExisting,true);
  assert.equal(note.entryId,existing.id);
  assert.equal(note.pageId,undefined);
  assert.deepEqual(existing.ownership,{default:0});
});

test('failed pin creation preserves already-created Journal without deletion',async()=>{
  noteShouldFail=true;
  const before=createCalls;
  await assert.rejects(
    createQuickMapNote({scene,at:{x:20,y:30},form:baseForm(),users:players}),
    /new Journal "Old Warehouse" was kept/
  );
  assert.equal(createCalls,before+1);
  noteShouldFail=false;
});

test('image upload uses unique persistent module filename and returns URL',async()=>{
  uploadCalls=[];
  const file = new File(['image bytes'],'original.png',{type:'image/png'});
  const path=await uploadNewIcon(file);
  assert.equal(uploadCalls.length,1);
  assert.equal(uploadCalls[0][0],'stl-quick-map-notes');
  assert.equal(uploadCalls[0][1],'');
  assert.equal(uploadCalls[0][2].name,'map-note-Abc12345.png');
  assert.match(path,/storage\/stl-quick-map-notes\/map-note-Abc12345.png/);
});

test('failed upload cannot create a Journal or Note',async()=>{
  const before=createCalls;
  const form=baseForm();form.iconPreset='custom';
  await assert.rejects(createQuickMapNote({
    scene,at:{x:20,y:30},form,users:players,
    uploadedFile:{type:'image/png',size:1024},upload:async()=>{throw Error('upload failed');}
  }),/upload failed/);
  assert.equal(createCalls,before);
});

test('only GM can create; invalid title or mismatched existing Journal causes no data mutations',async()=>{
  const before=createCalls;
  game.user.isGM=false;
  await assert.rejects(createQuickMapNote({scene,at:{x:1,y:1},form:baseForm()}),/Only a GM/);
  game.user.isGM=true;
  const noTitle=baseForm();noTitle.title='';
  await assert.rejects(createQuickMapNote({scene,at:{x:1,y:1},form:noTitle}),/Enter a title/);
  const missing=baseForm();missing.existingJournal='does-not-exist';
  await assert.rejects(createQuickMapNote({scene,at:{x:1,y:1},form:missing}),/no longer exists/);
  assert.equal(createCalls,before);
});

test('quick tool arms next scene click, Escape cancels, and click presents icon/tint/upload dialog',async()=>{
  const boardEvents=new Map();
  const docEvents=new Map();
  const board={style:{cursor:'default'},
    addEventListener(name,fn){boardEvents.set(name,fn);},
    removeEventListener(name,fn){if(boardEvents.get(name)===fn)boardEvents.delete(name);}
  };
  globalThis.document={
    createElement(){return {innerHTML:''};},
    addEventListener(name,fn){docEvents.set(name,fn);},
    removeEventListener(name,fn){if(docEvents.get(name)===fn)docEvents.delete(name);}
  };
  canvas.app={canvas:board};
  canvas.canvasCoordinatesFromClient=point=>point;
  let receivedDialog=null;
  foundry.applications.api.DialogV2.input=async config=>{receivedDialog=config;return null;};
  const controls={tokens:{tools:{select:{order:0}}},notes:{tools:{select:{order:0}}}};
  listeners.get('getSceneControlButtons')(controls);
  controls.tokens.tools.stlQuickMapNote.onChange();
  assert.equal(board.style.cursor,'crosshair');
  assert.equal(boardEvents.has('pointerdown'),true);
  docEvents.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(board.style.cursor,'default');
  assert.equal(boardEvents.has('pointerdown'),false);
  controls.tokens.tools.stlQuickMapNote.onChange();
  const point={button:0,clientX:35,clientY:90,preventDefault(){},stopImmediatePropagation(){}};
  boardEvents.get('pointerdown')(point);
  await new Promise(setImmediate);
  assert.equal(boardEvents.has('pointerdown'),false);
  assert.equal(board.style.cursor,'default');
  assert.equal(receivedDialog.window.title,'Quick Map Note');
  assert.match(receivedDialog.content.innerHTML,/Upload image/);
  assert.match(receivedDialog.content.innerHTML,/Icon tint/);
  assert.match(receivedDialog.content.innerHTML,/id="stl-qmn-show-tutorial"/);
  assert.match(receivedDialog.content.innerHTML,/Everyone sees the pin/);
});

test('module provenance excludes imported module journals but retains world and system imports', () => {
  const packs=new Map([
    ['tc-modern.locations',{metadata:{packageType:'module'}}],
    ['custom-world.notes',{metadata:{packageType:'world'}}],
    ['worldofdarkness.rules',{metadata:{packageType:'system'}}]
  ]);
  const modules=new Map([['tc-modern',{id:'tc-modern'}],['another-addon',{id:'another-addon'}]]);
  const check = j => isModuleSuppliedJournal(j,{packs,modules});
  assert.equal(check({id:'j1',_stats:{compendiumSource:'Compendium.tc-modern.locations.JournalEntry.ID123'}}),true);
  assert.equal(check({id:'j2',_source:{_stats:{compendiumSource:'Compendium.tc-modern.locations.JournalEntry.ID123'}}}),true);
  assert.equal(check({id:'j3',_stats:{compendiumSource:'Compendium.another-addon.notes.JournalEntry.ID'}}),true);
  assert.equal(check({id:'j4',_stats:{compendiumSource:'Compendium.custom-world.notes.JournalEntry.ID'}}),false);
  assert.equal(check({id:'j5',_stats:{compendiumSource:'Compendium.worldofdarkness.rules.JournalEntry.ID'}}),false);
  assert.equal(check({id:'j6',_stats:{compendiumSource:'JournalEntry.abc'}}),false);
  assert.equal(check({id:'j7',inCompendium:true}),true);
  assert.equal(check({id:'j8',flags:{core:{sourceId:'Compendium.tc-modern.locations.JournalEntry.ID'}}}),true);
});

test('module-generated flag excludes source entries but harmless module metadata never hides user journals', () => {
  const modules=new Map([['other-module',{}]]);
  const opts={packs:new Map(),modules};
  assert.equal(isModuleSuppliedJournal({id:'native',flags:{'other-module':{color:'#00ff00'}}},opts),false);
  assert.equal(isModuleSuppliedJournal({id:'quick',flags:{'stl-quick-map-notes':{createdWith:'0.1.1'}}},opts),true);
  assert.equal(isModuleSuppliedJournal({id:'other',flags:{'other-module':{createdBy:'other-module'}}},opts),true);
  assert.equal(isModuleSuppliedJournal({id:'other2',flags:{'other-module':{moduleCreated:true}}},opts),true);
  assert.equal(isModuleSuppliedJournal({id:'custom',flags:{world:{createdWith:'my-campaign'}}},opts),false);
});

test('existing Journal choices follow nested folder hierarchy and escape option text', () => {
  const root={id:'folder-root',name:'Campaign',ancestors:[]};
  const locations={id:'folder-loc',name:'Locations',ancestors:[root]};
  const people={id:'folder-ppl',name:'People',ancestors:[root]};
  const sub={id:'folder-sub',name:'Warehouses',ancestors:[locations,root]};
  const empty={id:'folder-empty',name:'Empty Folder',ancestors:[root]};
  const modules=new Map([['tc-modern',{}]]);
  const packs=new Map([['tc-modern.entries',{metadata:{packageType:'module'}}]]);
  const entries=[
    {id:'j-w',name:'Warehouse 2',folder:sub},
    {id:'j-p',name:'Zoe & <Co>',folder:people},
    {id:'j-l',name:'Warehouse 10',folder:sub},
    {id:'j-unfiled',name:'Unfiled Notes',folder:null},
    {id:'j-block',name:'Module Secret',folder:empty,_stats:{compendiumSource:'Compendium.tc-modern.entries.JournalEntry.abc'}},
    {id:'j-qmn',name:'Auto-generated Note',folder:people,flags:{'stl-quick-map-notes':{createdWith:'0.1.1'}}}
  ];
  const html=buildJournalOptions(entries,{folders:new Map(),packs,modules});
  const pos = text => html.indexOf(text);
  assert.ok(pos('Campaign')>=0);
  assert.ok(pos('Campaign')<pos('Locations'));
  assert.ok(pos('Locations')<pos('Warehouses'));
  assert.ok(pos('Warehouses')<pos('Warehouse 2'));
  assert.ok(pos('Warehouse 2')<pos('Warehouse 10'));
  assert.ok(pos('Warehouses')<pos('People') || pos('People')<pos('Locations'));
  assert.ok(pos('Unfiled') > pos('People'));
  assert.match(html, /<option value="" disabled>Campaign<\/option>/);
  assert.match(html, /<option value="j-p">(?:&nbsp;){8}Zoe &amp; &lt;Co&gt;<\/option>/);
  assert.match(html, /<option value="j-w">(?:&nbsp;){12}Warehouse 2<\/option>/);
  assert.doesNotMatch(html, /Module Secret|Empty Folder|Auto-generated Note/);
});

test('journal tree resolves folder IDs, handles cycles, and never creates selectable folder headers', () => {
  const a={id:'A',name:'A Folder',folder:'B'};
  const b={id:'B',name:'B Folder',folder:'A'};
  const folders=new Map([['A',a],['B',b]]);
  const html=buildJournalOptions([{id:'visible',name:'Journal',folder:'A'}],{folders,packs:new Map(),modules:new Map()});
  assert.match(html,/value="visible"/);
  assert.match(html,/A Folder/);
  assert.match(html,/B Folder/);
  assert.match(html,/<option value="" disabled>/);
  assert.equal((html.match(/value="visible"/g)??[]).length,1);
  assert.equal(buildJournalOptions([], {folders,packs:new Map(),modules:new Map()}),
    '<option value="" disabled>No eligible world Journals found</option>');
});

test('Journal picker rendered by the map dialog filters modules and displays nested folders', async () => {
  const folder={id:'folder-journal',name:'Locations & Clues',ancestors:[]};
  const own={id:'journal-own',name:'Own Journal',folder};
  const imported={id:'journal-module',name:'Module Journal',folder,
    _stats:{compendiumSource:'Compendium.tc-modern.entries.JournalEntry.MOD'}};
  const priorPacks=game.packs;
  const priorModules=game.modules;
  const priorFolders=game.folders;
  game.packs=new Map([['tc-modern.entries',{metadata:{packageType:'module'}}]]);
  game.modules=new Map([['tc-modern',{id:'tc-modern'}]]);
  game.folders=new Map([[folder.id,folder]]);
  journalMap.set(own.id,own);
  journalMap.set(imported.id,imported);
  let config=null;
  const oldInput=foundry.applications.api.DialogV2.input;
  foundry.applications.api.DialogV2.input=async options=>{config=options;return null;};
  const boardEvents=new Map();
  const board={style:{cursor:'default'},
    addEventListener(name,handler){boardEvents.set(name,handler);},
    removeEventListener(name,handler){if(boardEvents.get(name)===handler)boardEvents.delete(name);}
  };
  const oldDocument=globalThis.document;
  const oldApp=canvas.app;
  const oldConverter=canvas.canvasCoordinatesFromClient;
  globalThis.document={createElement(){return {innerHTML:''};},addEventListener(){},removeEventListener(){}};
  canvas.app={canvas:board};
  canvas.canvasCoordinatesFromClient=pos=>pos;
  try {
    const controls={tokens:{tools:{select:{order:1}}}};
    listeners.get('getSceneControlButtons')(controls);
    controls.tokens.tools.stlQuickMapNote.onChange();
    boardEvents.get('pointerdown')({button:0,clientX:20,clientY:30,preventDefault(){},stopImmediatePropagation(){}});
    await new Promise(setImmediate);
    assert.ok(config);
    assert.match(config.content.innerHTML,/Locations &amp; Clues/);
    assert.match(config.content.innerHTML,/value="journal-own"/);
    assert.doesNotMatch(config.content.innerHTML,/value="journal-module"/);
  } finally {
    foundry.applications.api.DialogV2.input=oldInput;
    globalThis.document=oldDocument;
    canvas.app=oldApp;
    canvas.canvasCoordinatesFromClient=oldConverter;
    game.packs=priorPacks;
    game.modules=priorModules;
    game.folders=priorFolders;
    journalMap.delete(own.id);
    journalMap.delete(imported.id);
  }
});


test('Rules Reference matching is specific and handles common naming variants', () => {
  for (const value of ['Rules Reference', 'M20 Rules Reference', 'M20 - Rules Reference',
    'Mage Rules Reference', 'Rules-Reference (Mage)', 'rules_reference']) {
    assert.equal(isRulesReferenceName(value), true, value);
  }
  for (const value of ['Campaign', 'Reference Notes', 'Rules for Magic',
    'Character Reference', 'Book of Rules']) {
    assert.equal(isRulesReferenceName(value), false, value);
  }
  assert.equal(isRulesReferenceJournal({name:'Rules Reference'}), true);
  assert.equal(isRulesReferenceJournal({name:'My Journal'}, [{name:'Rules Reference'}]), true);
  assert.equal(isRulesReferenceJournal({name:'Campaign'}, [{name:'House Rules'}]), false);
  assert.equal(isRulesReferenceJournal({name:'Spheres', _stats:{
    compendiumSource:'Compendium.m20-rules-reference.rulebook.JournalEntry.abc'
  }}), true);
  assert.equal(isRulesReferenceJournal({name:'Spheres', flags:{core:{
    sourceId:'Compendium.m20_rulesReference.pages.JournalEntry.abc'
  }}}), true);
  assert.equal(isRulesReferenceJournal({name:'Spheres', _stats:{
    compendiumSource:'Compendium.worldofdarkness.rules.JournalEntry.abc'
  }}), false);
});

test('existing Journal picker hides entire Rules Reference subtree even if provenance was stripped', () => {
  const folder={id:'camp',name:'Campaign',ancestors:[]};
  const library={id:'ref',name:'M20 Rules Reference',ancestors:[]};
  const hiddenSection={id:'ref-sub',name:'Spheres',ancestors:[library]};
  const otherSection={id:'custom-sub',name:'Spheres',ancestors:[folder]};
  const gameJournals=[
    {id:'lib1',name:'Correspondence',folder:hiddenSection},
    {id:'lib2',name:'Arete',folder:library},
    {id:'lib3',name:'Rules Reference Index',folder:null},
    {id:'lib4',name:'A Source Without a Folder',folder:null,_stats:{
      compendiumSource:'Compendium.m20-rules-reference.pages.JournalEntry.abc'
    }},
    {id:'keep1',name:'Eli Notes',folder:otherSection},
    {id:'keep2',name:'Campaign Reference Notes',folder:null},
    {id:'keep3',name:'House Rules',folder:folder}
  ];
  const opts={folders:new Map(),packs:new Map(),modules:new Map()};
  const html=buildJournalOptions(gameJournals,opts);
  assert.doesNotMatch(html,/Correspondence|Arete|Rules Reference Index|A Source Without a Folder/);
  assert.doesNotMatch(html,/M20 Rules Reference/);
  assert.match(html,/value="keep1"/);
  assert.match(html,/value="keep2"/);
  assert.match(html,/value="keep3"/);
  assert.match(html,/Campaign/);
  assert.match(html,/Spheres/);
  assert.ok(html.indexOf('Campaign') < html.indexOf('Eli Notes'));
});

test('Rules Reference-only folders leave no ghost headings or selectable journals', () => {
  const ref={id:'ref',name:'Rules Reference',ancestors:[]};
  const section={id:'ref-child',name:'Chapter One',ancestors:[ref]};
  const html=buildJournalOptions([{id:'rule',name:'Spheres',folder:section}],{
    folders:new Map(),packs:new Map(),modules:new Map()
  });
  assert.equal(html,'<option value="" disabled>No eligible world Journals found</option>');
});

// --- v0.1.4: User.query challenges, two player sections, native folders ---
const gm={id:'g-1',isGM:true,active:true,name:'GM'};
const alice={id:'p-1',isGM:false,active:true,viewedScene:'scene-123',name:'Alice'};
const bob={id:'p-2',isGM:false,active:true,viewedScene:'scene-123',name:'Bob'};
const playerCollection=new Map([[gm.id,gm],[alice.id,alice],[bob.id,bob]]);
playerCollection.activeGM=gm;
let folderCreates=0;
globalThis.Folder={async create(data){
  folderCreates++;
  const folder={id:`folder-${folderCreates}`,...data};
  game.folders.set(folder.id,folder);
  return folder;
}};
function usePlayerCollection() {
  game.user=gm;
  for (const [id,j] of journalMap) {
    if (j.flags?.['stl-quick-map-notes']?.playerMapJournal) journalMap.delete(id);
  }
  game.users=playerCollection;
  game.scenes=new Map([[scene.id,{...scene,active:true,dimensions:canvas.dimensions}]]);
  game.folders=new Map();
  game.packs=new Map();
  game.modules=new Map();
}
const playerForm=(scope='personal')=>({...baseForm(),playerScope:scope});

// Need to make sure player note author can edit, party can read but not modify,
// and nobody else gets a private note.
test('ownership presets: personal is private; party is readable but only author owns',()=>{
  assert.deepEqual(buildPlayerOwnership('personal',alice.id),{default:0,'p-1':3});
  assert.deepEqual(buildPlayerOwnership('party',alice.id),{default:2,'p-1':3});
  assert.throws(()=>buildPlayerOwnership('read',alice.id),/Invalid player/);
  assert.throws(()=>buildPlayerOwnership('personal',''),/Player identity/);
});

test('player dialog offers Personal and Shared with Party instead of GM Journal selection', async()=>{
  usePlayerCollection();
  game.user=alice;
  const oldInput=foundry.applications.api.DialogV2.input;
  const events=new Map();
  const board={style:{cursor:'default'}, addEventListener(name,cb){events.set(name,cb);},
    removeEventListener(name){events.delete(name);}};
  canvas.app={canvas:board};
  canvas.canvasCoordinatesFromClient=p=>p;
  let capture=null;
  foundry.applications.api.DialogV2.input=async config=>{capture=config;return null;};
  const controls={tokens:{tools:{select:{order:1}}}};
  listeners.get('getSceneControlButtons')(controls);
  try {
    controls.tokens.tools.stlQuickMapNote.onChange();
    events.get('pointerdown')({button:0,clientX:5,clientY:10,preventDefault(){},stopImmediatePropagation(){}});
    await new Promise(setImmediate);
    const html=capture.content.innerHTML;
    assert.match(html, /name="playerScope"/);
    assert.match(html, /Personal — only you and the GM/);
    assert.match(html, /Shared with Party — everyone can read/);
    assert.doesNotMatch(html,/Use an existing Journal|name="visibility"|Choose specific players/);
    assert.match(html, /name="description"/);
    assert.match(html,/Icon tint|Upload image/);
  }finally {foundry.applications.api.DialogV2.input=oldInput;game.user=gm;}
});

test('player GM-validation limits modes, scene, note content, paths and private Journal links',()=>{
  usePlayerCollection();
  const campaignScene=game.scenes.get(scene.id),at={x:22,y:24};
  const form=playerForm('personal');
  assert.equal(validatePlayerNoteRequest({scene:campaignScene,at,form,user:alice}),true);
  assert.equal(validatePlayerNoteRequest({scene:campaignScene,at,form:playerForm('party'),user:alice}),true);
  assert.throws(()=>validatePlayerNoteRequest({scene:campaignScene,at,form:{...form,playerScope:'read'},user:alice}),/choose Personal/i);
  assert.throws(()=>validatePlayerNoteRequest({scene:campaignScene,at,form:{...form,existingJournal:'gm-secret'},user:alice}),/not an existing Journal/);
  assert.throws(()=>validatePlayerNoteRequest({scene:campaignScene,at,form:{...form,description:'x'.repeat(10001)},user:alice}),/10,000/);
  assert.throws(()=>validatePlayerNoteRequest({scene:campaignScene,at:{x:900,y:90},form,user:alice}),/inside the Scene/);
  assert.throws(()=>validatePlayerNoteRequest({scene:campaignScene,at,form,user:gm}),/Invalid player/);
  assert.throws(()=>validatePlayerNoteRequest({scene:{...campaignScene,id:'other'},at,form,user:alice}),/Scene they are viewing/);
  for(const path of ['https://x.io/track.png','../secrets.png','//host/file.svg','file\\escape.png']){
    assert.equal(playerIconValid(path),false,path);
    assert.throws(()=>validatePlayerNoteRequest({scene:campaignScene,at,
      form:{...form,iconPreset:'custom',customPath:path},user:alice}),/valid map icon/);
  }
  assert.equal(playerIconValid('assets/icons/custom.svg'),true);
});

test('first personal note creates one Scene-named Journal with private Page and linked pin',async()=>{
  usePlayerCollection();folderCreates=0;
  const old=journalMap.size;
  const result=await createQuickMapNote({scene,at:{x:40,y:42},form:playerForm(),users:[alice,bob],requester:alice});
  assert.equal(journalMap.size,old+1);
  assert.equal(result.journal.name,'Maryland Heights');
  assert.deepEqual(result.journal.ownership,{default:2});
  assert.deepEqual(result.page.ownership,{default:0,[alice.id]:3});
  assert.equal(result.page.name,'Old Warehouse');
  assert.equal(result.page.flags['stl-quick-map-notes'].playerScope,'personal');
  assert.equal(result.journal.flags['stl-quick-map-notes'].playerMapSceneId,scene.id);
  assert.equal(lastJournalData.folder, 'folder-1');
  assert.equal(folderCreates,1);
  assert.deepEqual([...game.folders.values()].map(f=>f.name),['Party Map Notes']);
  assert.equal(result.note.entryId,result.journal.id);
  assert.equal(result.note.pageId,result.page.id);
});

test('shared and private notes become separate pages in same Scene journal',async()=>{
  const old=createCalls;
  const priorJournal=lastJournalData;
  const privatePage=[...journalMap.values()].find(j=>j.flags?.['stl-quick-map-notes']?.playerMapJournal).pages[0];
  const result=await createQuickMapNote({scene,at:{x:45,y:46},form:playerForm('party'),users:[alice,bob],requester:bob});
  assert.equal(createCalls,old,'reuse the original Journal');
  assert.equal(lastJournalData,priorJournal,'do not rewrite the existing Journal');
  assert.equal(folderCreates,1,'do not create additional folders');
  assert.equal(result.journal.name,'Maryland Heights');
  assert.deepEqual(result.journal.ownership,{default:2});
  assert.deepEqual(privatePage.ownership,{default:0,[alice.id]:3});
  assert.deepEqual(result.page.ownership,{default:2,[bob.id]:3});
  assert.equal(result.page.flags['stl-quick-map-notes'].playerCreated,bob.id);
  assert.equal(result.journal.pages.length,2);
  assert.equal(result.note.pageId,result.page.id);
  assert.notEqual(result.note.pageId,privatePage.id);
  const additional=await createQuickMapNote({scene,at:{x:47,y:48},form:playerForm('party'),users:[alice,bob],requester:alice});
  assert.equal(additional.journal.id,result.journal.id);
  assert.equal(additional.journal.pages.length,3);
});

test('simultaneous player notes serialize per-Scene and never create duplicate Journals',async()=>{
  usePlayerCollection();folderCreates=0;
  const before=createCalls;
  const notes=await Promise.all([
    createQuickMapNote({scene,at:{x:10,y:15},form:playerForm(),requester:alice,users:[alice,bob]}),
    createQuickMapNote({scene,at:{x:12,y:18},form:playerForm('party'),requester:bob,users:[alice,bob]})
  ]);
  assert.equal(folderCreates,1);
  assert.deepEqual([...game.folders.values()].map(f=>f.name),['Party Map Notes']);
  assert.equal((await ensurePlayerMapNotesFolder()).id,[...game.folders.values()][0].id);
  assert.equal(createCalls,before+1);
  assert.equal(notes[0].journal.id,notes[1].journal.id);
  assert.equal(notes[0].journal.pages.length,2);
  assert.notEqual(notes[0].note.pageId,notes[1].note.pageId);
  assert.deepEqual(notes[0].page.ownership,{default:0,[alice.id]:3});
  assert.deepEqual(notes[1].page.ownership,{default:2,[bob.id]:3});
});

test('another Scene with the same display name gets its own Journal by Scene ID',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm('party'),requester:bob});
  const other={...scene,id:'a-different-scene'};
  const second=await createQuickMapNote({scene:other,at:{x:20,y:25},form:playerForm('personal'),requester:alice});
  assert.notEqual(first.journal.id,second.journal.id);
  assert.equal(first.journal.name,second.journal.name);
  assert.equal(first.journal.flags['stl-quick-map-notes'].playerMapSceneId,scene.id);
  assert.equal(second.journal.flags['stl-quick-map-notes'].playerMapSceneId,other.id);
  assert.equal(folderCreates,1);
});

test('concurrent notes on different scenes create only one Party Map Notes root',async()=>{
  usePlayerCollection();folderCreates=0;
  const other={...scene,id:'concurrent-scene',name:'Other Scene'};
  const notes=await Promise.all([
    createQuickMapNote({scene,at:{x:10,y:15},form:playerForm(),requester:alice}),
    createQuickMapNote({scene:other,at:{x:12,y:18},form:playerForm('party'),requester:bob})
  ]);
  assert.equal(folderCreates,1);
  assert.notEqual(notes[0].journal.id,notes[1].journal.id);
  assert.equal(notes[0].journal.folder,notes[1].journal.folder);
});

test('name collisions with ordinary Journals do not cause writes to GM data',async()=>{
  usePlayerCollection();folderCreates=0;
  const existing={id:'map-name-collision',name:scene.name,folder:'folder-1',pages:[{id:'gm-secret'}],
    ownership:{default:0}, flags:{world:{campaign:true}}};
  journalMap.set(existing.id,existing);
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  assert.notEqual(first.journal.id,existing.id);
  assert.deepEqual(existing.pages,[{id:'gm-secret'}]);
  journalMap.delete(existing.id);
});

test('existing Observer map Journal allows second and later pages via the GM creation path',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  const initialJournalData=lastJournalData;
  assert.equal(canReadPlayerMapJournal(journal,alice),true);
  const second=await createQuickMapNote({scene,at:{x:22,y:26},form:playerForm('personal'),requester:alice});
  const third=await createQuickMapNote({scene,at:{x:25,y:29},form:playerForm('party'),requester:bob});
  assert.equal(second.journal.id,first.journal.id);
  assert.equal(third.journal.id,first.journal.id);
  assert.equal(journal.pages.length,3);
  assert.deepEqual(journal.ownership,{default:2});
  assert.equal(lastJournalData,initialJournalData,'no change to parent Journal ownership');
  assert.deepEqual(second.page.ownership,{default:0,[alice.id]:3});
  assert.deepEqual(third.page.ownership,{default:2,[bob.id]:3});
  assert.equal(second.note.pageId,second.page.id);
});

test('explicit GM Owner entry does not falsely block player Observer on parent Journal',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  journal.ownership[gm.id]=3;
  const result=await createQuickMapNote({scene,at:{x:22,y:26},form:playerForm('party'),requester:bob});
  assert.equal(result.journal.id,journal.id);
  assert.equal(journal.pages.length,2);
  assert.deepEqual(journal.ownership,{default:2,[gm.id]:3});
});

test('explicit player Observer grants are valid even when Journal default is NONE',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  journal.ownership.default=0;
  journal.ownership[alice.id]='2';
  journal.ownership[bob.id]=2;
  const another=await createQuickMapNote({scene,at:{x:21,y:26},form:playerForm('party'),requester:bob});
  assert.equal(another.journal.id,journal.id);
  assert.deepEqual(journal.ownership,{default:0,[alice.id]:'2',[bob.id]:2});
  assert.equal(journal.pages.length,2);
});

test('Foundry native testUserPermission is authoritative for Journal Observer access',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  const called=[];
  journal.testUserPermission=(user,level)=>{called.push([user.id,level]);return user.id===alice.id;};
  const before=journal.pages.length;
  await assert.rejects(createQuickMapNote({scene,at:{x:21,y:26},form:playerForm('personal'),requester:bob}),/do not have Observer access/);
  assert.equal(journal.pages.length,before);
  await assert.rejects(createQuickMapNote({scene,at:{x:21,y:26},form:playerForm('party'),requester:alice}),/not readable by every player/);
  assert.equal(journal.pages.length,before);
  assert.ok(called.some(([id,level])=>id===bob.id&&level==='OBSERVER'));
});

test('unsafe parent OWNER grants still block page creation to protect private notes',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  const before=journal.pages.length;
  journal.ownership[alice.id]=3;
  await assert.rejects(createQuickMapNote({scene,at:{x:21,y:26},form:playerForm('party'),requester:bob}),/player Owner access/);
  assert.equal(journal.pages.length,before);
  delete journal.ownership[alice.id];
  journal.ownership.default=3;
  await assert.rejects(createQuickMapNote({scene,at:{x:22,y:26},form:playerForm('party'),requester:bob}),/player Owner access/);
  assert.equal(journal.pages.length,before);
});

test('restricted parent Observer visibility allows Personal but not inaccessible Shared pages',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  journal.ownership.default=0;
  journal.ownership[alice.id]=2;
  const second=await createQuickMapNote({scene,at:{x:23,y:26},form:playerForm('personal'),requester:alice});
  assert.equal(second.journal.id,journal.id);
  await assert.rejects(createQuickMapNote({scene,at:{x:24,y:27},form:playerForm('party'),requester:alice}),/not readable by every player/);
  assert.equal(journal.pages.length,2);
});

test('failed pin placement retains a newly added page for GM recovery',async()=>{
  usePlayerCollection();folderCreates=0;
  const first=await createQuickMapNote({scene,at:{x:20,y:25},form:playerForm(),requester:alice});
  const journal=first.journal;
  noteShouldFail=true;
  try {
    await assert.rejects(createQuickMapNote({scene,at:{x:21,y:26},form:playerForm('party'),requester:bob}),/Journal Page.*was kept/);
    assert.equal(journal.pages.length,2);
    assert.deepEqual(journal.pages[1].ownership,{default:2,[bob.id]:3});
  } finally {noteShouldFail=false;}
});

test('player request cannot link arbitrary existing GM Journal or choose GM-only visibility',async()=>{
  usePlayerCollection();
  const secret={id:'gm-secret',name:'GM Plans',testUserPermission:()=>false};
  journalMap.set(secret.id,secret);
  const form={...playerForm('personal'),existingJournal:'gm-secret',visibility:'read'};
  const before=createCalls;
  try{
    await assert.rejects(createQuickMapNote({scene,at:{x:20,y:20},form,requester:alice}),/not existing Journals/);
    assert.equal(createCalls,before);
  }finally{journalMap.delete(secret.id);}
});

test('player-uploaded icons reject spoofed MIME and oversized data',async()=>{
  const pngBytes=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const encoded=await encodePlayerImage(new File([pngBytes],'ok.png',{type:'image/png'}));
  const restored=decodePlayerImage(encoded);
  assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),pngBytes);
  await assert.rejects(encodePlayerImage(new File(['invalid'],'bad.png',{type:'image/png'})),/not a valid image/);
  await assert.rejects(encodePlayerImage(new File([new Uint8Array(512*1024+1)],'big.png',{type:'image/png'})),/512 KB/);
  assert.throws(()=>decodePlayerImage({type:'image/png',encoded:btoa('invalid')}),/failed size or image validation/);
});

test('player query is private to active GM; identity requires matching targeted challenge',async()=>{
  usePlayerCollection();game.user=alice;
  const original=gm.query;
  let outgoing=null;
  gm.query=async(name,payload,opts)=>{
    outgoing={name,payload,opts};
    const verify=verifyPlayerNoteQuery({requestId:payload.requestId,challenge:'d'.repeat(64),sceneId:scene.id});
    assert.equal(verify.challenge,'d'.repeat(64));
    assert.equal(verifyPlayerNoteQuery({requestId:payload.requestId,challenge:'d'.repeat(64),sceneId:scene.id}),null,'challenge one-time only');
    return {ok:true,noteId:'id1',journalId:'journal1',icon:ICONS[0][1],tint:'#FFFFFF'};
  };
  try {
    const input={...playerForm('party'),description:'PRIVATE JOURNAL TEXT'};
    const res=await submitPlayerNoteRequest({scene,at:{x:30,y:30},form:input});
    assert.equal(res.noteId,'id1');
    assert.equal(outgoing.name,'stl-quick-map-notes.createPlayerNote');
    assert.equal(outgoing.payload.requesterId,alice.id);
    assert.equal(outgoing.payload.request.form.description,'PRIVATE JOURNAL TEXT');
    assert.equal(outgoing.payload.request.form.playerScope,'party');
    assert.equal(outgoing.payload.request.requesterId,undefined);
    assert.equal(CONFIG.queries['stl-quick-map-notes.verifyPlayerNote'],verifyPlayerNoteQuery);
    assert.equal(verifyPlayerNoteQuery({requestId:outgoing.payload.requestId,challenge:'d'.repeat(64),sceneId:scene.id}),null);
  }finally {game.user=gm;gm.query=original;}
});

test('GM handles verified request and places shared note; fake identity cannot be claimed',async()=>{
  usePlayerCollection();game.user=alice;
  const oldGmQuery=gm.query,oldAliceQuery=alice.query,oldBobQuery=bob.query;
  let counter=0;
  gm.query=async(name,payload)=>{
    counter++;
    const prev=game.user;game.user=gm;
    const reply=await handlePlayerNoteQuery(payload);
    game.user=prev;
    return reply;
  };
  alice.query=async(name,payload)=>{
    assert.equal(name,'stl-quick-map-notes.verifyPlayerNote');
    const prev=game.user;game.user=alice;
    const reply=verifyPlayerNoteQuery(payload);
    game.user=prev;
    return reply;
  };
  bob.query=async()=>null;
  try {
    const before=createCalls;
    const result=await submitPlayerNoteRequest({scene,at:{x:11,y:12},form:playerForm('party')});
    assert.equal(result.ok,true);
    assert.equal(createCalls,before+1);
    assert.equal(lastJournalData.ownership.default,2);
    assert.equal(lastJournalData.ownership[alice.id],undefined);
    assert.deepEqual(lastJournalData.pages[0].ownership,{default:2,[alice.id]:3});
    assert.ok(result.pageId);
    assert.equal(counter,1);
    const fake=await handlePlayerNoteQuery({requesterId:bob.id,requestId:'b'.repeat(64),
      request:{sceneId:scene.id,at:{x:22,y:22},form:playerForm('party'),image:null}});
    assert.equal(fake.ok,false);
  }finally{game.user=gm;gm.query=oldGmQuery;alice.query=oldAliceQuery;bob.query=oldBobQuery;}
});

test('GM rejects a forged player request before creating any folder or Journal',async()=>{
  usePlayerCollection();folderCreates=0;game.user=gm;
  const before=createCalls;
  bob.query=async()=>null;
  const result=await handlePlayerNoteQuery({requesterId:bob.id,requestId:'e'.repeat(64),
    request:{sceneId:scene.id,at:{x:3,y:4},form:playerForm('personal'),image:null}});
  assert.equal(result.ok,false);
  assert.match(result.error,/verification failed/);
  assert.equal(createCalls,before);
  assert.equal(folderCreates,0);
  delete bob.query;
});


test('three tutorial screens explain the person toolbar, icon selection, and role-specific permissions',()=>{
  const player=tutorialSlides(false),gmSteps=tutorialSlides(true);
  assert.equal(player.length,3);
  assert.equal(gmSteps.length,3);
  assert.match(player[0].body,/person icon/);
  assert.match(player[1].body,/color and size/);
  assert.match(player[2].body,/Personal/);
  assert.match(player[2].body,/Shared with Party/);
  assert.match(player[2].body,/GM must be connected/);
  assert.match(player[2].body,/not the Journal's Add Page/);
  assert.doesNotMatch(player[2].body,/GM Only/);
  assert.match(gmSteps[2].body,/GM Only/);
  assert.match(gmSteps[2].body,/Party Map Notes/);
});

test('first world login runs tutorial; final Dont show again persists only for that User',async()=>{
  const oldUser=game.user,oldWait=foundry.applications.api.DialogV2.wait;
  const flags=new Map(), calls=[];
  const loggedIn={id:'tutorial-alice',isGM:false,
    getFlag(scope,key){return flags.get(`${scope}:${key}`);},
    async setFlag(scope,key,value){flags.set(`${scope}:${key}`,value);}
  };
  game.user=loggedIn;
  const replies=['next','next','dismiss'];
  foundry.applications.api.DialogV2.wait=async cfg=>{calls.push(cfg);return replies.shift();};
  try {
    assert.equal(typeof listeners.get('ready'),'function');
    listeners.get('ready')();
    await new Promise(setImmediate);
    assert.equal(calls.length,3);
    assert.match(calls[0].content,/Step 1 of 3/);
    assert.equal(calls[0].buttons.at(-1).action,'next');
    assert.equal(calls.at(-1).buttons.at(-1).label,"Don't show again");
    assert.equal(flags.get('stl-quick-map-notes:tutorialDismissed'),true);
    assert.equal(isTutorialDismissed(loggedIn),true);
    listeners.get('ready')();
    await new Promise(setImmediate);
    assert.equal(calls.length,3,'dismissal suppresses later logins');
  } finally {game.user=oldUser;foundry.applications.api.DialogV2.wait=oldWait;}
});

test('closing the first-login guide without dismissal does not store a preference',async()=>{
  const oldUser=game.user,oldWait=foundry.applications.api.DialogV2.wait;
  let writes=0,opens=0;
  const account={id:'tutorial-bob',isGM:false,getFlag(){return null;},async setFlag(){writes++;}};
  game.user=account;
  foundry.applications.api.DialogV2.wait=async()=>{opens++;return null;};
  try {
    assert.equal(await showQuickMapTutorial(),false);
    assert.equal(await showQuickMapTutorial(),false);
    assert.equal(opens,2);
    assert.equal(writes,0);
    assert.equal(isTutorialDismissed(account),false);
  } finally {game.user=oldUser;foundry.applications.api.DialogV2.wait=oldWait;}
});

test('back navigation and manual replay work after Dont show again',async()=>{
  const oldUser=game.user,oldWait=foundry.applications.api.DialogV2.wait;
  const flags=new Map([['stl-quick-map-notes:tutorialDismissed',true]]);
  const user={id:'tutorial-charlie',isGM:true,
    getFlag(s,k){return flags.get(`${s}:${k}`);},
    async setFlag(s,k,v){flags.set(`${s}:${k}`,v);}
  };
  game.user=user;
  const actions=['next','back','next','next','later'], visited=[];
  foundry.applications.api.DialogV2.wait=async cfg=>{visited.push(cfg.content);return actions.shift();};
  try {
    assert.equal(await showQuickMapTutorial(),false,'normally suppressed');
    assert.equal(await showQuickMapTutorial({force:true}),false,'manual replay can close without changing preference');
    assert.deepEqual(visited.map(x=>/Step (\d) of 3/.exec(x)?.[1]),['1','2','1','2','3']);
    assert.equal(isTutorialDismissed(user),true);
  }finally{game.user=oldUser;foundry.applications.api.DialogV2.wait=oldWait;}
});

test('tutorial preference fallback is per-user on same browser if User flags cannot be saved',async()=>{
  const oldUser=game.user;
  const first={id:'tutorial-local-1',isGM:false,getFlag(){return null;},async setFlag(){throw Error('denied');}};
  const second={id:'tutorial-local-2',isGM:false,getFlag(){return null;},async setFlag(){throw Error('denied');}};
  try {
    game.user=first;
    assert.equal(await dismissQuickMapTutorial(first),'client');
    assert.equal(isTutorialDismissed(first),true);
    assert.equal(isTutorialDismissed(second),false);
    const pref=game.settings.get('stl-quick-map-notes','tutorialDismissedUsers');
    assert.deepEqual(pref,{[first.id]:true});
    await dismissQuickMapTutorial(second);
    assert.deepEqual(game.settings.get('stl-quick-map-notes','tutorialDismissedUsers'),{
      [first.id]:true,[second.id]:true
    });
  }finally{game.user=oldUser;}
});

test('two simultaneous guide requests share one dialog and do not open duplicates',async()=>{
  const oldUser=game.user,oldWait=foundry.applications.api.DialogV2.wait;
  game.user={id:'tutorial-parallel',isGM:false,getFlag(){return false;}};
  let release, openings=0;
  foundry.applications.api.DialogV2.wait=()=>{openings++;return new Promise(resolve=>{release=resolve;});};
  try {
    const first=showQuickMapTutorial(), second=showQuickMapTutorial({force:true});
    assert.strictEqual(first,second);
    assert.equal(openings,1);
    release('later');
    assert.equal(await first,false);
    await new Promise(setImmediate);
    assert.equal(openings,1);
  }finally{game.user=oldUser;foundry.applications.api.DialogV2.wait=oldWait;}
});


test('v0.1.9 module manager title retains AFT prefix and existing module ID', async () => {
  const {readFile} = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../module.json', import.meta.url), 'utf8'));
  assert.equal(manifest.id, 'stl-quick-map-notes');
  assert.equal(manifest.title, 'AFT Quick Map Notes');
  assert.equal(manifest.version, '0.1.9');
  assert.equal(manifest.manifest, 'https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json');
  assert.match(manifest.download, /\/dist\/stl-quick-map-notes-v0\.1\.9\.zip$/);
  assert.deepEqual(manifest.esmodules, ['scripts/main.mjs']);
});


// v0.1.9 finder fixtures: ordinary native Scene Notes and Page-linked Notes.
function finderFixture({user={id:'alice',isGM:false},rect={x:0,y:0,width:1000,height:1000}}={}) {
  const entry={id:'entry1',name:'Maryland Heights',testUserPermission:()=>true};
  const permitted={id:'page-a',name:'Safe Page',testUserPermission:() => true};
  const privatePage={id:'page-private',name:'GM Secrets',testUserPermission:u => Boolean(u.isGM)};
  const note=(id,text,x,y,page=permitted,isVisible=true)=>({
    document:{id,text,x,y,entryId:entry.id,pageId:page.id,parent:{id:'scene-finder'}},
    entry,page,isVisible,isPreview:false
  });
  const list=[
    note('z','Warehouse & <Co>',350,300),
    note('a','Meeting Place',800,600),
    note('private','Private <Secret>',450,500,privatePage),
    note('fog','Fog-covered title',580,350,permitted,false)
  ];
  const pans=[],moves=[];
  const scene={id:'scene-finder',async updateEmbeddedDocuments(type,updates){
    moves.push({type,updates});return updates;
  }};
  const c={scene,ready:true,dimensions:{size:100,sceneRect:rect},grid:{isSquare:false,size:100},
    notes:{placeables:list,async panToNote(n,opts){pans.push({id:n.document.id,opts});}},
    tokens:{controlled:[]}};
  return {c,notes:list,entry,permitted,privatePage,pans,moves,user};
}

test('Finder lists all current-scene visible native notes but never leaks personal page titles',()=>{
  const {c,user,notes}=finderFixture();
  notes.push({document:{id:'unlinked',text:'Broken Journal',x:100,y:100},isVisible:true});
  notes.push({document:{id:'other',text:'Other Scene',x:100,y:100,parent:{id:'elsewhere'}},isVisible:true,
    entry:{testUserPermission:()=>true}});
  const entries=listVisibleSceneNotes(c,user);
  assert.deepEqual(entries.map(n=>n.id),['a','z']);
  const html=findQuickNoteHtml(entries,0);
  assert.match(html,/Meeting Place/);
  assert.match(html,/Warehouse &amp; &lt;Co&gt;/);
  assert.doesNotMatch(html,/GM Secrets|Private|Fog-covered|Broken Journal|Other Scene/);
  assert.match(html,/data-note-action="pan"/);
  assert.match(html,/data-note-action="move"/);
  assert.match(html,/disabled/);
  assert.equal((html.match(/data-find-row/g)??[]).length,2);
  assert.match(findQuickNoteHtml(entries,2),/Selected tokens: <strong>2/);
});

test('Finder uses explicit entry and page LIMITED permissions; GM can see hidden notes',()=>{
  const f=finderFixture();
  assert.deepEqual(listVisibleSceneNotes(f.c,{isGM:true}).map(n=>n.id),['fog','a','private','z']
    .sort((a,b)=>{
      const arr={fog:'Fog-covered title',a:'Meeting Place',private:'Private <Secret>',z:'Warehouse & <Co>'};
      return arr[a].localeCompare(arr[b],undefined,{numeric:true,sensitivity:'base'});
    }));
  f.entry.testUserPermission=()=>false;
  assert.equal(listVisibleSceneNotes(f.c,f.user).length,0);
  f.entry.testUserPermission=()=>true;
  f.permitted.testUserPermission=()=>false;
  assert.equal(listVisibleSceneNotes(f.c,f.user).length,0);
  delete f.notes[0].page;
  assert.equal(listVisibleSceneNotes(f.c,f.user).length,0,'unresolved page fails closed');
  assert.equal(listVisibleSceneNotes({...f.c,ready:false},f.user).length,0);
});

test('Native NotesLayer panToNote centers the chosen pin without editing Scene data',async()=>{
  const f=finderFixture();
  const note=await panToQuickNote('z',{sceneCanvas:f.c,user:f.user});
  assert.equal(note.document.id,'z');
  assert.deepEqual(f.pans,[{id:'z',opts:{duration:450}}]);
  assert.equal(f.moves.length,0);
  await assert.rejects(panToQuickNote('private',{sceneCanvas:f.c,user:f.user}),/no longer visible/);
  await assert.rejects(panToQuickNote('z',{sceneCanvas:f.c,user:f.user,sceneId:'old'}),/Scene changed/);
  f.notes.splice(0,1);
  await assert.rejects(panToQuickNote('z',{sceneCanvas:f.c,user:f.user}),/no longer visible/);
});

test('Plan one token to a note center; multi-token moves retain rigid formation',()=>{
  const f=finderFixture({user:{isGM:true}});
  const t=(id,x,y)=>({document:{id,x,y,width:1,height:1,parent:{id:f.c.scene.id}},w:100,h:100});
  const note=f.notes[0];
  assert.deepEqual(planSelectedTokensToNote(note,{sceneCanvas:f.c,user:f.user,tokens:[t('solo',0,0)]}),
    [{_id:'solo',x:300,y:250}]);
  const multi=[t('A',0,0),t('B',100,0),t('C',0,100)];
  const plan=planSelectedTokensToNote(note,{sceneCanvas:f.c,user:f.user,tokens:multi});
  assert.deepEqual(plan,[{_id:'A',x:250,y:200},{_id:'B',x:350,y:200},{_id:'C',x:250,y:300}]);
  assert.equal(plan[1].x-plan[0].x,100);
  assert.equal(plan[2].y-plan[0].y,100);
});

test('Plan clips the whole formation inside Scene bounds rather than scattering tokens',()=>{
  const f=finderFixture({user:{isGM:true},rect:{x:0,y:0,width:400,height:400}});
  const note={document:{x:390,y:390}};
  const tokens=[{document:{id:'A',x:0,y:0,width:1,height:1},w:100,h:100},
    {document:{id:'B',x:100,y:0,width:1,height:1},w:100,h:100}];
  const plan=planSelectedTokensToNote(note,{sceneCanvas:f.c,user:f.user,tokens});
  assert.deepEqual(plan,[{_id:'A',x:200,y:300},{_id:'B',x:300,y:300}]);
  assert.throws(()=>planSelectedTokensToNote(note,{sceneCanvas:f.c,user:f.user,
    tokens:[{document:{id:'large',x:0,y:0,width:5,height:5},w:500,h:500}]}),/does not fit/);
});

test('Square grid snaps a common translation; tokens keep their original relative placement',()=>{
  const f=finderFixture({user:{isGM:true}});
  f.c.grid={isSquare:true,size:100};
  const note={document:{x:375,y:160}};
  const tokens=[{document:{id:'A',x:0,y:0},w:100,h:100},
    {document:{id:'B',x:100,y:0},w:100,h:100}];
  assert.deepEqual(planSelectedTokensToNote(note,{sceneCanvas:f.c,user:f.user,tokens}),
    [{_id:'A',x:300,y:100},{_id:'B',x:400,y:100}]);
});

test('Invalid, locked, unauthorized and off-scene token groups refuse without any updates',()=>{
  const f=finderFixture(),n=f.notes[0];
  const own=(extra={})=>({document:{id:'owned',x:0,y:0,width:1,height:1,
    canUserModify:()=>true,...extra},w:100,h:100});
  assert.throws(()=>planSelectedTokensToNote(n,{sceneCanvas:f.c,user:f.user,tokens:[]}),/Select one or more tokens/);
  assert.throws(()=>planSelectedTokensToNote(n,{sceneCanvas:f.c,user:f.user,tokens:[own({locked:true})]}),/locked/);
  assert.throws(()=>planSelectedTokensToNote(n,{sceneCanvas:f.c,user:f.user,tokens:[own({canUserModify:()=>false})]}),/cannot move token/);
  assert.throws(()=>planSelectedTokensToNote(n,{sceneCanvas:f.c,user:f.user,tokens:[own({parent:{id:'different'}})]}),/belong to this Scene/);
  assert.throws(()=>planSelectedTokensToNote(n,{sceneCanvas:f.c,user:f.user,tokens:[own(),own({id:'other',canUserModify:()=>false})]}),/cannot move token/);
  assert.equal(f.moves.length,0);
});

test('Token move requires separate action; updates only selected owned tokens then pans',async()=>{
  const f=finderFixture();
  f.c.tokens.controlled=[{document:{id:'myToken',name:'Mine',parent:{id:f.c.scene.id},
    x:50,y:100,width:1,height:1,canUserModify:()=>true},w:100,h:100}];
  const n=await moveSelectedTokensToQuickNote('a',{sceneCanvas:f.c,user:f.user});
  assert.equal(n,1);
  assert.deepEqual(f.moves,[{type:'Token',updates:[{_id:'myToken',x:750,y:550}]}]);
  assert.deepEqual(f.pans,[{id:'a',opts:{duration:450}}]);
  f.moves.length=0;f.pans.length=0;
  await assert.rejects(moveSelectedTokensToQuickNote('private',{sceneCanvas:f.c,user:f.user}),/no longer visible/);
  assert.deepEqual(f.moves,[]);
  assert.deepEqual(f.pans,[]);
});

test('Finder rejects changed Scene, missing note, partial DB updates and edit denial',async()=>{
  const f=finderFixture();
  f.c.tokens.controlled=[{document:{id:'token',x:20,y:20,width:1,height:1,canUserModify:()=>true},w:100,h:100}];
  await assert.rejects(moveSelectedTokensToQuickNote('z',{sceneCanvas:f.c,user:f.user,sceneId:'other'}),/Scene changed/);
  f.c.scene.updateEmbeddedDocuments=async()=>[];
  await assert.rejects(moveSelectedTokensToQuickNote('z',{sceneCanvas:f.c,user:f.user}),/incomplete/);
  assert.equal(f.pans.length,0);
  f.c.tokens.controlled[0].document.canUserModify=()=>false;
  await assert.rejects(moveSelectedTokensToQuickNote('z',{sceneCanvas:f.c,user:f.user}),/cannot move token/);
});

test('Finder dialog builds searchable note list and wires separate pan and move interactions',async()=>{
  const f=finderFixture();
  const oldCanvas=globalThis.canvas,oldWait=foundry.applications.api.DialogV2.wait;
  const oldDocument=globalThis.document,oldUser=game.user;
  const token={document:{id:'token',x:0,y:0,width:1,height:1,canUserModify:()=>true},w:100,h:100};
  f.c.tokens.controlled=[token];
  let captured;
  globalThis.canvas=f.c;game.user=f.user;
  globalThis.document={createElement(){return {innerHTML:''};}};
  foundry.applications.api.DialogV2.wait=async config=>{captured=config;return 'close';};
  try {
    assert.equal(await showFindQuickNotes(),'close');
    assert.equal(captured.window.title,'Find Quick Note');
    assert.match(captured.content.innerHTML,/data-note-action="pan"/);
    assert.match(captured.content.innerHTML,/data-note-action="move"/);
    assert.doesNotMatch(captured.content.innerHTML,/Private &lt;Secret&gt;|Fog-covered title/);
    const callbackStore=new Map();
    const fakeButton=(action,id)=>({dataset:{noteAction:action,noteId:id},disabled:false,
      addEventListener(name,fn){callbackStore.set(`${action}:${id}`,fn);}});
    const panButton=fakeButton('pan','z'),moveButton=fakeButton('move','a');
    const search={value:'',addEventListener(_,fn){this.search=fn;}};
    const row1={dataset:{search:'warehouse'},hidden:false};
    const row2={dataset:{search:'meeting'},hidden:false};
    const empty={hidden:true};
    const root={querySelector(q){return q.includes('search input')?search:empty;},
      querySelectorAll(q){return q==='[data-find-row]'?[row1,row2]:[panButton,moveButton];}};
    captured.render(null,{element:root});
    search.value='warehouse';search.search();
    assert.equal(row1.hidden,false);assert.equal(row2.hidden,true);assert.equal(empty.hidden,true);
    search.value='missing';search.search();
    assert.equal(empty.hidden,false);
    await callbackStore.get('pan:z')();
    assert.equal(f.pans[0].id,'z');
    assert.equal(f.moves.length,0);
    await callbackStore.get('move:a')();
    assert.equal(f.moves.length,1);
    assert.equal(f.pans.at(-1).id,'a');
  }finally{globalThis.canvas=oldCanvas;globalThis.document=oldDocument;
    game.user=oldUser;foundry.applications.api.DialogV2.wait=oldWait;}
});
