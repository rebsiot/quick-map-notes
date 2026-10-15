# STL Quick Map Notes v0.1.6

**Foundry VTT:** v14 (system independent; intended for the St. Louis M20/V20 world)  
**Module ID:** `stl-quick-map-notes`  
**Verification:** Automated/mock tested; v0.1.5 permission failure was user-reported, but v0.1.6 is not yet live multiplayer verified.

## Install or update

**Stable Foundry manifest URL:**

`https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json`

**Source:** https://github.com/rebsiot/quick-map-notes  
**Release:** https://github.com/rebsiot/quick-map-notes/releases/tag/v0.1.6

1. Back up your **world**, especially Scenes, Notes, Journals, and ownership settings. When manually replacing files, also preserve persistent uploaded image storage.
2. In Foundry Setup → **Add-on Modules**, choose **Update Modules** (if already installed), or **Install Module** and paste the manifest URL.
3. Launch the world, enable **STL Quick Map Notes** in **Manage Modules**, and hard-refresh connected browser tabs.
4. Open a Scene, select the **top person icon (Token Controls)**, click **Quick Map Note**, then click the map. Press Escape to cancel positioning.
5. The creation dialog has title, description, icon, Browse/Upload, tint, size, and optional fog-global visibility.

**Manual ZIP installation:** Stop Foundry, extract the complete `stl-quick-map-notes` folder to `Z:\Data\modules\stl-quick-map-notes` (so `module.json` is immediately inside), restart, enable the module and reload. Do **not** delete existing world data or the module's persistent storage.

## Player workflow — v0.1.6

**Adding another page:** Click **Quick Map Note** under Token Controls (person icon), click the map and save. This asks the connected GM to append a Page to the same map Journal. Players are **Observers on the parent Journal**, so Foundry's native **Add Page** control is intentionally unavailable; page creation through this module does not require Journal OWNER permissions. Each author owns only their own Page.

**v0.1.6 permission fix:** Existing map Journals can grant Observer to individual players rather than using default Observer. The module checks effective access (using the native permission API) and accepts GM-specific Owner permissions. It still blocks non-GM OWNER on the parent to protect other players' Personal Pages. For Shared with Party notes, everyone must be able to observe the parent. No ownership grants are automatically modified.

Players have **Quick Map Note** in Token Controls (person icon), just like the GM. They choose **Personal** (only author + GM) or **Shared with Party** (everyone reads; only author + GM edit).

**New player map notes use one Journal Entry per Scene.** The Journal is named after the **Scene/map** and placed directly in the existing or lazily created `Party Map Notes` Journal folder. Every placed note becomes a separate **JournalEntryPage** in that map's Journal. Each map pin links to the specific page with its `pageId`, rather than opening a pile of one-note Journals.

```text
Party Map Notes/
  Maryland Heights/            <-- one native Journal for this Scene
    Old Warehouse              <-- private Page (Alice + GM)
    Meeting Location           <-- shared Page (party reads; Bob + GM edit)
    Investigation Leads        <-- private Page (Bob + GM)
  Downtown Street Map/
    Potential Escape Route     <-- shared Page
```

| Where note is saved | Journal Entry | Page permission | Pin visibility |
| --- | --- | --- | --- |
| Personal | Map Journal: default `OBSERVER` (2) | `default: NONE (0)`, author `OWNER (3)` | Expected: author + GM only |
| Shared with Party | Same map Journal: `OBSERVER` | `default: OBSERVER (2)`, author `OWNER (3)` | Expected: all players with map visibility |

**Permissions live on the native Page, not the parent Journal.** Each note author must be able to observe the map Journal, and all party members need Observer access when adding a Shared with Party Page; ownership of the Journal itself is not granted to players. Page permissions give the author edit access to that page, while preventing other players from seeing personal pages or editing another author's shared page. The GM retains full access. If the Journal's ownership grants a player OWNER, or the intended readers lack Observer access, the module stops appending those pages until a GM reviews it, rather than silently overriding permissions.

