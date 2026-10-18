/**
 * AFT Map Notes+ v0.1.12 — Foundry VTT 14, system-agnostic.
 *
 * Deliberately uses native Scene Note and JournalEntry documents. It does not
 * override core notes, Journal permissions, or Scene Library imports.
 */

const MODULE_ID = "stl-quick-map-notes";
const VERSION = "0.1.12";
const ICON_DIR = `modules/${MODULE_ID}/icons`;

export const ICONS = Object.freeze([
  ["Map Pin", `${ICON_DIR}/pin.svg`],
  ["Building", `${ICON_DIR}/building.svg`],
  ["Home", `${ICON_DIR}/house.svg`],
  ["Warehouse", `${ICON_DIR}/warehouse.svg`],
  ["Vehicle", `${ICON_DIR}/car.svg`],
  ["Person / Contact", `${ICON_DIR}/person.svg`],
  ["Clue / Eye", `${ICON_DIR}/eye.svg`],
  ["Danger", `${ICON_DIR}/alert.svg`],
  ["Key / Access", `${ICON_DIR}/key.svg`],
  ["Hidden / Secret", `${ICON_DIR}/lock.svg`],
  ["Medical", `${ICON_DIR}/medical.svg`],
  ["Meeting / Star", `${ICON_DIR}/star.svg`],
  ["Core Foundry Book", "icons/svg/book.svg"]
]);

const OWNERSHIP = Object.freeze({ NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 });
const ALLOWED_UPLOADS = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
});
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Player images travel privately to the active GM via User.query; keep the payload small.
const MAX_PLAYER_FILE_SIZE = 512 * 1024;
const PLAYER_QUERY = `${MODULE_ID}.createPlayerNote`;
const VERIFY_QUERY = `${MODULE_ID}.verifyPlayerNote`;
const TUTORIAL_FLAG = "tutorialDismissed";
const TUTORIAL_LOCAL_SETTING = "tutorialDismissedUsers";
const PLAYER_ROOT_FOLDER = "Party Map Notes";
const PLAYER_SCOPES = Object.freeze({personal:"Personal", party:"Shared with Party"});
const pendingPlayerRequests = new Map();
const lastPlayerRequest = new Map();
// Serialize each Scene's player-note operations so parallel requests reuse one map Journal.
const playerNoteQueues = new Map();
let playerFolderQueue = Promise.resolve();

let armedPlacement = null;
let activeTutorial = null;
const MAP_MENU_TOOL = "stlMapNotesMenu";
const MAP_MENU_ITEMS = Object.freeze([
  {action:"place", label:"Place Map Note", icon:"fa-solid fa-location-dot"},
  {action:"find", label:"Find Map Note", icon:"fa-solid fa-magnifying-glass"},
  {action:"manage", label:"Manage Map Note", icon:"fa-solid fa-list-check"}
]);
let activeMapNotesMenu = null;
let mapNotesMenuCloseTimer = null;
let suppressMapNotesFocus = false;


