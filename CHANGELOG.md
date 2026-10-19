# Release Notes

## v0.1.14 - 2026-10-18

- **Changed:** In Token Controls, **Map Notes+** is placed after the first five visible tools (approximately sixth) instead of always appearing first. If a smaller tool palette has fewer than five existing tools, Map Notes+ appears at the end. Hidden compatibility aliases do not take up visible positions.
- **Preserved:** Place / Find / Manage hover actions, token toolbar restoration, selected-token handling, GM-only deletion, Journal/Page permissions, IDs, icons, saved notes and user preferences remain unchanged. No migration or changes to other modules' tool orders.
- **Upgrade:** Back up your world and the module's persistent icons, then update the module and refresh Foundry clients. Restore v0.1.13 for code rollback; module downgrade does not reverse edits made to world data during play.
- **Testing:** Node automated/mocked tests cover sixth-slot ordering, small tool palettes, hidden tools, native-tool order preservation and repeat rendering. Actual Foundry v14 toolbar placement, hover menu operation and the GM + two-player privacy test remain **live-unverified**. Packaged beta.

## v0.1.13 - 2026-10-18

- **Fixed:** Leaving the **Map Notes+** hover menu no longer leaves players or GMs stuck on the Journal Notes toolbar when the menu was opened from Token Controls. The module uses Foundry v14's native `SceneControls.activate` to return to **Token Controls > Select Tokens** if Notes became active.
- **Selection:** Recover the tokens selected when the Map Notes+ menu opened if Foundry cleared that selection during an unexpected layer transition; retain any newer selection instead of overwriting it.
- **Respect user choice:** Clicking another toolbar intentionally is not undone. The repair does not switch unrelated control layers (Walls/Lighting/etc.) or run after a Scene change. Find/Manage actions remain separate; no changed Journal or pin permissions.
- **Preserved:** Same **AFT Map Notes+** title, module ID `stl-quick-map-notes`, stable manifest and Place/Find/Manage workflow. Existing Journals, Pages, Scenes, Notes, IDs, flags, uploaded icons, tutorial state and token data are not migrated or altered on installation.
- **Before upgrading:** Back up the Foundry world and persistent icons; use **Update Modules** then refresh all clients. Restore full v0.1.12 ZIP to revert code if needed. Restoring code never reverses world edits made in play.
- **Verification:** 80/80 Node automated/mock tests, syntax and complete ZIP integrity passed. A user reported the v0.1.12 toolbar problem in live Foundry; the v0.1.13 fix itself remains unverified in the user's live Foundry v14 world, as does GM + two-player note privacy. Packaged beta.

## v0.1.12 - 2026-10-18

- **Changed:** **Map Notes+** is now one Token Controls button. Hover, focus, or click to choose **Place Map Note**, **Find Map Note**, or **Manage Map Note**. This preserves the Token Controls selection layer while using the menu.
- **Find versus Manage:** Find has a searchable current-Scene list and **Pan** only. Manage retains the searchable list, **Pan**, permitted **Move selected**, and GM-only confirmed **Delete Pin**. Both provide Refresh list, including empty maps.
- **Preserved:** Place creates the same native Journal/Page and Scene pin as before. Existing Notes, Journal ownership/permissions, token positions, IDs, flags, uploads, tutorial dismissals, module ID and stable manifest are unchanged. Hidden legacy toolbar IDs remain available for compatibility; there is no automatic migration.
- **Upgrade:** Back up the Foundry world and persistent uploaded icons, update through the existing manifest, and reload clients. Restore v0.1.11 for code rollback; world edits made after installation need a separate matching world backup.
- **Testing:** Node automated/mock checks and ZIP integrity only. Hover-menu rendering in real Foundry v14, Find/Manage permissions, selected-token moves, GM deletion, and two-player private-page/pin visibility remain live-unverified. Packaged beta.

## v0.1.11 - 2026-10-18

- **Renamed:** Foundry's Manage Modules list and new GitHub release now use **AFT Map Notes+**. The manager/tutorial window branding matches. The existing **Place Quick Note** and **Find / Manage Quick Notes** action labels remain familiar.
- **Unchanged:** Module ID `stl-quick-map-notes`, stable manifest URL, original repository, functionality, permissions, Scene Notes, Journal Entries/Pages, flags, uploaded icons and tutorial dismissal choices. No migration or world writes on installation.
- **Update:** Back up world data and persistent icon storage, update through Foundry Setup and refresh browsers. Restore the v0.1.10 ZIP to roll back code; actual world edits require their own backup.
- **Verification:** Automated tests and ZIP validation; no live Foundry v14 / two-player privacy verification. Remains a packaged beta.