**Existing world documents are not reorganized.** Notes and Journals created by v0.1.4 remain in `Party Map Notes/Personal` and `Party Map Notes/Shared with Party` with their existing IDs, links and access. The old subfolders remain in place; this version creates **new notes** directly in per-Scene Journals under the root. Existing GM Journals with the same map name are never reused or modified: reuse requires the module's `playerMapJournal` and `playerMapSceneId` flags and correct root folder.

**An active GM must be online.** Player requests are sent privately to the active GM via Foundry `User.query`, and the GM challenge-verifies the author and validates the viewed Scene, content, and scope before writing. No player is granted general world Journal or Scene creation privileges, and no GM approval popup is needed. Uploads keep v0.1.4's maximums: 512 KB for player raster icons, 5 MB for GM uploads.

**Live verification required:** Confirm the parent Journal shows only the pages a player may read, that personal page titles and linked map pins are invisible to other players, and that the author can edit their own page without being an OWNER of the parent Journal. Automated tests cannot prove Foundry's permission enforcement or browser behavior. If either privacy check fails, revert to v0.1.4 and restore world data from your backup before creating sensitive content.

## GM workflow

The GM's dialog is unchanged: **GM Only**, **Everyone Sees Pin**, **Everyone Can Read**, or **Specific Players** access presets for a new native Journal. The GM may instead choose an existing world Journal without modifying its permissions or content. That selector shows indented Journal folders, excludes identifiable module-created/imported entries, and excludes **Rules Reference** trees and entries. Module imports with stripped and unrecognizable provenance may still appear.

GM-created notes are not automatically filed under **Party Map Notes**. Only player-created notes use the new Personal / Shared folders.

## Icons and visibility

- Thirteen built-in options, including twelve original tint-friendly icons and Foundry's book icon.
- **Browse images** uses Foundry's File Picker. **Upload image** uses v14 module persistent storage with randomized filenames.
- Choose icon color (native Note `texture.tint`) or disable tint to preserve the original full-color artwork. Choose 24–80 px icon size.
- Optional **Show pin through fog** sets native Note `global`; it never grants Journal access.
- A note title may be visible to anyone with access to the pin. Avoid putting secrets in party-visible titles.
- Uploaded images are never committed or packaged in the public GitHub source or release.

## Data safety, rollback, known limitations

- Creates only native Scene Notes, Journal Entries, Journal Pages and the top-level **Party Map Notes** folder for player notes; preserves original Scene Library packs, world Scenes, imported Journals and existing pin IDs.
- **No migration** or mass permission changes. Existing personal/shared folders and their entries remain where they are. New player notes use one flagged Journal per Scene and one Page per note. Disabling the module does not remove them.
- Back up world data before upgrading. To roll back program code, restore the previous module ZIP or revert to v0.1.4. To reverse *world data changes*, restore the matching world snapshot: downgrading code does not undo Journal/Page creations.
- Preserve `storage/` in the module's persistent storage on manual upgrade/remove. Existing Notes may reference these uploaded images.
- New text is escaped plain text in native HTML Journal Pages; rich editing is available afterward in the Journal sheet.
- Player page edits are governed by native Foundry permissions. The author has OWNER of their Page, not the parent Journal. GM can delete/edit Notes and Pages; deleting a pin does not automatically delete its Page or Journal.
- **Unverified live:** Foundry v14 multi-client per-Page privacy/visibility and editing, map pin visibility for private pages, `User.query` round-trip, and remote image loading. These need real GM + at least two player clients.

## Developer checks / releases

```sh
node --check scripts/main.mjs
node --test tests/quick-map-notes.test.mjs
python3 tools/build_release.py
```

Each version updates `module.json`, changelog, tests, and `dist/stl-quick-map-notes-vX.Y.Z.zip`. Commit source and ZIP together. GitHub Actions checks the ZIP and tests, then publishes a versioned GitHub Release. Keep the **manifest** URL stable. The module's standalone source is separate from Scene Library, Player Actions, Dice and Paradox modules.
