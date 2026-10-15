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
    const j={id, name:data.name,pages:[{id:`newpage${createCalls}`}],ownership:data.ownership};
    journalMap.set(id,j);
    return j;
  }
};
globalThis.ui={notifications:{info(){},error(){},warn(){}}};
globalThis.canvas={scene,ready:true,dimensions:{sceneRect:{x:0,y:0,width:500,height:500}}};

const {ICONS,escapeHtml,journalHtml,hexColor,buildOwnership,makeNoteData,createQuickMapNote,uploadNewIcon} = await import('../scripts/main.mjs');

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