## v0.1.10 - 2026-10-18

- **Fixed:** Find / Manage Quick Notes is now the first tool under Token Controls (person icon), not buried at the bottom. Opening it always shows the current Scene's management window, including when there are no visible notes.
- **Added:** Refresh list, including updated token selection counts. GMs can see saved Scene Notes even when the note canvas layer has not drawn their placeables.
- **Added:** GM-only **Delete Pin** on each row. Each deletion requires an explicit confirmation and removes only the native Scene pin. The linked Journal and Page remain intact. Players cannot delete pins through this window.
- **Preserved:** Pan and Move selected remain separate actions, using existing permissions. No changes to existing Scene Notes, Journal IDs/Pages, privacy flags, uploaded icons, or module ID on installation.
- **Update and rollback:** Back up the world and persistent icon storage. Update via the existing Foundry manifest, then refresh clients. Restore the full v0.1.9 module ZIP to roll back code; restoring a matching world backup is necessary to reverse actual token or pin deletions made after the upgrade.
- **Testing:** 65/65 Node mock tests plus ZIP manifest/content validation (no live server). Actual v14 manager opening, visibility, deletion, token movement and GM-plus-two-player privacy still require a live check. Packaged beta, not live-certified.

## v0.1.9 - 2026-10-18

- **Added:** Two adjacent Token Controls tools: **Place Quick Note** (the prior creation workflow) and **Find Quick Note** (search native visible map notes on the current Scene and pan to a pin).
- **Added:** Optional **Move selected** per note, relocating only the user's selected, permitted tokens as a group. The separate action keeps formation and stays in map bounds; it is direct relocation, not pathfinding or collision avoidance.
- **Privacy:** Players' lists respect current map-note visibility plus both Journal Entry and Page permissions. Private note titles are excluded when unavailable to the player. No note/permission migration.
- **Preserved:** AFT title, module ID, Journal Pages, original pin data, icon uploads, user flags, tutorial dismissal, active-GM player-note creation, and native data IDs. No existing-world documents are rewritten by installation.
- **Upgrade:** Back up the world and persistent icons, update via Foundry's existing manifest, and refresh clients. Restore v0.1.8 for code rollback; restore a world backup to undo token movements or other world edits.
- **Testing:** 59/59 Node mock tests and package integrity checks passed. Live Foundry v14 tool layout, privacy/vision, pan, and authorized token movement still require GM + two-player testing; release remains a packaged beta.

## v0.1.8 - 2026-10-18

- **Changed:** Module Manager now lists the addon as **AFT Quick Map Notes** instead of **STL Quick Map Notes**, making it easier to find alongside other AFT modules.
- **Documentation:** Player/GM quick starts now lead the README; the detailed permission model and test instructions are in separate documentation. The first-login tutorial remains unchanged.
- **Preserved:** Module ID `stl-quick-map-notes`, repository, stable manifest, world data and flags, icons, permissions, and all existing note workflows. No automatic migration or change to enabled/disabled state.
- **Before updating:** Back up the world and module persistent image storage. Use Foundry's module updater, restart or reload as appropriate. Revert to v0.1.7 if needed; restoring older code does not undo world-document edits.
- **Tests:** Automated/mock and package checks only; GM plus two-player privacy, existing-Scene-Journal and reconnect testing still required in live Foundry v14.


## v0.1.7 - 2026-10-16

- **Added:** First-login three-screen Quick Map Notes tutorial for each user, with player- and GM-specific instructions. Covers Token Controls placement, icon/tint/upload, map Journal Pages and private/party visibility.
- **Added:** Final **Don't show again** action; stores the preference on the user's native Foundry User flag. If User flags are not writable, falls back to a per-user browser setting. Close/Not now does not permanently suppress the guide.
- **Added:** A small **Quick tutorial** link in the note-creation dialog reopens the guide even after dismissal. Avoids cluttering primary Token Controls with a second toolbar button.
- **Preserved:** Native Journal/Scene Note data, player Page ownership, GM-mediated creation, map Journal grouping, user-created assets and all module IDs/flags. No migration of world content.
- **Testing:** 48 Node mock tests and syntax check; ZIP/package verification; GitHub Actions release validation. Foundry v14 UI behavior and user-flag writes for real player accounts are still unverified.
- **Upgrade/rollback:** Back up the world and persistent icon storage. Update using the stable manifest; existing notes and saved user tutorial preferences remain intact. To roll back, restore v0.1.6 module files; no world-note migration was performed.

## v0.1.6 — 2026-10-15

