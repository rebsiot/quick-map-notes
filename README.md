# AFT Quick Map Notes

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

## Find a note (players and GMs)

Under the **person icon (Token Controls)**, **Place Quick Note** and **Find Quick Note** are adjacent buttons. Foundry v14 does not support nested tool buttons in that palette.

1. Click **Find Quick Note** (magnifying glass) to see a searchable list of map notes on the current Scene. Players only see notes they can currently see and have permission to access (including Page permissions and fog/vision).
2. Click **Pan** by a note to move your view to its pin. You can pan among multiple notes without closing the list.
3. Optional: **select your token(s) first**, then open Find and click **Move selected** beside a note. This directly relocates only tokens you are allowed to move, preserving their relative positions. It does **not** navigate around walls, check collision, or calculate movement cost. Moving and panning are separate actions.

Notes on other Scenes, inaccessible private Page titles, and notes concealed by the current player's vision/fog are not shown in the player's Find list. The GM can find all drawn native map notes on the active Scene, not just pins created by this module.

## First-login tutorial

Each user is offered a **three-step guide** on first login. The final screen has **Don't show again**, saved per Foundry user where possible (with a browser-local fallback). The **Quick tutorial** link in the note dialog reopens it later.

## Requirements and installation

This module targets Foundry VTT v14 and has no game-system dependency.

1. Back up the **Foundry world** (Journals, Scene Notes, Pages and ownership settings) and the module's persistent icon storage before updating.
2. In **Foundry Setup > Add-on Modules**, use **Install Module** or **Update Modules**. For manual installation, paste this manifest URL:

   `https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json`

3. Enable **AFT Quick Map Notes** under **Game Settings > Manage Modules** in the intended world; reload connected browsers.

For manual ZIP replacement, stop Foundry and install the complete folder at `Data/modules/stl-quick-map-notes`. Preserve persistent uploaded images and existing world data.

## Beta limitations

The module has passed automated/mock tests, **not** the full Foundry v14 multiplayer privacy test. Before using private player notes for sensitive information, test with a GM and two players: Page ownership, private pin/title visibility, adding a note to an existing Scene Journal, and refresh/reconnect. Earlier player permission errors have occurred; automated checks cannot establish the live behavior. The new finder and direct token move also require a live v14 toolbar/canvas/permission test.

Updating this release does **not** migrate or alter existing Journals, Pages, pins, IDs, flags, or saved tutorial preferences. The internal module ID and display title remain unchanged. Restore the [v0.1.8 package](https://github.com/rebsiot/quick-map-notes/releases/tag/v0.1.8) to roll back the code. To undo world edits made during play, restore a matching world backup separately.

## More information

- [Permission model and technical guidance](docs/PERMISSIONS-AND-TESTING.md)
- [Changelog](CHANGELOG.md)
- [Latest releases](https://github.com/rebsiot/quick-map-notes/releases)
- [Report a problem](https://github.com/rebsiot/quick-map-notes/issues)
- [MIT license](LICENSE) (see the original license text for attribution)

No campaign notes, licensed creator maps, or user-uploaded images are included in this module's public ZIP.
