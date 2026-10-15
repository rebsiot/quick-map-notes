# STL Quick Map Notes v0.1.3

**Target:** Foundry VTT v14 on Ubuntu; WoD20 `worldofdarkness` compatible because this tool is system-independent. **Status:** syntax and mock tested only; not installed or live-tested in the user's world.

## Purpose

One new tool under the primary **Token Controls** (person icon, first toolbar) in the Scene Controls. Click **Quick Map Note**, click a point in the Scene, and use one dialog to create a native map Note linked to a newly created native Journal Entry. Choose its player permissions, icon, uploaded image, icon tint, icon size, and fog visibility. Default is GM-only.

## Install or update from GitHub (recommended)

**Manifest URL (paste into Foundry VTT Install Module):**

`https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json`

Source code: https://github.com/rebsiot/quick-map-notes  
Versioned module ZIP: https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/dist/stl-quick-map-notes-v0.1.3.zip

1. Back up the Foundry world. Preserve the module's `storage/` folder if it exists before replacing any module directory.
2. In Foundry **Add-on Modules > Install Module**, paste the manifest URL and install.
3. Enable **STL Quick Map Notes** in the intended world, and reload the browser.
4. For later updates, use Foundry's module update mechanism: the stable manifest always points to the current versioned ZIP.

**This v0.1.1 release has mock/syntax tests only; verify permissions and uploads live before campaign use.** The GitHub repository is public; do not commit campaign Journal contents, private notes, licensed art, uploaded files or persistent storage.

## Manual installation

1. **Back up your Foundry world first** (world Scenes and Journal Entries) and, on upgrades, the module's persistent `storage/` folder if present. If a folder `Z:\Data\modules\stl-quick-map-notes` already exists, back that up separately; do not overwrite a previously customized installation without inspecting it.
2. Stop the Foundry server.
3. Extract the complete folder `stl-quick-map-notes` to `Z:\Data\modules\stl-quick-map-notes`. Ensure `module.json` is **inside that folder**, not nested beneath another folder.
4. Restart Foundry; enable **STL Quick Map Notes** in the intended world under Manage Modules.
5. Hard-refresh the Foundry browser. Go to a Scene, select **Token Controls** (person icon at the top of the left Scene Controls), and click **Quick Map Note** (location-dot icon). No need to switch to Journal Notes.
6. Click the desired point on the Scene; enter a title, optional description, permissions, icon/tint and press **Create Map Note**.

## Icon choices

- Pick from 12 bundled original, tint-friendly monochrome icons or Foundry's book icon.
- **Browse images...** opens Foundry's native File Picker. Its built-in upload button can also add an existing image to user data where permissions allow.
- **Upload image...** selects a local PNG/JPEG/WebP/GIF file (up to 5 MB). On Save, the file is uploaded using Foundry v14 `FilePicker.uploadPersistent` to this module's persistent storage. Unique filenames protect existing icons from overwrites. The resulting path is referenced in the Scene Note texture; the binary is **not** embedded in the Journal.
- Tint is `texture.tint` on the native Note. Disable **Apply tint** to preserve original image colors (`#FFFFFF` neutral tint).
- Uploads remain server-side until removed by an administrator; canceling before Save does not upload.

## Linking an existing Journal

In **Use an existing Journal (optional)**, the dropdown displays ordinary world Journals under their parent folders and nested subfolders, with indented folder headings. Only folders containing eligible entries are shown; unfiled Journals appear separately. Folders are headings, not selectable entries. The chosen Journal is still linked without changing its contents or permissions.

To keep the selector focused on campaign-authored content, it **omits identifiable module-supplied Journals**: documents imported from a module compendium (using Foundry v14 `_stats.compendiumSource` and package metadata), plus module-generated Journals that explicitly mark their origin (including Journals created by Quick Map Notes). Imported content from world-owned or system packs is not automatically removed. Ordinary user Journals remain available even if a module has added unrelated flags to them.

**Rules Reference excluded:** The picker also omits all Journals under a folder named **Rules Reference** (including **M20 Rules Reference**, nested chapters, and similarly named variants), plus journals identified by an explicit Rules Reference compendium source or title. This accommodates rules-library entries imported without preserved module provenance. This only affects the dropdown and does not remove any content or change world permissions.

