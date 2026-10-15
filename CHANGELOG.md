# Release Notes

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