/** Escape the content of a Journal page, not rich-text or Markdown. */
export function escapeHtml(raw) {
  return String(raw ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function journalHtml(raw) {
  const text = String(raw ?? "").trim();
  return text ? `<p>${escapeHtml(text).replace(/\r?\n/g, "<br>")}</p>` : "<p></p>";
}

export function hexColor(value) {
  const color = String(value ?? "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color.toUpperCase() : "#FFFFFF";
}

/**
 * Only these well-defined ownership modes can be created. Per-player entries
 * are limited to real non-GM users supplied by the live game.user collection.
 */
export function buildOwnership(mode, playerChoices = {}, users = []) {
  if (mode === "pin") return { default: OWNERSHIP.LIMITED };
  if (mode === "read") return { default: OWNERSHIP.OBSERVER };
  const ownership = { default: OWNERSHIP.NONE };
  if (mode === "specific") {
    for (const user of users) {
      if (!user || user.isGM || !user.id) continue;
      const level = Number(playerChoices[user.id] ?? 0);
      if ([OWNERSHIP.LIMITED, OWNERSHIP.OBSERVER].includes(level)) ownership[user.id] = level;
    }
  }
  return ownership;
}

/** Journal Page ownership: private to author, or readable by party; author owns the page. */
export function buildPlayerOwnership(mode, userId) {
  if (!userId) throw new Error("Player identity is required for Journal ownership.");
  if (!Object.hasOwn(PLAYER_SCOPES, mode)) throw new Error("Invalid player map note section.");
  return {default: mode === "party" ? OWNERSHIP.OBSERVER : OWNERSHIP.NONE,
    [userId]: OWNERSHIP.OWNER};
}

function folderParentId(folder) {
  return typeof folder?.folder === "string" ? folder.folder : folder?.folder?.id ?? null;
}

function findMapNotesFolder(name, parentId) {
  return Array.from(game.folders?.values?.() ?? game.folders ?? []).find(folder => folder.type === "JournalEntry" &&
    folder.name === name && folderParentId(folder) === parentId) ?? null;
}

async function getOrCreateMapNotesFolder(name, parentId) {
  const found = findMapNotesFolder(name, parentId);
  if (found) return found;
  const created = await Folder.create({name, type:"JournalEntry", folder:parentId,
    flags:{[MODULE_ID]:{managedFolder:true,createdWith:VERSION}}});
  if (!created?.id) throw new Error(`Could not create the ${name} Journal folder.`);
  return created;
}

/** Keep new player map Journals directly in Party Map Notes (no new subfolders). */
export async function ensurePlayerMapNotesFolder() {
  if (!game.user?.isGM) throw new Error("Only the GM can prepare the Party Map Notes folder.");
  const next = playerFolderQueue.catch(() => {})
    .then(() => getOrCreateMapNotesFolder(PLAYER_ROOT_FOLDER, null));
  playerFolderQueue = next.catch(() => {});
  return next;
}

/** Check a user's effective access to a map Journal, not its exact ownership JSON.
 * Foundry may store Observer as a per-user override rather than as the default.
 */
export function canReadPlayerMapJournal(journal, user) {
  if (!user?.id || !journal) return false;
  if (user.isGM) return true;
  if (typeof journal.testUserPermission === "function") {
    return journal.testUserPermission(user, "OBSERVER");
  }
  // Mock/backward-compatibility fallback. The live v14 document method above
  // remains authoritative for role and ownership resolution.
  const ownership = journal.ownership ?? journal._source?.ownership ?? {};
  return Number(ownership[user.id] ?? ownership.default ?? OWNERSHIP.NONE) >= OWNERSHIP.OBSERVER;
}

/** Find only entries expressly created for this exact Scene by this module.
 * Non-GM parent OWNER rights could expose other authors' private Pages, so
 * never grant them or accept them as a shortcut for native Page creation.
 * Player requests are already processed by the active GM via User.query.
 */
export function findPlayerMapJournal(sceneId, folderId, journals = game.journal,
  {requester = null, scope = null, users = game.users} = {}) {
  for (const journal of journals ?? []) {
    const flags = journal?.flags?.[MODULE_ID];
    if (flags?.playerMapSceneId !== sceneId || flags?.playerMapJournal !== true) continue;
    if (journal.folder?.id !== folderId && journal.folder !== folderId) {
      throw new Error("The map Journal was moved. Ask the GM to restore it under Party Map Notes.");
    }
    const ownership = journal.ownership ?? journal._source?.ownership ?? {};
    const playerAccounts = Array.from(users?.values?.() ?? users ?? []).filter(u => u && !u.isGM);
    const gmIds = new Set(Array.from(users?.values?.() ?? users ?? [])
      .filter(u => u?.isGM).map(u => u.id));
    // The GM may have an explicit OWNER override; that does not expose any
    // private Pages. A non-GM OWNER on the parent does, so keep that safeguard.
    if (Number(ownership.default ?? OWNERSHIP.NONE) > OWNERSHIP.OBSERVER ||
        Object.entries(ownership).some(([id, level]) => id !== "default" &&
          Number(level) > OWNERSHIP.OBSERVER && !gmIds.has(id))) {
      throw new Error("The map Journal gives a player Owner access. Ask the GM to use Observer access on the Journal and Owner access only on the author's Page.");
    }
    if (requester && !canReadPlayerMapJournal(journal, requester)) {
      throw new Error("You do not have Observer access to this map Journal. Ask the GM to grant access before adding notes.");
    }
    if (scope === "party" && playerAccounts.some(user => !canReadPlayerMapJournal(journal, user))) {
      throw new Error("The map Journal is not readable by every player. Ask the GM to grant Observer access before adding a Shared with Party note.");
    }
    return journal;
  }
  return null;
}

function queuePlayerSceneNote(sceneId, task) {
  const prior = playerNoteQueues.get(sceneId) ?? Promise.resolve();
  const running = prior.catch(() => {}).then(task);
  playerNoteQueues.set(sceneId, running);
  void running.finally(() => {
    if (playerNoteQueues.get(sceneId) === running) playerNoteQueues.delete(sceneId);
  }).catch(() => {});
  return running;
}

/**
 * Place each player map note as a PAGE under one Journal named after the Scene.
 * Explicit per-Page permissions override the shared parent entry's Observer access.
 * We never select unmarked Journals, even if their names match the Scene name.
 */
export async function createPlayerMapNote({scene, at, title, description, form, requester,
  icon, tint}) {
  if (!game.user?.isGM || !requester?.id || requester.isGM) {
    throw new Error("Only the GM may process a player's map note request.");
  }
  if (!Object.hasOwn(PLAYER_SCOPES, form.playerScope)) {
    throw new Error("Choose Personal or Shared with Party for your map note.");
  }
  return queuePlayerSceneNote(scene.id, async () => {
    const folder = await ensurePlayerMapNotesFolder();
    const pageData = {
      name: title,
      type: "text",
      ownership: buildPlayerOwnership(form.playerScope, requester.id),
      text: {format:CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content:journalHtml(description)},
      flags: {[MODULE_ID]: {createdWith:VERSION, playerCreated:requester.id,
        playerScope:form.playerScope, playerMapSceneId:scene.id}}
    };
    let journal = findPlayerMapJournal(scene.id, folder.id, game.journal,
      {requester, scope:form.playerScope, users:game.users});
    let page;
    let createdJournal = false;
    if (!journal) {
      journal = await JournalEntry.create({
        name: String(scene.name ?? "").trim() || "Untitled Map",
        folder:folder.id,
        ownership: {default: OWNERSHIP.OBSERVER},
        pages: [pageData],
        flags: {[MODULE_ID]: {createdWith:VERSION, playerMapJournal:true,
          playerMapSceneId:scene.id}}
      });
      createdJournal = true;
      page = Array.from(journal?.pages ?? [])[0] ?? null;
    } else {
      const pages = await journal.createEmbeddedDocuments("JournalEntryPage", [pageData]);
      page = pages?.[0] ?? null;
    }
    if (!journal?.id || !page?.id) {
      throw new Error("Unable to create the map Journal Page; any created Journal was preserved.");
    }
    const data = makeNoteData({x:at.x, y:at.y, title, journalId:journal.id,
      pageId:page.id, icon, tint, size:form.iconSize, globallyVisible:form.globallyVisible});
    try {
      const created = await scene.createEmbeddedDocuments("Note", [data]);
      if (!created?.length) throw new Error("Foundry returned no map note.");
      return {journal, page, note:created[0], icon, tint, linkedExisting:!createdJournal};
    } catch (error) {
      // Never silently destroy a page with a player's notes on it.
      throw new Error(`Map pin failed; the Journal Page "${title}" was kept. ${error.message}`);
    }
  });
}

export function makeNoteData({x, y, title, journalId, pageId, icon, tint, size, globallyVisible}) {
  if (!journalId || !icon || !title || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error("Invalid note data; title, Journal, icon, and map coordinates are required.");
  }
  const iconSize = Number(size);
  return {
    entryId: journalId,
    ...(pageId ? {pageId} : {}),
    x: Math.round(x),
    y: Math.round(y),
    text: String(title),
    iconSize: Number.isFinite(iconSize) ? Math.min(96, Math.max(20, iconSize)) : 40,
    global: Boolean(globallyVisible),
    texture: { src: String(icon), tint: hexColor(tint) },
    flags: { [MODULE_ID]: { createdWith: VERSION } }
  };
}

/**
 * Only exclude journals with identifiable module provenance. A module adding
 * unrelated flags to a user-authored journal must NOT hide that journal.
 * Compendiums are already absent from game.journal, but their imported copies
 * can be detected via the Foundry v14 _stats.compendiumSource UUID.
 */
export function isModuleSuppliedJournal(journal, {packs = game.packs, modules = game.modules} = {}) {
  if (!journal || journal.inCompendium || journal.compendium || journal.pack) return true;

  for (const [scope, marker] of Object.entries(journal.flags ?? {})) {
    if (!marker || typeof marker !== "object") continue;
    if (scope !== MODULE_ID && !modules?.has?.(scope) && !modules?.get?.(scope)) continue;
    if (marker.createdWith || marker.moduleCreated === true ||
        marker.createdBy === scope || marker.generatedBy === scope) return true;
  }

  const origin = journal._stats?.compendiumSource ?? journal._source?._stats?.compendiumSource ??
    journal.flags?.core?.sourceId;
  if (typeof origin !== "string") return false;
  const match = /^Compendium\.([^.]+)\.([^.]+)(?:\.|$)/.exec(origin);
  if (!match) return false;
  const pack = packs?.get?.(`${match[1]}.${match[2]}`);
  const packageType = pack?.metadata?.packageType ?? pack?.metadata?.package?.type;
  if (packageType === "module") return true;
  if (packageType === "world" || packageType === "system") return false;
  return Boolean(modules?.has?.(match[1]) || modules?.get?.(match[1]));
}

function resolveJournalFolder(value, folders) {
  if (!value) return null;
  if (typeof value === "object") return value;
  return folders?.get?.(value) ?? (Array.isArray(folders) ? folders.find(f => f.id === value) : null);
}

/** Return a root-to-leaf Folder chain, using v14's Folder.ancestors where available. */
function journalFolderChain(folder, folders) {
  const leaf = resolveJournalFolder(folder, folders);
  if (!leaf) return [];
  if (Array.isArray(leaf.ancestors) && leaf.ancestors.length) {
    return [...leaf.ancestors].reverse().concat(leaf);
  }
  const chain = [], seen = new Set();
  let current = leaf;
  while (current && chain.length < 32) {
    const id = current.id ?? current._id ?? current;
    if (seen.has(id)) break;
    seen.add(id);
    chain.unshift(current);
    current = resolveJournalFolder(current.folder ?? current._source?.folder, folders);
  }
  return chain;
}

/**
 * Rules Reference pages can be copied into world Journals without preserving
 * their module provenance. Exclude a recognized Rules Reference folder tree,
 * matching standalone index entries, or an explicit rules-reference compendium
 * source. Other campaign and system journals remain eligible.
 */
export function isRulesReferenceName(value) {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return /(?:^|\s)rules reference(?:\s|$)/.test(normalized);
}

export function isRulesReferenceJournal(journal, folderChain = []) {
  if (isRulesReferenceName(journal?.name ?? journal?._source?.name)) return true;
  if (folderChain.some(folder => isRulesReferenceName(folder?.name))) return true;
  const origin = journal?._stats?.compendiumSource ?? journal?._source?._stats?.compendiumSource ??
    journal?.flags?.core?.sourceId;
  return typeof origin === "string" && /^Compendium\./i.test(origin) &&
    /rules?[\s._-]*reference/i.test(origin);
}

/**
 * Render one native <select> with visibly indented folder headings and entries.
 * Native HTML selects cannot nest optgroups, so disabled heading options
 * provide the directory structure without adding an alternate UI component.
 */
export function buildJournalOptions(journals, {folders = game.folders, packs = game.packs,
  modules = game.modules, user = null} = {}) {
  const root = {name: "", folders: new Map(), entries: []};
  let eligible = 0;
  for (const journal of journals ?? []) {
    if (!journal?.id || isModuleSuppliedJournal(journal, {packs, modules})) continue;
    if (user && !user.isGM && !journal.testUserPermission?.(user, "LIMITED")) continue;
    const folderChain = journalFolderChain(journal.folder, folders);
    if (isRulesReferenceJournal(journal, folderChain)) continue;
    eligible++;
    let branch = root;
    for (const folder of folderChain) {
      const id = folder.id ?? folder._id ?? folder.name;
      if (!id) continue;
      if (!branch.folders.has(id)) {
        branch.folders.set(id, {name: String(folder.name ?? "Unnamed Folder"), folders: new Map(), entries: []});
      }
      branch = branch.folders.get(id);
    }
    branch.entries.push(journal);
  }
  if (!eligible) return '<option value="" disabled>No eligible world Journals found</option>';

  const compareNames = (a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined,
    {numeric: true, sensitivity: "base"});
  const indent = depth => "&nbsp;".repeat(Math.min(depth, 32) * 4);
  const entryOption = (entry, depth) =>
    `<option value="${escapeHtml(entry.id)}">${indent(depth)}${escapeHtml(entry.name)}</option>`;
  const walk = (branch, depth) => {
    let html = "";
    for (const folder of [...branch.folders.values()].sort(compareNames)) {
      html += `<option value="" disabled>${indent(depth)}${escapeHtml(folder.name)}</option>`;
      html += walk(folder, depth + 1);
    }
    for (const entry of branch.entries.sort(compareNames)) html += entryOption(entry, depth);
    return html;
  };

  let html = walk({folders: root.folders, entries: []}, 0);
  if (root.entries.length) {
    if (root.folders.size) html += '<option value="" disabled>Unfiled</option>';
    for (const entry of root.entries.sort(compareNames)) {
      html += entryOption(entry, root.folders.size ? 1 : 0);
    }
  }
  return html;
}

function iconValid(path) {
  return Boolean(path?.trim()) && !/^(?:javascript:|data:)/i.test(path.trim());
}

function playerUsers() {
  return Array.from(game.users ?? []).filter(user => !user.isGM);
}

/** Keep the guide short; no world data or Journal content is read or modified. */
export function tutorialSlides(isGM = Boolean(game.user?.isGM)) {
  const steps = [
    {
      title: "Place a map note",
      body: `<p>Open a Scene, select the <strong>person icon (Token Controls)</strong> on the left,
        and hover over (or click) <strong>Map Notes+</strong>, then choose <strong>Place Map Note</strong>.
        Click the map where the note belongs.</p>
        <p>Press <strong>Escape</strong> to cancel before placing a note.</p>`
    },
    {
      title: "Write it and choose an icon",
      body: `<p>Give the note a <strong>title</strong> and a short <strong>description</strong>.
        Pick a built-in icon or browse/upload your own, then set its <strong>color and size</strong>.</p>
        <p><strong>Show through fog</strong> changes map visibility, not who can read a private note.</p>`
    }
  ];
  if (isGM) steps.push({
    title: "Choose who can read it",
    body: `<p>For GM notes, choose <strong>GM Only</strong>, pin visibility, readable, or individual player permissions.
      You can also link an existing permitted campaign Journal.</p>
      <p>Player notes are grouped under <strong>Party Map Notes</strong>, one Journal per Scene and one Page per note.
      The GM can always edit or remove them. Use <strong>Find Map Note</strong> to pan to pins,
      or <strong>Manage Map Note</strong> to move selected tokens and delete a pin without deleting its Page.</p>`
  });
  else steps.push({
    title: "Personal or shared notes",
    body: `<p>Choose <strong>Personal</strong> for a page intended only for you and the GM, or
      <strong>Shared with Party</strong> for one everyone can read.</p>
      <p>Each map has a Journal in <strong>Party Map Notes</strong>. Your note is a Page inside that Journal.
      To add another Page, use <strong>Map Notes+ &gt; Place Map Note</strong>, not the Journal's Add Page button.
      <strong>Find Map Note</strong> pans to visible pins; <strong>Manage Map Note</strong> also lets you relocate selected tokens.</p>
      <p>A <strong>GM must be connected</strong> for players to create notes.</p>`
  });
  return steps;
}

/** A world User flag follows that account across devices. Local client fallback is
 * per-user so different player accounts sharing a browser stay independent.
 */
export function isTutorialDismissed(user = game.user) {
  if (!user?.id) return false;
  try { if (user.getFlag?.(MODULE_ID, TUTORIAL_FLAG) === true) return true; }
  catch (error) { console.warn(`[${MODULE_ID}] Could not read tutorial preference`, error); }
  try {
    const local = game.settings.get(MODULE_ID, TUTORIAL_LOCAL_SETTING);
    return Boolean(local && typeof local === "object" && local[user.id] === true);
  } catch { return false; }
}

/** Only clicking the final Don't show again action persists dismissal. */
export async function dismissQuickMapTutorial(user = game.user) {
  if (!user?.id) throw new Error("No logged-in user for tutorial preference.");
  try {
    if (typeof user.setFlag !== "function") throw new Error("User flags unavailable");
    await user.setFlag(MODULE_ID, TUTORIAL_FLAG, true);
    return "user";
  } catch (error) {
    console.warn(`[${MODULE_ID}] User flag unavailable; remembering tutorial on this browser`, error);
    const current = game.settings.get(MODULE_ID, TUTORIAL_LOCAL_SETTING);
    const map = current && typeof current === "object" && !Array.isArray(current) ? current : {};
    await game.settings.set(MODULE_ID, TUTORIAL_LOCAL_SETTING, {...map, [user.id]: true});
    return "client";
  }
}

/** Non-modal, three-screen onboarding shown at the next world login for each
 * user who has not dismissed it. Reopening the guide never clears dismissal.
 */
export function showQuickMapTutorial({force = false} = {}) {
  if (activeTutorial) return activeTutorial;
  const user = game.user;
  if (!user?.id || (!force && isTutorialDismissed(user))) return Promise.resolve(false);
  const DialogV2 = foundry.applications.api.DialogV2;
  if (typeof DialogV2?.wait !== "function") return Promise.resolve(false);
  const steps = tutorialSlides(Boolean(user.isGM));
  const process = async () => {
    let index = 0;
    while (index >= 0 && index < steps.length) {
      const step = steps[index];
      const finalStep = index === steps.length - 1;
      const buttons = [
        ...(index > 0 ? [{action:"back", label:"Back", icon:"fa-solid fa-chevron-left"}] : []),
        {action:"later", label:finalStep ? "Close" : "Not now"},
        ...(finalStep
          ? [{action:"dismiss", label:"Don't show again", icon:"fa-solid fa-check", default:true}]
          : [{action:"next", label:"Next", icon:"fa-solid fa-chevron-right", default:true}])
      ];
      const action = await DialogV2.wait({
        window:{title:"AFT Map Notes+ - Quick Tutorial", icon:"fa-solid fa-map-pin"},
        classes:["stl-qmn-tutorial"],
        position:{width:460},
        modal:false,
        rejectClose:false,
        content:`<section class="stl-qmn-tour">
          <div class="stl-qmn-tour-progress">Step ${index + 1} of ${steps.length}</div>
          <h3>${step.title}</h3>${step.body}
          ${finalStep ? '<p class="stl-qmn-tour-footnote">You can reopen this guide from the Quick Map Note dialog.</p>' : ''}
          </section>`,
        buttons
      });
      if (action === "back") { index--; continue; }
      if (action === "next") { index++; continue; }
      if (action === "dismiss") {
        try { await dismissQuickMapTutorial(user); }
        catch (error) {
          console.warn(`[${MODULE_ID}] Tutorial preference could not be saved`, error);
          ui.notifications.warn("AFT Map Notes+: Tutorial preference could not be saved. The guide may appear next login.");
          return false;
        }
        return true;
      }
      return false; // Closing, Escape, or Not now does not save the preference.
    }
    return false;
  };
  const result = process();
  activeTutorial = result;
  void result.finally(() => { if (activeTutorial === result) activeTutorial = null; }).catch(() => {});
  return result;
}

function buildDialogContent() {
  const storedIcon = game.settings.get(MODULE_ID, "lastIcon");
  const storedTint = hexColor(game.settings.get(MODULE_ID, "lastTint"));
  const preset = ICONS.find(([_, path]) => path === storedIcon)?.[1] ?? "custom";
  const optionHtml = ICONS.map(([label, path]) =>
    `<option value="${escapeHtml(path)}" ${preset === path ? "selected" : ""}>${escapeHtml(label)}</option>`
  ).join("");
  const playerMode = !game.user?.isGM;
  const journalOptions = playerMode ? "" : buildJournalOptions(game.journal, {user: game.user});
  const players = playerUsers();
  const playerRows = playerMode ? "" : players.map(u => `
    <div class="stl-qmn-player-row">
      <span>${escapeHtml(u.name)}</span>
      <select name="perm_${escapeHtml(u.id)}">
        <option value="0">Hidden</option>
        <option value="1">See pin</option>
        <option value="2">Read</option>
      </select>
    </div>`).join("");

  return `<div class="stl-qmn-form">
    <div class="stl-qmn-guide-link"><button type="button" id="stl-qmn-show-tutorial"
      title="Open the AFT Map Notes+ tutorial"><i class="fa-solid fa-circle-question"></i> Quick tutorial</button></div>
    <div class="stl-qmn-grid">
      <label class="stl-qmn-field stl-qmn-full"><span>Title / map label</span>
        <input type="text" name="title" maxlength="120" placeholder="e.g. Old Warehouse" required autofocus></label>
      ${playerMode ? `
      <label class="stl-qmn-field stl-qmn-full"><span>Save in Party Map Notes</span>
        <select name="playerScope" id="stl-qmn-scope">
          <option value="personal" selected>Personal — only you and the GM</option>
          <option value="party">Shared with Party — everyone can read</option>
        </select></label>
      <p class="stl-qmn-help stl-qmn-full">All notes for this map go into one Journal with separate page permissions. Use Quick Map Note to add another page (the native Journal Add Page button is GM-only). You can edit your own page later; the GM can edit or remove any note.</p>
      <label class="stl-qmn-field stl-qmn-full"><span>Note / description</span>
        <textarea name="description" rows="4" placeholder="Write your map note here."></textarea></label>
      ` : `
      <label class="stl-qmn-field stl-qmn-full"><span>Use an existing Journal (optional)</span>
        <select name="existingJournal" id="stl-qmn-journal"><option value="">Create a new Journal</option>${journalOptions}</select></label>
      <div id="stl-qmn-existing-info" class="stl-qmn-help" hidden>Using an existing Journal: its current permissions and content remain unchanged. Permissions to the Journal also affect its other references.</div>
      <label class="stl-qmn-field stl-qmn-full" id="stl-qmn-description-group"><span>Note / description</span>
        <textarea name="description" rows="4" placeholder="Note text goes into a native Journal page."></textarea></label>
      <div id="stl-qmn-visibility-group" class="stl-qmn-full">
        <label class="stl-qmn-field"><span>Player visibility</span>
          <select name="visibility" id="stl-qmn-visibility">
            <option value="gm">GM only (default)</option>
            <option value="pin">Everyone sees the pin, but cannot read the text</option>
            <option value="read">Everyone can read the Journal</option>
            ${players.length ? '<option value="specific">Choose specific players...</option>' : ""}
          </select></label>
        <div class="stl-qmn-help">A pin's title can be seen by users allowed to see that pin. Use a neutral title for mysteries.</div>
        <div id="stl-qmn-players" hidden>
          <div class="stl-qmn-mini-title">Individual player access</div>
          ${playerRows}
        </div>
      </div>
      `}
      <div class="stl-qmn-field stl-qmn-full"><span>Map icon</span>
        <div class="stl-qmn-icon-area">
          <div class="stl-qmn-preview"><img id="stl-qmn-preview" alt="Selected icon" src="${escapeHtml(storedIcon)}"></div>
          <div class="stl-qmn-icon-fields">
            <select name="iconPreset" id="stl-qmn-icon-select">
              ${optionHtml}<option value="custom" ${preset === "custom" ? "selected" : ""}>Custom / existing image</option>
            </select>
            <div class="stl-qmn-inline"><button type="button" id="stl-qmn-browse">Browse images...</button>
              <button type="button" id="stl-qmn-upload">Upload image...</button></div>
            <input type="text" name="customPath" id="stl-qmn-custom-path" placeholder="Custom Foundry image path" value="${preset === "custom" ? escapeHtml(storedIcon) : ""}">
            <input type="file" id="stl-qmn-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
          </div>
        </div>
      </div>
      <div class="stl-qmn-color-row stl-qmn-full">
        <label class="stl-qmn-field"><span>Icon tint / color</span>
          <input type="color" name="tint" id="stl-qmn-tint" value="${storedTint}"></label>
        <label class="stl-qmn-check"><input type="checkbox" name="applyTint" checked> Apply tint</label>
        <label class="stl-qmn-field"><span>Icon size</span>
          <select name="iconSize">
            <option value="24">24 px</option><option value="32">32 px</option>
            <option value="40" selected>40 px</option><option value="48">48 px</option>
            <option value="64">64 px</option><option value="80">80 px</option>
          </select></label>
      </div>
      <label class="stl-qmn-check stl-qmn-full"><input type="checkbox" name="globallyVisible"> Show pin through fog / token vision restrictions</label>
      <p class="stl-qmn-help stl-qmn-full">${playerMode ? "Player notes are created by the connected GM. Uploads are limited to 512 KB. " : ""}Visibility is still limited by Journal permissions. White icons tint most accurately; full-color uploads are multiplied by the tint, or can keep their original colors.</p>
    </div>
  </div>`;
}

/** Hook user controls inside a newly rendered DialogV2. */
function wireDialog(dialog, state) {
  const root = dialog.element;
  const $ = selector => root.querySelector(selector);
  const iconSelect = $("#stl-qmn-icon-select");
  const customInput = $("#stl-qmn-custom-path");
  const preview = $("#stl-qmn-preview");
  const fileInput = $("#stl-qmn-file");
  const journalSelect = $("#stl-qmn-journal");
  const titleInput = $("[name=title]");
  const visibility = $("#stl-qmn-visibility");
  $("#stl-qmn-show-tutorial")?.addEventListener("click", () => {
    void showQuickMapTutorial({force:true}).catch(error => {
      console.error(`[${MODULE_ID}] Could not open tutorial`, error);
      ui.notifications.error("AFT Map Notes+: Could not open the tutorial.");
    });
  });

  function previewIcon(path) {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    preview.src = path || ICONS[0][1];
  }
  function syncIcon() {
    const path = iconSelect.value === "custom" ? customInput.value.trim() : iconSelect.value;
    previewIcon(path);
  }
  function syncJournal() {
    if (!journalSelect) return;
    const existing = Boolean(journalSelect.value);
    $("#stl-qmn-existing-info").hidden = !existing;
    $("#stl-qmn-description-group").hidden = existing;
    $("#stl-qmn-visibility-group").hidden = existing;
    if (existing && !titleInput.value.trim()) {
      titleInput.value = game.journal.get(journalSelect.value)?.name ?? "";
    }
  }
  function syncVisibility() {
    if (!visibility) return;
    $("#stl-qmn-players").hidden = visibility.value !== "specific";
  }

  iconSelect.addEventListener("change", () => {
    state.uploadFile = null;
    fileInput.value = "";
    syncIcon();
  });
  customInput.addEventListener("input", () => {
    state.uploadFile = null;
    iconSelect.value = "custom";
    syncIcon();
  });
  journalSelect?.addEventListener("change", syncJournal);
  visibility?.addEventListener("change", syncVisibility);

  $("#stl-qmn-browse").addEventListener("click", () => {
    const Picker = foundry.applications.apps.FilePicker;
    new Picker({
      type: "image",
      current: customInput.value.trim() || ICONS[0][1],
      callback: path => {
        if (!iconValid(path)) return;
        iconSelect.value = "custom";
        customInput.value = path;
        state.uploadFile = null;
        fileInput.value = "";
        syncIcon();
      }
    }).render({force: true});
  });

  $("#stl-qmn-upload").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const maxSize = game.user?.isGM ? MAX_FILE_SIZE : MAX_PLAYER_FILE_SIZE;
    if (!ALLOWED_UPLOADS[file.type] || file.size > maxSize) {
      ui.notifications.warn(`Use a PNG, JPEG, WebP, or GIF image no larger than ${game.user?.isGM ? "5 MB" : "512 KB"}.`);
      fileInput.value = "";
      state.uploadFile = null;
      customInput.value = "";
      iconSelect.value = ICONS[0][1];
      syncIcon();
      return;
    }
    state.uploadFile = file;
    iconSelect.value = "custom";
    customInput.value = `(Upload on Save) ${file.name}`;
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = URL.createObjectURL(file);
    preview.src = state.previewUrl;
  });

  syncJournal();
  syncVisibility();
}

export async function uploadNewIcon(file) {
  if (!ALLOWED_UPLOADS[file.type] || file.size > MAX_FILE_SIZE) {
    throw new Error("Use a PNG, JPEG, WebP, or GIF image no larger than 5 MB.");
  }
  const filename = `map-note-${foundry.utils.randomID(16)}.${ALLOWED_UPLOADS[file.type]}`;
  // Unique filename prevents an upload replacing artwork used by other pins.
  const renamed = new File([file], filename, {type: file.type});
  const Picker = foundry.applications.apps.FilePicker;
  const response = await Picker.uploadPersistent(MODULE_ID, "", renamed, {}, {notify: false});
  if (!response?.path || !iconValid(response.path)) {
    throw new Error("Image upload did not return a valid server path. No Journal or pin was created.");
  }
  return response.path;
}

/** Create exactly one native JournalEntry (or link one existing) and one Note. */
export async function createQuickMapNote({scene, at, form, uploadedFile = null, users = [],
  upload = uploadNewIcon, requester = null}) {
  if (!game.user?.isGM) throw new Error("Only a GM can create Quick Map Notes.");
  if (!scene) throw new Error("There is no active Scene.");
  const linkedId = String(form.existingJournal ?? "").trim();
  const existing = linkedId ? game.journal.get(linkedId) : null;
  if (linkedId && !existing) throw new Error("The selected existing Journal no longer exists.");
  if (requester) {
    if (linkedId) throw new Error("Players create notes in Personal or Shared with Party, not existing Journals.");
    if (!Object.hasOwn(PLAYER_SCOPES,form.playerScope)) {
      throw new Error("Choose Personal or Shared with Party for your map note.");
    }
  }
  const title = String(form.title ?? "").trim() || existing?.name || "";
  if (!title) throw new Error("Enter a title for the new map note.");

  const preset = String(form.iconPreset ?? ICONS[0][1]);
  let icon = preset === "custom" ? String(form.customPath ?? "").trim() : preset;
  if (uploadedFile) icon = await upload(uploadedFile);
  if (!iconValid(icon)) throw new Error("Choose a valid icon, browse an image, or upload one.");

  const tint = form.applyTint ? hexColor(form.tint) : "#FFFFFF";
  const players = users.filter(u => !u.isGM);
  const choices = Object.fromEntries(players.map(u => [u.id, form[`perm_${u.id}`] ?? 0]));
  if (requester) {
    return createPlayerMapNote({scene, at, title, description:form.description, form,
      requester, icon, tint});
  }
  let journal = existing;
  let pageId = null;
  if (!journal) {
    journal = await JournalEntry.create({
      name: title,
      ownership: buildOwnership(form.visibility, choices, players),
      pages: [{
        name: title,
        type: "text",
        ownership: {default: -1}, // Inherit entry permissions; avoid a secret page override.
        text: {format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: journalHtml(form.description)}
      }],
      flags: {[MODULE_ID]: {createdWith: VERSION}}
    });
    if (!journal) throw new Error("Foundry did not create the Journal.");
    pageId = Array.from(journal.pages ?? [])[0]?.id ?? null;
  }

  // No mutation of existing Journal permissions. Their other references are safe.
  const data = makeNoteData({
    x: at.x, y: at.y, title, journalId: journal.id, pageId,
    icon, tint, size: form.iconSize, globallyVisible: form.globallyVisible
  });
  try {
    const created = await scene.createEmbeddedDocuments("Note", [data]);
    if (!created?.length) throw new Error("Foundry returned no map note.");
    return {journal, note: created[0], icon, tint, linkedExisting: Boolean(existing)};
  } catch (error) {
    // Preserve the newly created Journal if the Note operation failed.
    if (!existing) {
      throw new Error(`Map pin failed; the new Journal "${title}" was kept. ${error.message}`);
    }
    throw error;
  }
}

/** Ensure a custom player icon cannot reference external URLs or parent directories. */
export function playerIconValid(value) {
  const path = String(value ?? "").trim();
  return path.length > 0 && path.length <= 512 &&
    !path.startsWith("/") && !path.startsWith("\\") && !path.includes("\\") &&
    !path.includes("..") && !path.includes("//") && !/[?#:\x00-\x1f]/.test(path) &&
    /\.(?:png|jpe?g|webp|gif|svg)$/i.test(path);
}

/** Binary icon transfer is limited and decoded only on the trusted GM client. */
function imageSignatureValid(bytes, type) {
  if (type === "image/png") return bytes.length >= 8 &&
    [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i] === v);
  if (type === "image/jpeg") return bytes.length >= 3 &&
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/gif") return bytes.length >= 6 &&
    (String.fromCharCode(...bytes.slice(0,6)) === "GIF89a" ||
     String.fromCharCode(...bytes.slice(0,6)) === "GIF87a");
  if (type === "image/webp") return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

export async function encodePlayerImage(file) {
  if (!file) return null;
  if (!ALLOWED_UPLOADS[file.type] || file.size > MAX_PLAYER_FILE_SIZE) {
    throw new Error("Player-uploaded icons must be PNG/JPEG/WebP/GIF, at most 512 KB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageSignatureValid(bytes, file.type)) throw new Error("The uploaded file is not a valid image.");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return {type: file.type, encoded: btoa(binary)};
}

export function decodePlayerImage(encodedImage) {
  if (!encodedImage) return null;
  if (!ALLOWED_UPLOADS[encodedImage?.type] ||
      typeof encodedImage?.encoded !== "string" ||
      encodedImage.encoded.length > Math.ceil(MAX_PLAYER_FILE_SIZE * 4 / 3) + 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(encodedImage.encoded)) {
    throw new Error("Invalid uploaded icon payload.");
  }
  let bytes;
  try { bytes = Uint8Array.from(atob(encodedImage.encoded), c => c.charCodeAt(0)); }
  catch { throw new Error("Invalid encoded icon."); }
  if (!bytes.length || bytes.length > MAX_PLAYER_FILE_SIZE ||
      !imageSignatureValid(bytes, encodedImage.type)) {
    throw new Error("Uploaded icon failed size or image validation.");
  }
  return new File([bytes], `player-icon.${ALLOWED_UPLOADS[encodedImage.type]}`,
    {type: encodedImage.type});
}

/** Prepare only the fields that a player can submit. */
function preparePlayerForm(form) {
  const safe = Object.create(null);
  safe.title = String(form?.title ?? "").trim();
  safe.description = String(form?.description ?? "");
  safe.playerScope = String(form?.playerScope ?? "personal");
  // Retain any attempt to link an existing Journal so the GM can reject it.
  safe.existingJournal = String(form?.existingJournal ?? "");
  safe.iconPreset = String(form?.iconPreset ?? ICONS[0][1]);
  safe.customPath = String(form?.customPath ?? "");
  safe.tint = String(form?.tint ?? "#FFFFFF");
  safe.applyTint = form?.applyTint === true;
  safe.iconSize = Number(form?.iconSize ?? 40);
  safe.globallyVisible = form?.globallyVisible === true;
  return safe;
}

/** Revalidate every field and Scene on the GM before writing. */
export function validatePlayerNoteRequest({scene, at, form, user, image = null}) {
  if (!user?.id || user.isGM || !user.active) throw new Error("Invalid player request.");
  const viewed = user.viewedScene?.id ?? user.viewedScene;
  if (!scene?.id || viewed !== scene.id) {
    throw new Error("Players may only place notes on the Scene they are viewing.");
  }
  if (!Number.isFinite(at?.x) || !Number.isFinite(at?.y)) throw new Error("Invalid map position.");
  const rect = scene.dimensions?.sceneRect ?? scene.getDimensions?.()?.sceneRect;
  if (rect && (at.x < rect.x || at.y < rect.y ||
      at.x > rect.x + rect.width || at.y > rect.y + rect.height)) {
    throw new Error("The map note must be inside the Scene.");
  }
  if (!form || typeof form !== "object" || Array.isArray(form)) throw new Error("Invalid note form.");
  const title = String(form.title ?? "").trim();
  if (title.length < 1 || title.length > 120) throw new Error("The note title must be 1–120 characters.");
  if (typeof form.description !== "string" || form.description.length > 10000) {
    throw new Error("Note descriptions cannot exceed 10,000 characters.");
  }
  if (!Object.hasOwn(PLAYER_SCOPES,form.playerScope) || form.existingJournal) {
    throw new Error("Players must choose Personal or Shared with Party, not an existing Journal.");
  }
  if (![24,32,40,48,64,80].includes(Number(form.iconSize))) throw new Error("Invalid icon size.");
  if (!/^#[0-9a-f]{6}$/i.test(form.tint)) throw new Error("Invalid icon tint.");
  const icon = form.iconPreset === "custom" ? form.customPath : form.iconPreset;
  if (!image && !(ICONS.some(([_,path]) => path === icon) || playerIconValid(icon))) {
    throw new Error("Choose a valid map icon.");
  }
  return true;
}

/** The targeted player must confirm a pending local request to establish identity. */
export function verifyPlayerNoteQuery({requestId,challenge,sceneId} = {}) {
  if (game.user?.isGM || typeof requestId !== "string" ||
      typeof challenge !== "string" || !/^[0-9a-f]{64}$/.test(challenge)) return null;
  const pending = pendingPlayerRequests.get(requestId);
  if (!pending || pending.verified || Date.now()-pending.at > 30000 || pending.sceneId !== sceneId) return null;
  pending.verified = true;
  return {challenge};
}

/** No public broadcast of note text: only the target GM receives the request. */
export async function submitPlayerNoteRequest({scene, at, form, uploadedFile = null}) {
  if (game.user?.isGM) throw new Error("GM clients use the normal creation workflow.");
  const gm = game.users.activeGM;
  if (!gm?.active) throw new Error("An active GM must be connected to create player map notes.");
  const random = crypto.getRandomValues(new Uint8Array(32));
  const requestId = Array.from(random, v=>v.toString(16).padStart(2,"0")).join("");
  const request = {sceneId:scene.id, at:{x:at.x,y:at.y}, form:preparePlayerForm(form),
    image: await encodePlayerImage(uploadedFile)};
  pendingPlayerRequests.set(requestId, {at:Date.now(),sceneId:scene.id,verified:false});
  try {
    const result = await gm.query(PLAYER_QUERY, {requesterId:game.user.id,requestId,request},
      {timeout:30000});
    if (!result?.ok) throw new Error(result?.error ?? "The GM could not create the map note.");
    return result;
  } finally {
    pendingPlayerRequests.delete(requestId);
  }
}

export async function handlePlayerNoteQuery({requesterId,requestId,request} = {}) {
  if (!game.user?.isGM || game.users.activeGM?.id !== game.user.id) {
    return {ok:false,error:"Only the active GM can create player notes."};
  }
  try {
    const user = game.users.get(requesterId);
    if (!user?.active || user.isGM || typeof requestId !== "string" ||
        !/^[0-9a-f]{64}$/.test(requestId) || !request || typeof request !== "object") {
      throw new Error("Invalid player note request.");
    }
    const scene = game.scenes.get(request.sceneId);
    const image = decodePlayerImage(request.image);
    validatePlayerNoteRequest({scene,at:request.at,form:request.form,user,image});
    const now = Date.now(), last = lastPlayerRequest.get(user.id) ?? 0;
    if (now-last < 1500) throw new Error("Please avoid placing notes more than once per second.");
    // The user ID supplied in queryData is NOT trusted until that exact player's
    // connected client verifies a random challenge for an outstanding local request.
    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = Array.from(challengeBytes, v=>v.toString(16).padStart(2,"0")).join("");
    const answer = await user.query(VERIFY_QUERY,{requestId,challenge,sceneId:scene.id},{timeout:5000});
    if (answer?.challenge !== challenge) throw new Error("Player identity verification failed.");
    lastPlayerRequest.set(user.id,now);
    const result = await createQuickMapNote({scene,at:request.at,form:request.form,
      uploadedFile:image,users:playerUsers(),requester:user});
    return {ok:true,noteId:result.note.id,journalId:result.journal.id,
      pageId:result.page?.id,icon:result.icon,tint:result.tint};
  } catch (error) {
    console.warn(`[${MODULE_ID}] Player note request rejected`, error);
    return {ok:false,error:error.message || "Player note creation failed."};
  }
}

async function showCreationDialog(scene, at) {
  const state = {uploadFile: null, previewUrl: null};
  const DialogV2 = foundry.applications.api.DialogV2;
  let form;
  try {
    form = await DialogV2.input({
      window: {title: "Quick Map Note", icon: "fa-solid fa-map-pin", resizable: true},
      classes: ["stl-quick-map-notes"],
      position: {width: 480},
      content: (() => {
        // Avoid Foundry sanitizing input[type=file] and custom controls.
        const element = document.createElement("div");
        element.innerHTML = buildDialogContent();
        return element;
      })(),
      ok: {label: "Create Map Note", icon: "fa-solid fa-check"},
      rejectClose: false,
      render: (_event, dialog) => wireDialog(dialog, state)
    });
  } finally {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  }
  if (!form) return;
  try {
    if (canvas.scene?.id !== scene.id) throw new Error("The active Scene changed; place your note again on the desired Scene.");
    const result = game.user?.isGM
      ? await createQuickMapNote({scene, at, form, uploadedFile: state.uploadFile, users: playerUsers()})
      : await submitPlayerNoteRequest({scene, at, form, uploadedFile: state.uploadFile});
    try {
      await Promise.all([
        game.settings.set(MODULE_ID, "lastIcon", result.icon),
        game.settings.set(MODULE_ID, "lastTint", result.tint)
      ]);
    } catch (settingError) {
      console.warn(`[${MODULE_ID}] Failed to remember icon preferences`, settingError);
    }
    ui.notifications.info(game.user?.isGM
      ? `Created map note: ${result.note?.text ?? result.journal.name}`
      : "Map note created.");
  } catch (error) {
    console.error(`[${MODULE_ID}] Unable to create map note`, error);
    ui.notifications.error(`AFT Map Notes+: ${error.message}`);
  }
}

/**
 * Find ONLY notes on the current Scene that the current user may actually see.
 * This must not leak the title of a private Journal Page through the finder,
 * even when the parent Journal is party-readable. For players, fail closed if
 * Foundry has not supplied a visibility/permission result yet.
 */
export function listVisibleSceneNotes(sceneCanvas = globalThis.canvas, user = game.user) {
  if (!sceneCanvas?.ready || !sceneCanvas.scene?.id || !user) return [];
  const result = [], seen = new Set();
  const drawn = Array.from(sceneCanvas.notes?.placeables ?? []);
  // GMs must also see saved Scene Notes whose canvas placeables are not drawn
  // (for example, when changing layers or after a Scene refresh).
  if (user.isGM) {
    const drawnIds = new Set(drawn.map(note => note?.document?.id));
    for (const doc of sceneCanvas.scene.notes ?? []) {
      if (doc?.id && !drawnIds.has(doc.id)) drawn.push({document:doc});
    }
  }
  for (const note of drawn) {
    const doc = note?.document;
    const id = String(doc?.id ?? "");
    if (!id || seen.has(id) || note.isPreview || !Number.isFinite(doc.x) || !Number.isFinite(doc.y)) continue;
    if (doc.parent?.id && doc.parent.id !== sceneCanvas.scene.id) continue;
    // Reject a stale canvas placeable after its native Scene Note was deleted.
    if (sceneCanvas.scene.notes?.get && !sceneCanvas.scene.notes.get(id)) continue;
    const entry = note.entry ?? game.journal?.get?.(doc.entryId);
    if (!user.isGM) {
      if (note.isVisible !== true) continue; // Native fog and vision checks.
      if (!entry?.testUserPermission?.(user, "LIMITED")) continue;
      if (doc.pageId) {
        const page = note.page ?? entry.pages?.get?.(doc.pageId) ??
          Array.from(entry.pages ?? []).find(p => p.id === doc.pageId);
        if (!page?.testUserPermission?.(user, "LIMITED")) continue;
      }
    }
    seen.add(id);
    result.push({id, name:String(doc.text || note.page?.name || entry?.name || "Unnamed Note"),
      journalName:String(entry?.name || ""), x:doc.x, y:doc.y, note});
  }
  return result.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true,sensitivity:"base"}) ||
    a.id.localeCompare(b.id));
}

/** The management dialog opens even for an empty Scene, with a Refresh button. */
export function findQuickNoteHtml(notes, tokenCount = 0, canDelete = false, mode = "manage") {
  if (!["find", "manage"].includes(mode)) throw new Error("Invalid map note list mode.");
  const managing = mode === "manage";
  return `<div class="stl-qmn-finder-body">
    <label class="stl-qmn-find-search"><span>Map notes on this Scene</span>
      <input type="search" placeholder="Search note titles" aria-label="Search map notes" autocomplete="off"></label>
    <div class="stl-qmn-find-actions">
      <span>${notes.length} accessible note${notes.length === 1 ? "" : "s"}.</span>
      <button type="button" data-note-action="refresh" title="Reload map notes and selected token count">Refresh list</button>
    </div>
    <p class="stl-qmn-find-hint">${managing
      ? `Pan moves your view. Move selected relocates tokens you control as a group (no pathfinding or collision checks).
         ${canDelete ? "Delete Pin removes the Scene pin only; its Journal Page remains." : ""}`
      : "Select Pan to center the view on a note without moving tokens or changing documents."}</p>
    ${managing ? `<p class="stl-qmn-find-hint">Selected tokens: <strong>${tokenCount}</strong>.
      Select tokens before opening this panel or select them while it is open, then click Refresh list.</p>` : ""}
    <div class="stl-qmn-find-results" role="list">
      ${notes.length ? notes.map(n => `<div class="stl-qmn-find-row" role="listitem" data-find-row data-search="${escapeHtml((n.name + " " + n.journalName).toLowerCase())}">
        <div class="stl-qmn-find-label"><strong>${escapeHtml(n.name)}</strong>
          ${n.journalName ? `<small>${escapeHtml(n.journalName)}</small>` : ""}</div>
        <button type="button" data-note-action="pan" data-note-id="${escapeHtml(n.id)}" aria-label="Pan to ${escapeHtml(n.name)}">Pan</button>
        ${managing ? `<button type="button" data-note-action="move" data-note-id="${escapeHtml(n.id)}" ${tokenCount ? "" : "disabled"}
          aria-label="Move selected tokens to ${escapeHtml(n.name)}">Move selected</button>` : ""}
        ${managing && canDelete ? `<button type="button" class="stl-qmn-delete-pin" data-note-action="delete" data-note-id="${escapeHtml(n.id)}"
          aria-label="Delete map pin ${escapeHtml(n.name)}">Delete Pin</button>` : ""}
      </div>`).join("") : '<p class="stl-qmn-find-zero">No accessible map notes found. The list can be refreshed without closing this window.</p>'}
    </div>
    <p class="stl-qmn-find-empty" hidden>No matching map notes.</p>
  </div>`;
}

/** Re-resolve the note at click time: permissions and Scene can change while the list is open. */
function resolveFindNote(noteId, sceneId, sceneCanvas = globalThis.canvas, user = game.user) {
  if (!sceneCanvas?.ready || !sceneCanvas.scene || sceneCanvas.scene.id !== sceneId) {
    throw new Error("The Scene changed. Open Find Quick Note on the intended map.");
  }
  const result = listVisibleSceneNotes(sceneCanvas, user).find(n => n.id === noteId);
  if (!result) throw new Error("That note is no longer visible or accessible. Reopen the list.");
  return result;
}

export async function panToQuickNote(noteId, {sceneCanvas = globalThis.canvas,
  user = game.user, sceneId = sceneCanvas?.scene?.id} = {}) {
  const {note} = resolveFindNote(noteId, sceneId, sceneCanvas, user);
  if (note.isVisible === undefined && typeof sceneCanvas.animatePan === "function") {
    await sceneCanvas.animatePan({x:note.document.x,y:note.document.y,duration:450});
  } else if (typeof sceneCanvas.notes?.panToNote === "function") {
    await sceneCanvas.notes.panToNote(note,{duration:450});
  } else if (typeof sceneCanvas.animatePan === "function") {
    await sceneCanvas.animatePan({x:note.document.x,y:note.document.y,duration:450});
  } else {
    throw new Error("Map note panning is not available.");
  }
  return note;
}

/**
 * Compute ONE rigid-body translation for the controlled token group. The native
 * Scene update is permission-checked; this function never creates tokens or
 * modifies elevation, ownership, vision, or the linked Journals/Notes.
 * No pathfinding: this is an explicit teleport/relocation command.
 */
export function planSelectedTokensToNote(note, {
  sceneCanvas = globalThis.canvas, user = game.user, tokens = sceneCanvas?.tokens?.controlled ?? []
} = {}) {
  if (!user || !sceneCanvas?.ready || !sceneCanvas.scene || !note?.document ||
      !Number.isFinite(note.document.x) || !Number.isFinite(note.document.y)) {
    throw new Error("A valid Scene and map note are required.");
  }
  if (!Array.isArray(tokens) || !tokens.length) throw new Error("Select one or more tokens before opening Find Quick Note.");
  const scene = sceneCanvas.scene;
  const gridW = sceneCanvas.grid?.sizeX || sceneCanvas.grid?.size || sceneCanvas.dimensions?.size || 100;
  const gridH = sceneCanvas.grid?.sizeY || sceneCanvas.grid?.size || sceneCanvas.dimensions?.size || 100;
  const positions = tokens.map(token => {
    const doc = token?.document;
    if (!doc?.id || (doc.parent?.id && doc.parent.id !== scene.id) ||
        !Number.isFinite(doc.x) || !Number.isFinite(doc.y)) {
      throw new Error("Selected tokens must belong to this Scene.");
    }
    if (doc.locked) throw new Error(`Token ${doc.name || doc.id} is locked.`);
    if (!user.isGM && !doc.canUserModify?.(user, "update")) {
      throw new Error(`You cannot move token ${doc.name || doc.id}.`);
    }
    const width = Number(token.w ?? token.bounds?.width ?? Number(doc.width) * gridW);
    const height = Number(token.h ?? token.bounds?.height ?? Number(doc.height) * gridH);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error("A selected token has invalid dimensions.");
    }
    return {id:doc.id,x:doc.x,y:doc.y,width,height};
  });
  const minX=Math.min(...positions.map(t=>t.x)),minY=Math.min(...positions.map(t=>t.y));
  const maxX=Math.max(...positions.map(t=>t.x+t.width));
  const maxY=Math.max(...positions.map(t=>t.y+t.height));
  const centerX=(minX+maxX)/2, centerY=(minY+maxY)/2;
  let dx=note.document.x-centerX, dy=note.document.y-centerY;
  // For square maps, translate in whole cells to preserve tokens already aligned to a grid.
  if (sceneCanvas.grid?.isSquare && Number.isFinite(gridW) && Number.isFinite(gridH)) {
    dx=Math.round(dx/gridW)*gridW;
    dy=Math.round(dy/gridH)*gridH;
  }
  const rect = sceneCanvas.dimensions?.sceneRect;
  if (rect && [rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)) {
    const minDx=rect.x-minX, maxDx=rect.x+rect.width-maxX;
    const minDy=rect.y-minY, maxDy=rect.y+rect.height-maxY;
    if (minDx > maxDx || minDy > maxDy) {
      throw new Error("The selected token group does not fit inside the Scene bounds.");
    }
    // Clamp the whole group rather than scattering or stacking individual tokens.
    dx=Math.max(minDx,Math.min(maxDx,dx));
    dy=Math.max(minDy,Math.min(maxDy,dy));
  }
  return positions.map(t => ({_id:t.id,x:Math.round(t.x+dx),y:Math.round(t.y+dy)}));
}

/** Move only the current user's selected/authorized tokens, never other players' tokens. */
export async function moveSelectedTokensToQuickNote(noteId, {sceneCanvas = globalThis.canvas,
  user = game.user, sceneId = sceneCanvas?.scene?.id} = {}) {
  const {note} = resolveFindNote(noteId,sceneId,sceneCanvas,user);
  const updates=planSelectedTokensToNote(note,{sceneCanvas,user});
  if (typeof sceneCanvas.scene.updateEmbeddedDocuments !== "function") {
    throw new Error("Scene token updates are not available.");
  }
  const changed=await sceneCanvas.scene.updateEmbeddedDocuments("Token",updates);
  if (!Array.isArray(changed) || changed.length !== updates.length) {
    throw new Error("Token move result was incomplete. Check the Scene before trying again.");
  }
  await panToQuickNote(noteId,{sceneCanvas,user,sceneId});
  return changed.length;
}

/** Delete only the Scene pin, never its linked native Journal Entry or Page. */
export async function deleteQuickNotePin(noteId, {sceneCanvas = globalThis.canvas,
  user = game.user, sceneId = sceneCanvas?.scene?.id,
  confirm = foundry.applications.api.DialogV2.confirm} = {}) {
  if (!user?.isGM) throw new Error("Only a GM can delete Scene map pins.");
  const item = resolveFindNote(noteId,sceneId,sceneCanvas,user);
  const approved = await confirm({
    window:{title:"Delete Quick Map Pin"},
    content:`<p>Delete the map pin <strong>${escapeHtml(item.name)}</strong>?</p>
      <p>The linked Journal Entry and Page will be kept.</p>`,
    modal:true, rejectClose:false,
    yes:{label:"Delete Pin",icon:"fa-solid fa-trash"},
    no:{label:"Cancel"}
  });
  if (approved !== true) return false;
  resolveFindNote(noteId,sceneId,sceneCanvas,user); // Re-check after the confirmation.
  if (typeof sceneCanvas.scene.deleteEmbeddedDocuments !== "function") {
    throw new Error("Scene Note deletion is unavailable.");
  }
  const deleted = await sceneCanvas.scene.deleteEmbeddedDocuments("Note",[noteId]);
  if (!Array.isArray(deleted) || deleted.length !== 1 || deleted[0]?.id !== noteId) {
    throw new Error("The Scene did not confirm pin deletion. Check the map before retrying.");
  }
  return true;
}

/** A real Foundry DialogV2; controls stay visible while panning among notes. */
export async function showFindQuickNotes(mode = "manage") {
  if (!["find", "manage"].includes(mode)) throw new Error("Invalid map note list mode.");
  const sceneCanvas=globalThis.canvas, user=game.user;
  if (!sceneCanvas?.ready || !sceneCanvas.scene) {
    ui.notifications.warn("Open a Scene before finding map notes.");
    return false;
  }
  const sceneId=sceneCanvas.scene.id;
  const content=document.createElement("div");
  content.innerHTML=findQuickNoteHtml(listVisibleSceneNotes(sceneCanvas,user),
    sceneCanvas.tokens?.controlled?.length ?? 0,user?.isGM === true,mode);
  return foundry.applications.api.DialogV2.wait({
    window:{title:mode === "find" ? "Find Map Note" : "Manage Map Note",
      icon:mode === "find" ? "fa-solid fa-magnifying-glass" : "fa-solid fa-list-check",resizable:true},
    classes:["stl-qmn-finder"],
    position:{width:720},
    content,
    buttons:[{action:"close",label:"Close",default:true}],
    rejectClose:false,
    render: (_event,dialog) => {
      const root=dialog.element;
      const refresh = () => {
        if (!sceneCanvas.ready || sceneCanvas.scene?.id !== sceneId) {
          throw new Error("The Scene changed. Close and reopen Map Notes on the desired Scene.");
        }
        const body=root.querySelector(".stl-qmn-finder-body");
        if (body) body.outerHTML=findQuickNoteHtml(listVisibleSceneNotes(sceneCanvas,user),
          sceneCanvas.tokens?.controlled?.length ?? 0,user?.isGM === true,mode);
      };
      const filter = (search) => {
        let count=0;
        for(const row of root.querySelectorAll("[data-find-row]")) {
          const match=String(row.dataset.search??"").includes(search.value.toLowerCase().trim());
          row.hidden=!match;
          if(match) count++;
        }
        const empty=root.querySelector(".stl-qmn-find-empty");
        if(empty) empty.hidden=count>0 || root.querySelectorAll("[data-find-row]").length===0;
      };
      // Delegation remains bound after Refresh or Delete rebuilds the note list.
      root.addEventListener("input", event => {
        if(event.target?.matches?.(".stl-qmn-find-search input")) filter(event.target);
      });
      root.addEventListener("click", async event => {
        const button=event.target?.closest?.("button[data-note-action]");
        if(!button || !root.contains(button) || button.disabled) return;
        if (mode === "find" && !["pan", "refresh"].includes(button.dataset.noteAction)) return;
        button.disabled=true;
        try {
          if(button.dataset.noteAction==="refresh") {
            refresh();
          } else if(button.dataset.noteAction==="pan") {
            await panToQuickNote(button.dataset.noteId,{sceneCanvas,user,sceneId});
          } else if(button.dataset.noteAction==="move") {
            const moved=await moveSelectedTokensToQuickNote(button.dataset.noteId,{sceneCanvas,user,sceneId});
            ui.notifications.info(`Moved ${moved} selected token${moved===1?"":"s"} near the map note.`);
          } else if(button.dataset.noteAction==="delete") {
            const deleted=await deleteQuickNotePin(button.dataset.noteId,{sceneCanvas,user,sceneId});
            if(deleted) {
              ui.notifications.info("Map pin deleted. Its linked Journal Page was kept.");
              refresh();
            }
          }
        }catch(error){
          console.warn(`[${MODULE_ID}] Map Notes action failed`,error);
          ui.notifications.error(`AFT Map Notes+: ${error.message}`);
        }finally{button.disabled=false;}
      });
    }
  });
}

/** Capture next canvas click before PIXI placeables react; Escape cancels. */
function armPlacement() {
  if (!game.user) return;
  if (!game.user.isGM && !game.users.activeGM?.active) {
    ui.notifications.warn("A GM must be online to create player map notes.");
    return;
  }
  if (!canvas?.ready || !canvas.scene) {
    ui.notifications.warn("Open a Scene before placing a map note.");
    return;
  }
  if (armedPlacement) armedPlacement();
  const scene = canvas.scene;
  const board = canvas.app?.canvas ?? canvas.app?.view ?? canvas.app?.renderer?.view;
  if (!board) {
    ui.notifications.error("Could not access the scene canvas.");
    return;
  }
  const formerCursor = board.style.cursor;
  board.style.cursor = "crosshair";
  const cleanup = () => {
    board.removeEventListener("pointerdown", onPointer, true);
    document.removeEventListener("keydown", onKey, true);
    board.style.cursor = formerCursor;
    if (armedPlacement === cleanup) armedPlacement = null;
  };
  const onKey = event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    cleanup();
    ui.notifications.info("Map note placement canceled.");
  };
  const onPointer = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const at = canvas.canvasCoordinatesFromClient({x: event.clientX, y: event.clientY});
    const box = canvas.dimensions?.sceneRect;
    if (box && (at.x < box.x || at.y < box.y || at.x > box.x + box.width || at.y > box.y + box.height)) {
      ui.notifications.warn("Click inside the active Scene to place your note, or press Escape.");
      return;
    }
    cleanup();
    void showCreationDialog(scene, at);
  };
  armedPlacement = cleanup;
  board.addEventListener("pointerdown", onPointer, true);
  document.addEventListener("keydown", onKey, true);
  ui.notifications.info("Click the map to place a note. Press Escape to cancel.");
}