- **Fixed:** On a subsequent player map note, the existing Scene Journal lookup no longer rejects valid native Observer permissions simply because they were granted per player rather than as the Journal default. An explicit GM Owner entry is also recognized as safe. This fixes the v0.1.5 red toast `The map Journal permissions changed` in these cases.
- **Permissions model unchanged:** Players still use **Quick Map Note** in Token Controls to add another Page. The connected GM creates the embedded Page via authenticated `User.query`; players do not need (and must not receive) OWNER on the map Journal. Native Journal **Add Page** is still not available to Observers. Each Page retains explicit Personal/Party ownership, and each map pin retains its Page ID.
- **Safety:** A non-GM OWNER on the parent Journal remains blocked to avoid exposing private Pages. A player must be able to observe the parent to create a Personal Page; a Shared with Party Page additionally requires Observer access for every player. Uses Foundry `testUserPermission` when available; does not change permissions or existing Journal/Note/Page data automatically.
- **Preserved:** Stable module ID and manifest URL, Journal-per-Scene grouping, GM workflow, icons, upload storage, existing folders/Journals/Pages/Notes, and Rules Reference filtering. No migration.
- **Tests:** 42 isolated Node mock tests plus syntax and package CRC/source checks. User supplied live screenshot of v0.1.5 failure; v0.1.6 multiplayer permission/pin privacy **has not been live verified**.
- **Upgrade/rollback:** Back up world and module persistent storage; use existing GitHub manifest's update path. Restore v0.1.5 code to roll back the program; rollback does not remove any world documents created after upgrade.


## v0.1.5 — 2026-10-15

- **Player Scene Journal organization:** One native Journal Entry per Scene, named after the map and filed directly in `Party Map Notes`. Each newly created player note becomes a dedicated JournalEntryPage linked to its native map pin. Uses Scene ID flags to avoid collisions with campaign/GM Journals of the same name.
- **Native per-Page permissions:** Parent map Journal is OBSERVER for everyone; Personal pages are NONE to party / OWNER to creator; Shared with Party pages are OBSERVER to party / OWNER to creator. GM controls all. No arbitrary Journals are linked or made writable by players.
- **Concurrency and safety:** Concurrent requests for the same map reuse one Journal. The root folder is also serialized across different Scene requests; no automatic permissions rewrite, migration, deletion or moving existing v0.1.4 Personal/Shared entries. If a map Journal was moved or ownership was raised to player OWNER, further writes stop until GM reviews it. A failed pin write retains its Journal Page.
- **Preserved:** GM-only/per-player Journal picker and Rules Reference filter, Token Controls, icon chooser/upload/tint, active-GM authentication, all existing Notes/Journals and persistent icon files.
- **Checks:** Node syntax and 37 isolated mock tests; release ZIP CRC/source validation. **Live Foundry player permissions and pin privacy have not been verified.** Test with two player clients before sensitive personal notes.
- **Install/rollback:** Back up matching world and module persistent storage. Update through unchanged GitHub manifest; restore v0.1.4 code if needed. World Journals/Pages created under v0.1.5 remain until manually removed or restored from a matching world backup.


## v0.1.4 — 2026-10-15

- **Player access:** Added Quick Map Note to player Token Controls, reusing the GM icon/tint and map-click workflow. Normal player creation requires an active GM client.
- **Player note sections:** Players choose **Personal** (only the creator and GM can read/edit) or **Shared with Party** (everyone reads; creator and GM edit). The player dialog no longer exposes arbitrary existing Journal selection or granular GM-style permissions.
- **Folder organization:** Player-created native Journals automatically file under `Party Map Notes/Personal` or `Party Map Notes/Shared with Party`. Folders are created lazily, reused across notes, and never reorganize existing Journals.
- **Security:** A native `User.query` challenge addressed to the claimed user verifies each creation request before the active GM writes anything. GM revalidates Scene, position, note text, icon and section; no player receives general world Journal/Scene write access. Private note text is sent only to GM, not broadcast. Player icon upload limit 512 KB; GM remains at 5 MB.
- **Unchanged:** GM permissions/Journal picker, Rules Reference exclusion, icons, native Notes/Pages, module ID and persistent upload storage. GMs can edit or delete player notes using standard Foundry tools.
- **Tests:** 32 isolated Node mock tests plus syntax check; GitHub Actions validates the release artifact separately. Live Foundry multiplayer tests **not yet performed**.
- **Upgrade/rollback:** Back up world and icon storage; update through the stable GitHub manifest. Disabling or downgrading the module does not remove the new folders, Notes or Journals; undo their creation from a matching world backup if required.


## v0.1.3 -- 2026-10-15

