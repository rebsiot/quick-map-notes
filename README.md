# AFT Map Notes+

Place map pins quickly and store the notes in native Foundry Journals. Players can keep notes Personal or share them with the party; GMs can create and manage notes with their normal Foundry permissions.

**Foundry:** v14 (system-independent) | **Module ID:** `stl-quick-map-notes` | **Status:** Packaged beta; live multiplayer privacy testing is outstanding.

## Player quick start

1. Open a Scene and select the **person icon (Token Controls)** in the left toolbar.
2. Click **Place Quick Note** (map pin), then click the point on the map.
3. Enter a title and description. Choose **Personal** (only you and the GM) or **Shared with Party** (everyone can read; you and the GM can edit).
4. Optionally choose/upload an icon and select its color and size. Click **Create Map Note**.
5. Find your note as a Page in the Journal named for that map, under **Party Map Notes**. Add more pins with **Place Quick Note**.

A **GM must be online** when a player creates a map note. Players use the Quick Map Note button to add Pages; they do not need ownership of the whole map Journal.

## GM quick start

1. Open a Scene, then choose **Token Controls > Place Quick Note** and click the map.
2. Enter the note details and choose an icon/color if desired.
3. Choose who can see it: **GM Only**, **See Pin**, **Can Read**, or **Specific Players**. You can also link an eligible existing Journal without changing its permissions.
4. Create the note. Manage its linked Journal/Page and pin using Foundry's native controls.

## Find and manage notes (players and GMs)

In **Token Controls** (the person icon), the **Find / Manage Quick Notes** list button is now the **first tool**, beside **Place Quick Note**. Click it to open a searchable window that stays open while you pan or move tokens. It opens even when a map has no visible notes.

1. **Pan** next to a note to center the view on its map pin without moving anything.
2. **Move selected** relocates your currently selected, controllable tokens as a group to that pin. You can select tokens while the window is open and click **Refresh list** to update the movement buttons. This is direct teleportation, not pathfinding or collision-checked movement.
3. **Delete Pin** (GM only) asks for confirmation and removes **only the map pin**. Its linked Journal Entry and Page stay intact. The list refreshes afterward.

**Refresh list** reloads the current Scene's notes without closing the window. Players only see notes visible to them and accessible through their Journal and Page permissions. GMs can also manage saved Scene pins that are not currently drawn as canvas placeables. If no eligible notes are found, the manager shows an empty-list message instead of silently failing to open.

## First-login tutorial

Each user is offered a **three-step guide** on first login. The final screen has **Don't show again**, saved per Foundry user where possible (with a browser-local fallback). The **Quick tutorial** link in the note dialog reopens it later.

## Requirements and installation

This module targets Foundry VTT v14 and has no game-system dependency.

1. Back up the **Foundry world** (Journals, Scene Notes, Pages and ownership settings) and the module's persistent icon storage before updating.
2. In **Foundry Setup > Add-on Modules**, use **Install Module** or **Update Modules**. For manual installation, paste this manifest URL:

   `https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json`

3. Enable **AFT Map Notes+** under **Game Settings > Manage Modules** in the intended world; reload connected browsers.

For manual ZIP replacement, stop Foundry and install the complete folder at `Data/modules/stl-quick-map-notes`. Preserve persistent uploaded images and existing world data.

## Beta limitations

The module has passed automated/mock tests, **not** the full Foundry v14 multiplayer privacy test. Before using private player notes for sensitive information, test with a GM and two players: Page ownership, private pin/title visibility, adding a note to an existing Scene Journal, and refresh/reconnect. Earlier player permission errors have occurred; automated checks cannot establish the live behavior. The Find/Manage window, GM-only Delete Pin confirmation, and direct token move also require a live v14 toolbar/canvas/permission test.

Updating this release does **not** migrate or alter existing Journals, Pages, pins, IDs, flags, or saved tutorial preferences. This update changes only user-visible naming; the internal module ID, note data and permissions remain unchanged. Restore the [v0.1.10 package](https://github.com/rebsiot/quick-map-notes/releases/tag/v0.1.10) to roll back the code. To undo world edits made during play, restore a matching world backup separately.

## More information

- [Permission model and technical guidance](docs/PERMISSIONS-AND-TESTING.md)
- [Changelog](CHANGELOG.md)
- [Latest releases](https://github.com/rebsiot/quick-map-notes/releases)
- [Report a problem](https://github.com/rebsiot/quick-map-notes/issues)
- [MIT license](LICENSE) (see the original license text for attribution)

No campaign notes, licensed creator maps, or user-uploaded images are included in this module's public ZIP.