/** Exactly three actions; labels are text, not user-supplied HTML. */
export function mapNotesMenuHtml() {
  return `<div class="stl-qmn-map-menu-title">Map Notes+</div>
    ${MAP_MENU_ITEMS.map(item => `<button type="button" role="menuitem"
      data-map-notes-action="${item.action}"><i class="${item.icon}" aria-hidden="true"></i>
      <span>${item.label}</span></button>`).join("")}`;
}

function reportMapMenuError(error) {
  console.error(`[${MODULE_ID}] Map Notes+ action failed`, error);
  ui.notifications.error(`AFT Map Notes+: ${error.message || error}`);
}

/** Explicit action dispatch, independent of the Scene Controls renderer. */
export async function runMapNotesMenuAction(action) {
  if (action === "place") { armPlacement(); return true; }
  if (action === "find") return showFindQuickNotes("find");
  if (action === "manage") return showFindQuickNotes("manage");
  throw new Error("Invalid Map Notes+ action.");
}

function cancelMapMenuClose() {
  if (mapNotesMenuCloseTimer !== null) clearTimeout(mapNotesMenuCloseTimer);
  mapNotesMenuCloseTimer = null;
}

function scheduleMapMenuClose() {
  cancelMapMenuClose();
  mapNotesMenuCloseTimer = setTimeout(() => closeMapNotesMenu(), 180);
}

