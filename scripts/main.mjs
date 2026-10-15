/**
 * STL Quick Map Notes v0.1.0 — Foundry VTT 14, system-agnostic.
 *
 * Deliberately uses native Scene Note and JournalEntry documents. It does not
 * override core notes, Journal permissions, or Scene Library imports.
 */

const MODULE_ID = "stl-quick-map-notes";
const VERSION = "0.1.0";
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

const OWNERSHIP = Object.freeze({ NONE: 0, LIMITED: 1, OBSERVER: 2 });
const ALLOWED_UPLOADS = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
});
const MAX_FILE_SIZE = 5 * 1024 * 1024;

let armedPlacement = null;

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

function iconValid(path) {
  return Boolean(path?.trim()) && !/^(?:javascript:|data:)/i.test(path.trim());
}

function playerUsers() {
  return Array.from(game.users ?? []).filter(user => !user.isGM);
}

function buildDialogContent() {
  const storedIcon = game.settings.get(MODULE_ID, "lastIcon");
  const storedTint = hexColor(game.settings.get(MODULE_ID, "lastTint"));
  const preset = ICONS.find(([_, path]) => path === storedIcon)?.[1] ?? "custom";
  const optionHtml = ICONS.map(([label, path]) =>
    `<option value="${escapeHtml(path)}" ${preset === path ? "selected" : ""}>${escapeHtml(label)}</option>`
  ).join("");
  const journals = Array.from(game.journal ?? []).sort((a,b) => a.name.localeCompare(b.name));
  const journalOptions = journals.map(j => `<option value="${escapeHtml(j.id)}">${escapeHtml(j.name)}</option>`).join("");
  const players = playerUsers();
  const playerRows = players.map(u => `
    <div class="stl-qmn-player-row">
      <span>${escapeHtml(u.name)}</span>
      <select name="perm_${escapeHtml(u.id)}">
        <option value="0">Hidden</option>
        <option value="1">See pin</option>
        <option value="2">Read</option>
      </select>
    </div>`).join("");

  return `<div class="stl-qmn-form">
    <div class="stl-qmn-grid">
      <label class="stl-qmn-field stl-qmn-full"><span>Title / map label</span>
        <input type="text" name="title" maxlength="120" placeholder="e.g. Old Warehouse" required autofocus></label>
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
      <p class="stl-qmn-help stl-qmn-full">Visibility is still limited by Journal permissions. White icons tint most accurately; full-color uploads are multiplied by the tint, or can keep their original colors.</p>
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
    const existing = Boolean(journalSelect.value);
    $("#stl-qmn-existing-info").hidden = !existing;
    $("#stl-qmn-description-group").hidden = existing;
    $("#stl-qmn-visibility-group").hidden = existing;
    if (existing && !titleInput.value.trim()) {
      titleInput.value = game.journal.get(journalSelect.value)?.name ?? "";
    }
  }
  function syncVisibility() {
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
  journalSelect.addEventListener("change", syncJournal);
  visibility.addEventListener("change", syncVisibility);

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
    if (!ALLOWED_UPLOADS[file.type] || file.size > MAX_FILE_SIZE) {
      ui.notifications.warn("Use a PNG, JPEG, WebP, or GIF image no larger than 5 MB.");
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
export async function createQuickMapNote({scene, at, form, uploadedFile = null, users = [], upload = uploadNewIcon}) {
  if (!game.user?.isGM) throw new Error("Only a GM can create Quick Map Notes.");
  if (!scene) throw new Error("There is no active Scene.");
  const linkedId = String(form.existingJournal ?? "").trim();
  const existing = linkedId ? game.journal.get(linkedId) : null;
  if (linkedId && !existing) throw new Error("The selected existing Journal no longer exists.");
  const title = String(form.title ?? "").trim() || existing?.name || "";
  if (!title) throw new Error("Enter a title for the new map note.");

  const preset = String(form.iconPreset ?? ICONS[0][1]);
  let icon = preset === "custom" ? String(form.customPath ?? "").trim() : preset;
  if (uploadedFile) icon = await upload(uploadedFile);
  if (!iconValid(icon)) throw new Error("Choose a valid icon, browse an image, or upload one.");

  const tint = form.applyTint ? hexColor(form.tint) : "#FFFFFF";
  const players = users.filter(u => !u.isGM);
  const choices = Object.fromEntries(players.map(u => [u.id, form[`perm_${u.id}`] ?? 0]));
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
    const result = await createQuickMapNote({scene, at, form, uploadedFile: state.uploadFile, users: playerUsers()});
    try {
      await Promise.all([
        game.settings.set(MODULE_ID, "lastIcon", result.icon),
        game.settings.set(MODULE_ID, "lastTint", result.tint)
      ]);
    } catch (settingError) {
      console.warn(`[${MODULE_ID}] Failed to remember icon preferences`, settingError);
    }
    ui.notifications.info(`Created map note: ${result.note?.text ?? result.journal.name}`);
  } catch (error) {
    console.error(`[${MODULE_ID}] Unable to create map note`, error);
    ui.notifications.error(`Quick Map Notes: ${error.message}`);
  }
}

/** Capture next canvas click before PIXI placeables react; Escape cancels. */
function armPlacement() {
  if (!game.user?.isGM) return;
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

if (globalThis.Hooks) {
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, "lastIcon", {
      scope: "client", config: false, type: String, default: ICONS[0][1]
    });
    game.settings.register(MODULE_ID, "lastTint", {
      scope: "client", config: false, type: String, default: "#FFFFFF"
    });
  });

  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user?.isGM || !controls?.notes?.tools) return;
    controls.notes.tools.stlQuickMapNote = {
      name: "stlQuickMapNote",
      title: "Quick Map Note",
      icon: "fa-solid fa-location-dot",
      order: Math.max(0, ...Object.values(controls.notes.tools).map(t => Number(t.order) || 0)) + 1,
      button: true,
      visible: true,
      onChange: () => armPlacement()
    };
  });

  Hooks.on("canvasTearDown", () => {
    if (armedPlacement) armedPlacement();
  });
}