**Limit:** If a module creates a world Journal without preserving source information or a recognized creation marker, Foundry provides no reliable universal way to identify it. Such unmarked entries can still appear. This is display filtering only: the module does not delete, move, rename or alter Journals or folders.

## Permissions / visibility

| Dialog preset | New Journal ownership | Expected player experience |
| --- | --- | --- |
| GM only (default) | default `NONE` (0) | No pin or Journal access |
| Everyone sees the pin | default `LIMITED` (1) | Pin and label visible, text page not readable |
| Everyone can read | default `OBSERVER` (2) | Pin and text page readable |
| Specific players | default `NONE`, per-player `LIMITED`/`OBSERVER` | Only chosen players see pin / read |

New text pages use `ownership.default = INHERIT (-1)` so that page permissions track the Journal. Note visibility is always enforced by native Foundry access control; no parallel permission system is created. "Show pin through fog" sets native Note `global=true` but **does not** override Journal permissions. Limited users may see a pin's title, so do not put secrets in public-facing labels. A Journal linked in the **existing Journal** dropdown retains all existing permissions and content: the tool will not silently change access to other notes or references. In particular, Limited users of an existing Journal may be able to view image pages; check existing page permissions manually.

## Editing and deleting

Use normal Foundry Notes tools to move, configure, or delete pins and use native Journal permissions for subsequent access changes. Deleting a pin does not delete its Journal. The module does not run any migration and does not alter previously created notes, journals, or Scene Library imports.

## Rollback

Disable the module in Manage Modules. Stop Foundry and remove/restore the module directory if desired. **Do not delete world documents unless you deliberately want to remove them.** Map Notes and linked Journals created by the module are ordinary Foundry documents and remain in the world when the module is disabled. Images uploaded to the module's persistent `storage/` folder are separately managed; do not delete this folder if existing Notes still reference those images. Restore the matching full **world backup** to undo world-document changes.

## Compatibility and known limitations

- Designed against published **Foundry v14** APIs; must be tested live before relying on permissions or uploads in a real session.
- GM-only creation. Player-creation permissions are intentionally out of scope for this initial release.
- New Journal text is plain text escaped into an HTML page (not full rich-text editing); open the native Journal to edit rich text after creation.
- Selecting an existing Journal links to it and leaves its permissions untouched. Change those only through native Journal UI to avoid affecting linked pins/Scenes unexpectedly.
- Uploaded images use Foundry persistent storage, not the module source directory. Verify successful player image retrieval after upload.
- A failed Scene Note create operation does not automatically delete a newly created Journal, to avoid silent destruction. The error identifies the retained Journal.
- Native Notes may be hidden by the user's **Toggle Notes Display** preference or by token vision/fog settings. Each player controls their own Notes Display setting.

## Test status

- `node --check scripts/main.mjs` — syntax check.
- `node --test tests/quick-map-notes.test.mjs` — isolated mock tests for permissions, payloads, failed note behavior, and upload path handling.
- Live Foundry client/server, native FilePicker upload, Notes layer click event, page inheritance, and real-player access: **Not run; must be verified**.

## Project boundaries

This is a **new independent Foundry module** with ID `stl-quick-map-notes`. It does not modify the TC Modern Scene Library, Asset Browser, Player Actions, Paradox, Dice, web character tools, or their document formats. Assign an official numbered handoff/chat entry in `00-START-HERE.md` (not available to this build) when incorporating into the St. Louis v2 project.

## Maintaining the GitHub release

- Develop against the source files in the repository root. Keep the module ID `stl-quick-map-notes` unchanged.
- Run `node --check scripts/main.mjs` and `node --test tests/quick-map-notes.test.mjs` before release.
- For each **new version**, update `module.json` (including its versioned `download` URL), version constants and changelog, then run `python3 tools/build_release.py` to generate `dist/stl-quick-map-notes-vX.Y.Z.zip`.
- Commit source, matching manifest, and the versioned ZIP together. The GitHub Actions workflow validates the package, runs tests and creates the GitHub release `vX.Y.Z` for new versions. An existing published tag/asset is not overwritten.
- The Foundry install/update URL remains the stable raw GitHub `module.json` URL. It is independent of GitHub Actions release availability because it downloads the checked-in versioned ZIP.