export function closeMapNotesMenu({restoreFocus = false} = {}) {
  cancelMapMenuClose();
  const state = activeMapNotesMenu;
  if (!state) return;
  activeMapNotesMenu = null;
  state.doc.removeEventListener("pointerdown",state.outside,true);
  state.doc.removeEventListener("keydown",state.keydown,true);
  state.win?.removeEventListener?.("resize",state.position);
  state.doc.removeEventListener("scroll",state.position,true);
  state.trigger?.setAttribute?.("aria-expanded","false");
  state.menu.remove();
  if (restoreFocus && state.trigger?.isConnected) {
    suppressMapNotesFocus = true;
    try {state.trigger.focus?.();}
    finally {suppressMapNotesFocus = false;}
  }
}

/** Position a fixed popup next to the native Token Control tool. */
function positionMapNotesMenu(trigger, menu, win) {
  const rect=trigger.getBoundingClientRect();
  const box=menu.getBoundingClientRect();
  const vw=win?.innerWidth ?? 1024, vh=win?.innerHeight ?? 768;
  const width=box.width || 196, height=box.height || 150;
  const right=rect.right + 8;
  const left=right + width > vw - 8 ? rect.left - width - 8 : right;
  menu.style.left=`${Math.max(8,Math.min(vw-width-8,left))}px`;
  menu.style.top=`${Math.max(8,Math.min(vh-height-8,rect.top))}px`;
}

