# STL Quick Map Notes v0.1.4

**Foundry VTT:** v14 (system independent; intended for the St. Louis M20/V20 world)  
**Module ID:** `stl-quick-map-notes`  
**Verification:** Automated/mock tested. Not yet verified on the user's live Foundry server with multiple accounts.

## Install or update

**Stable Foundry manifest URL:**

`https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json`

**Source:** https://github.com/rebsiot/quick-map-notes  
**Release:** https://github.com/rebsiot/quick-map-notes/releases/tag/v0.1.4

1. Back up your **world**, especially Scenes, Notes, Journals, and ownership settings. When manually replacing files, also preserve persistent uploaded image storage.
2. In Foundry Setup → **Add-on Modules**, choose **Update Modules** (if already installed), or **Install Module** and paste the manifest URL.
3. Launch the world, enable **STL Quick Map Notes** in **Manage Modules**, and hard-refresh connected browser tabs.
4. Open a Scene, select the **top person icon (Token Controls)**, click **Quick Map Note**, then click the map. Press Escape to cancel positioning.
5. The creation dialog has title, description, icon, Browse/Upload, tint, size, and optional fog-global visibility.

**Manual ZIP installation:** Stop Foundry, extract the complete `stl-quick-map-notes` folder to `Z:\Data\modules\stl-quick-map-notes` (so `module.json` is immediately inside), restart, enable the module and reload. Do **not** delete existing world data or the module's persistent storage.

## Player workflow — v0.1.4

Players have **Quick Map Note** in **Token Controls**, just like the GM. Their dialog uses one selection:

| Save in Party Map Notes | Who sees the Journal and map pin? | Who can edit the Journal? |
| --- | --- | --- |
| **Personal** (default) | Only the note's creator and GM | Creator and GM |
| **Shared with Party** | All players and GM | Creator and GM; other players can read |

Each player note creates **one native world Journal Entry with one text Page** plus **one native Scene Note**. Players may edit their own entries later from the Journal sidebar. Other players can read shared entries, but cannot edit the author's entry. The GM can edit/delete any player-created Journal or map pin through normal Foundry tools. Deleting a pin does not delete its Journal.

On the **first player note**, the active GM client creates the folder structure automatically:

```text
Party Map Notes/
├── Personal/
│   ├── Alice's private notes (visible to Alice and GM only)
│   └── Bob's private notes (visible to Bob and GM only)
└── Shared with Party/
    └── Party-visible notes (all players can read)
```

Folders are reused for subsequent notes; there is no bulk import or reorganization of existing Journals. Folder name **Party Map Notes** is reused if a matching root-level Journal folder already exists. Entries are protected by their native individual Journal ownership, not a secondary permission database.

**A GM must be connected.** Player requests go privately to the active GM via Foundry's native `User.query` API. The GM verifies the player's identity with a challenge addressed to that player's live client, validates the viewed Scene, contents, icon and selected section, and then creates the native documents. Players are never granted Scene or world Journal creation permission. Their form does not offer GM Journals or arbitrary existing-Journal links. The GM has no approval popup for normal note creation.

For player-uploaded icons, the file is transmitted only to the GM and limited to PNG/JPEG/WebP/GIF of **512 KB**. GM uploads remain limited to **5 MB**. The request and file are validated before write. Player creation depends on an active GM client and must be tested with real accounts before campaign use.

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

- Creates only native Scene Notes, Journal Entries, Journal Pages and **player-note folders**; preserves original Scene Library packs, world Scenes, imported Journals and existing pin IDs.
- **No migration** or mass permission changes. First player note creates its target folder and new documents; disabling the module does not remove them.
- Back up world data before upgrading. To roll back program code, restore the previous module ZIP or revert the module to v0.1.3. To reverse *world data changes*, use a matching world backup; downgrading code does not delete notes/folders created by v0.1.4.
- Preserve `storage/` in the module's persistent storage on manual upgrade/remove. Existing Notes may reference these uploaded images.
- New text is escaped plain text in native HTML Journal Pages; rich editing is available afterward in the Journal sheet.
- Player edits or deletes of Journal documents are governed by native Foundry permissions. **Only GMs** can delete world Journal Entries, but owners may modify their own note's content.
- **Unverified live:** Foundry's v14 token control hook placement, `User.query` round-trip, native permission inheritance inside nested folders, and remote image loading. These need real GM + at least two player clients.

## Developer checks / releases

```sh
node --check scripts/main.mjs
node --test tests/quick-map-notes.test.mjs
python3 tools/build_release.py
```

Each version updates `module.json`, changelog, tests, and `dist/stl-quick-map-notes-vX.Y.Z.zip`. Commit source and ZIP together. GitHub Actions checks the ZIP and tests, then publishes a versioned GitHub Release. Keep the **manifest** URL stable. The module's standalone source is separate from Scene Library, Player Actions, Dice and Paradox modules.
