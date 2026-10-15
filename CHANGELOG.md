# Release Notes

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