/** Open on hover, keyboard focus, or click; never mutate a Foundry document. */
export function openMapNotesMenu(trigger, {focusFirst = false} = {}) {
  if (!trigger?.ownerDocument?.body || typeof trigger.getBoundingClientRect !== "function") return false;
  cancelMapMenuClose();
  if (activeMapNotesMenu?.trigger === trigger && activeMapNotesMenu.menu.isConnected) {
    if (focusFirst) activeMapNotesMenu.menu.querySelector("button")?.focus?.();
    return true;
  }
  closeMapNotesMenu();
  const doc=trigger.ownerDocument, win=doc.defaultView;
  const menu=doc.createElement("div");
  menu.className="stl-qmn-map-menu";
  menu.id="stl-qmn-map-menu";
  menu.setAttribute("role","menu");
  menu.setAttribute("aria-label","Map Notes+");
  menu.innerHTML=mapNotesMenuHtml();
  doc.body.append(menu);
  const position=() => {
    if (trigger.isConnected === false) {closeMapNotesMenu(); return;}
    positionMapNotesMenu(trigger,menu,win);
  };
  const outside=event => {
    if (!menu.contains(event.target) && !trigger.contains(event.target)) closeMapNotesMenu();
  };
  const keydown=event => {
    if (event.key !== "Escape") return;
    if (!menu.contains(event.target) && !trigger.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    closeMapNotesMenu({restoreFocus:true});
  };
  menu.addEventListener("mouseenter",cancelMapMenuClose);
  menu.addEventListener("mouseleave",scheduleMapMenuClose);
  menu.addEventListener("focusin",cancelMapMenuClose);
  menu.addEventListener("focusout",event => {
    if (!menu.contains(event.relatedTarget) && event.relatedTarget !== trigger) scheduleMapMenuClose();
  });
  menu.addEventListener("click", event => {
    const button=event.target?.closest?.("button[data-map-notes-action]");
    if (!button || !menu.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    const action=button.dataset.mapNotesAction;
    closeMapNotesMenu();
    void runMapNotesMenuAction(action).catch(reportMapMenuError);
  });
  trigger.setAttribute?.("aria-expanded","true");
  activeMapNotesMenu={trigger,menu,doc,win,position,outside,keydown};
  doc.addEventListener("pointerdown",outside,true);
  doc.addEventListener("keydown",keydown,true);
  doc.addEventListener("scroll",position,true);
  win?.addEventListener?.("resize",position);
  position();
  if (focusFirst) menu.querySelector("button")?.focus?.();
  return true;
}

/** v14 SceneControls tool DOM: match data-tool/name or its accessible label. */
export function findMapNotesTrigger(root) {
  const candidate=root?.querySelector?.(
    `[data-tool="${MAP_MENU_TOOL}"], [data-name="${MAP_MENU_TOOL}"],
     [data-tooltip="Map Notes+"], [aria-label="Map Notes+"], [title="Map Notes+"]`);
  if (!candidate) return null;
  return candidate.matches?.("button, [role=button]") ? candidate :
    candidate.querySelector?.("button, [role=button]") ?? candidate;
}

export function bindMapNotesHover(app) {
  const root=app?.element ?? app;
  const trigger=findMapNotesTrigger(root);
  if (!trigger) {
    if (activeMapNotesMenu) closeMapNotesMenu();
    return false;
  }
  if (trigger.dataset?.stlMapNotesBound === "1") return true;
  if (trigger.dataset) trigger.dataset.stlMapNotesBound="1";
  trigger.classList?.add?.("stl-qmn-map-menu-trigger");
  trigger.setAttribute?.("aria-haspopup","menu");
  trigger.setAttribute?.("aria-controls","stl-qmn-map-menu");
  trigger.setAttribute?.("aria-expanded","false");
  trigger.addEventListener("mouseenter",() => openMapNotesMenu(trigger));
  trigger.addEventListener("mouseleave",scheduleMapMenuClose);
  trigger.addEventListener("focus",() => {if (!suppressMapNotesFocus) openMapNotesMenu(trigger);});
  return true;
}

async function openMapNotesMenuFromToolEvent(event) {
  const root=ui.controls?.element;
  const trigger=findMapNotesTrigger(root) ?? event?.target?.closest?.(
    `[data-tool="${MAP_MENU_TOOL}"], [data-name="${MAP_MENU_TOOL}"]`) ?? event?.currentTarget;
  if (openMapNotesMenu(trigger,{focusFirst:true})) return;
  // Some custom Foundry toolbar themes omit identifiable data attributes.
  // A native DialogV2 choice still keeps the three actions usable by click.
  const content=document.createElement("div");
  content.textContent="Choose a Map Notes+ action.";
  const action=await foundry.applications.api.DialogV2.wait({
    window:{title:"Map Notes+",icon:"fa-solid fa-map-location-dot"},
    content,
    buttons:[...MAP_MENU_ITEMS.map(item => ({action:item.action,label:item.label})),
      {action:"close",label:"Close"}],rejectClose:false
  });
  if (MAP_MENU_ITEMS.some(item => item.action === action)) return runMapNotesMenuAction(action);
}

if (globalThis.Hooks) {
  Hooks.once("init", () => {
    CONFIG.queries[PLAYER_QUERY] = handlePlayerNoteQuery;
    CONFIG.queries[VERIFY_QUERY] = verifyPlayerNoteQuery;
    game.settings.register(MODULE_ID, "lastIcon", {
      scope: "client", config: false, type: String, default: ICONS[0][1]
    });
    game.settings.register(MODULE_ID, "lastTint", {
      scope: "client", config: false, type: String, default: "#FFFFFF"
    });
    game.settings.register(MODULE_ID, TUTORIAL_LOCAL_SETTING, {
      scope:"client", config:false, type:Object, default:{}
    });
  });

  Hooks.once("ready", () => {
    void showQuickMapTutorial().catch(error => {
      console.error(`[${MODULE_ID}] Could not start tutorial`, error);
    });
  });

  // Only one discoverable Map Notes+ button in Token Controls. The three
  // actions live in its hover/click submenu, without deactivating the Token
  // layer (which would lose the user's selected tokens).
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user || !controls?.tokens?.tools) return;
    const tools = controls.tokens.tools;
    const first = Math.min(0, ...Object.values(tools).map(t => Number(t.order)).filter(Number.isFinite)) - 1;
    // Preserve legacy tool identifiers for saved macros/third-party callers,
    // but hide the old duplicated icons from the actual toolbar.
    tools.stlQuickMapNote = {
      name:"stlQuickMapNote",title:"Place Map Note (legacy)",
      icon:"fa-solid fa-location-dot",order:first+1,button:true,visible:false,
      onChange:() => armPlacement()
    };
    tools.stlFindQuickNote = {
      name:"stlFindQuickNote",title:"Manage Map Note (legacy)",
      icon:"fa-solid fa-list",order:first+2,button:true,visible:false,
      onChange:() => {void showFindQuickNotes("manage").catch(reportMapMenuError);}
    };
    tools[MAP_MENU_TOOL] = {
      name:MAP_MENU_TOOL,title:"Map Notes+",
      icon:"fa-solid fa-map-location-dot",order:first,button:true,visible:true,
      onChange:event => {void openMapNotesMenuFromToolEvent(event).catch(reportMapMenuError);}
    };
  });

  // SceneControls may re-render or replace just the tools part; rebind the
  // current native button without replacing its markup or altering core tools.
  Hooks.on("renderSceneControls", app => {
    bindMapNotesHover(app);
  });

  Hooks.on("canvasTearDown", () => {
    closeMapNotesMenu();
    if (armedPlacement) armedPlacement();
  });
}
