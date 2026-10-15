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
let issuedNote = null;
let noteShouldFail = false;
let uploadCalls = [];
const scene = {
  id: 'scene-123',
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
    const j={id, name:data.name,pages:[{id:`newpage${createCalls}`}],ownership:data.ownership,flags:data.flags};
    journalMap.set(id,j);
    return j;
  }
};
globalThis.ui={notifications:{info(){},error(){},warn(){}}};
globalThis.canvas={scene,ready:true,dimensions:{sceneRect:{x:0,y:0,width:500,height:500}}};

const {ICONS,escapeHtml,journalHtml,hexColor,buildOwnership,makeNoteData,createQuickMapNote,uploadNewIcon, isModuleSuppliedJournal, isRulesReferenceName, isRulesReferenceJournal, buildJournalOptions} = await import('../scripts/main.mjs');

const baseForm = ()=>({
  title:'Old Warehouse',description:'Possible <danger> & clues',
  existingJournal:'',visibility:'gm',iconPreset:ICONS[0][1],
  iconSize:'40',tint:'#edab12',applyTint:true,globallyVisible:false
});

test('Foundry 14 hook registers one GM-only button on primary Token Controls, not Journal Notes',()=>{
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
  assert.equal(controls.tokens.tools.stlQuickMapNote.title,'Quick Map Note');
  assert.equal(controls.notes.tools.stlQuickMapNote,undefined);
  game.user.isGM=false;
  const controls2={tokens:{tools:{select:{order:1}}},notes:{tools:{select:{order:1}}}};
  listeners.get('getSceneControlButtons')(controls2);
  assert.equal(controls2.tokens.tools.stlQuickMapNote,undefined);
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