- **Fixed:** Excluded Rules Reference entries from **Use an existing Journal**, including imported rules-library folders/subfolders whose provenance is unavailable. Also recognizes Rules Reference titles and compendium-source IDs.
- **Preserved:** All ordinary campaign Journals remain selectable in their folder hierarchy. Native Notes/Journals, world data, permissions, file uploads, and Token Controls placement remain unchanged.
- **Players:** Remains GM-only. Player-created notes require a separate controlled workflow and are not enabled by this update.
- **Tests:** Node syntax + 21 isolated mock tests passed, including rules-library paths with missing provenance and preservation of campaign entries. GitHub CI checks the release bundle.
- **Verification:** Awaiting live Foundry confirmation. If a local Rules Reference uses a different folder name or has no identifying metadata, its name/source must be inspected to extend the filter.
- **Upgrade/rollback:** Update through existing GitHub manifest or full v0.1.3 ZIP; back up world and module persistent-storage folder. No data migration; return to v0.1.2 if necessary.


## v0.1.2 -- 2026-10-15

- **Changed:** The existing-Journal selector now follows the world Journal folder hierarchy with indented nested folder headings and alphabetical/numeric journal order. Only folders with eligible Journals are displayed; unfiled entries are grouped separately.
- **Filtered:** Module-origin Journals are removed from the selector when identified by Foundry v14 compendium provenance or explicit module creation markers. Includes Journals generated by this module. World/system compendium imports and campaign-authored Journals are retained.
- **Preserved:** This changes the selection list only; existing Journals, Notes, pages, permissions and uploaded icon storage are not modified or migrated. The Token Controls toolbar button and note creation workflow remain unchanged.
- **Known limitation:** Module-created world Journals without recorded provenance cannot be identified reliably and may remain listed. Folder presentation and provenance filtering are mock-tested, not yet live Foundry verified.
- **Install/rollback:** Use the stable GitHub manifest or complete v0.1.2 ZIP; back up world and module persistent storage. Restore v0.1.1 if needed; no data migration is performed.
- **Automated tests:** Node syntax validation and 18 mock tests passed; GitHub CI verifies the released ZIP.
- **Live Foundry/browser tests:** Not yet run.


## v0.1.1 — 2026-10-15

- **Changed:** Moved the single **Quick Map Note** button from Journal Notes to the primary **Token Controls** (person icon) toolbar, for quicker access during normal GM work.
- **Unchanged:** Clicking the button arms one map click, followed by the same Note/Journal creation dialog, permissions, icon upload/tint and size choices. The action remains GM-only.
- **Preserved:** No world data migration; existing Notes/Journals and module persistent image storage remain untouched. No duplicate button left in the Journal Notes tools.
- **Install/upgrade:** Use the stable GitHub manifest URL in the README and Foundry's Update Modules function, or install the complete v0.1.1 ZIP. Back up your world and preserve existing persistent icon storage before manually replacing modules.
- **Rollback:** Disable/restore the previous module version; native Notes/Journals persist. Restore world snapshots only if you need to undo world document edits.
- **Automated tests:** Syntax + 13 Node mock tests passed; release workflow separately validates the ZIP.
- **Live verification:** Not yet performed on a running Foundry v14 client.
- **Known limitations:** Native Note/Journal visibility and upload behavior remain subject to live Foundry verification.

## v0.1.0 — 2026-10-15

- **Added:** One-click placement workflow under native Journal Notes controls, with cancel via Escape.
- **Added:** Create a native Journal and a linked Scene Note in one dialog; or link to an existing Journal without modifying its permissions.
- **Added:** GM-only, visible-pin-only, readable, and per-player Journal ownership presets.
- **Added:** Bundled tintable icons, native File Picker browsing, image uploads using v14 module persistent storage, icon color/tint, and size.
- **Added:** Optional native `global` note visibility (independent of Journal permissions), safely escaped plain-text Journal pages.
- **Preserved:** Scene Library and all existing Journals/Notes; no migration or automatic overwrites.
- **Upgrade/rollback:** Back up your world; install as an independent module; disabling it leaves native documents intact. Uploaded files are separate from source folder.
- **Automated/mock tests:** Run as described in `README.md`; results reported on delivery.
- **Live Foundry tests:** Not yet run.
- **Known issues:** Native right-click UI remains the route to edit existing pins; existing Journal ownership cannot safely be changed note-by-note; real v14 client interaction and storage must be smoke-tested.

### GitHub distribution (2026-10-15)

- Added official GitHub repository, a stable Foundry manifest URL and versioned ZIP download URL.
- Added GitHub Actions automation for test validation and versioned release publishing.
- No gameplay, Note/Journal schema or permission behavior changes.
