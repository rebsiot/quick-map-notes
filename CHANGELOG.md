# Release Notes

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
