# AFT Map Notes+

Place map pins quickly and store the notes in native Foundry Journals. Players can keep notes Personal or share them with the party; GMs can create and manage notes with their normal Foundry permissions.

**Foundry:** v14 (system-independent) | **Module ID:** `stl-quick-map-notes` | **Status:** Packaged beta; live multiplayer privacy testing is outstanding.

## Player quick start

1. Open a Scene and select the **person icon (Token Controls)** in the left toolbar.
2. Hover over **Map Notes+** (or click it), then choose **Place Map Note** and click the map.
3. Enter a title and description. Choose **Personal** (you and the GM) or **Shared with Party** (everyone can read; you and the GM can edit).
4. Optionally choose/upload an icon and adjust its color and size. Click **Create Map Note**.
5. Find your note in the Journal named for that map under **Party Map Notes**, or choose **Map Notes+ > Find Map Note** to pan directly to its pin.

A **GM must be online** when a player creates a map note. Players use the Quick Map Note button to add Pages; they do not need ownership of the whole map Journal.

## GM quick start

1. Open a Scene, then choose **Token Controls > Map Notes+ > Place Map Note** and click the map.
2. Enter the note details and choose an icon/color if desired.
3. Choose who can see it: **GM Only**, **See Pin**, **Can Read**, or **Specific Players**. You can also link an eligible existing Journal without changing its permissions.
4. Create the note. Manage its linked Journal/Page and pin using Foundry's native controls.

## Find and manage notes (players and GMs)

Under **Token Controls**, hover over **Map Notes+** to reveal three choices. Click the same icon to open the menu without hovering (useful on touchscreens and for keyboard navigation).

- **Place Map Note** starts the current map-click and Journal/Page workflow.
- **Find Map Note** opens a searchable list of accessible notes on this Scene. **Pan** centers the view on a pin without moving tokens or changing notes.
- **Manage Map Note** opens the searchable list with **Pan** and **Move selected**. Moving relocates your selected, controllable tokens together; it is direct movement, not pathfinding or collision-checking. GMs also see **Delete Pin**, which requires confirmation and removes only the Scene pin, not its Journal/Page.

Both lists offer **Refresh list** and work even when the Scene has no accessible notes. Players see only notes that meet the map visibility and native Journal/Page access checks. GMs can manage saved Scene pins that are not currently drawn on the canvas.

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

The module has passed automated/mock tests, **not** the full Foundry v14 multiplayer privacy test. Before using private player notes for sensitive information, test with a GM and two players: Page ownership, private pin/title visibility, adding a note to an existing Scene Journal, and refresh/reconnect. Earlier player permission errors have occurred; automated checks cannot establish the live behavior. The new hover menu, Find and Manage windows, GM-only Delete Pin confirmation, and direct token move also require a live v14 toolbar/canvas/permission test.

Updating this release does **not** migrate or alter existing Journals, Pages, pins, IDs, flags, or saved tutorial preferences. The existing internal module ID, note data, and permissions remain unchanged. Restore the [v0.1.11 package](https://github.com/rebsiot/quick-map-notes/releases/tag/v0.1.11) to roll back the module code. To undo world edits made during play, restore a matching world backup separately.

## More information

- [Permission model and technical guidance](docs/PERMISSIONS-AND-TESTING.md)
- [Changelog](CHANGELOG.md)
- [Latest releases](https://github.com/rebsiot/quick-map-notes/releases)
- [Report a problem](https://github.com/rebsiot/quick-map-notes/issues)
- [MIT license](LICENSE) (see the original license text for attribution)

No campaign notes, licensed creator maps, or user-uploaded images are included in this module's public ZIP.
