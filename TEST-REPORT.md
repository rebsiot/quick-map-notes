# STL Quick Map Notes v0.1.1 — Test Report

**Date:** 2026-10-15  
**Target:** Foundry VTT v14.  
**Evidence level:** Automated/mock-tested only; no live Foundry server or browser available in this session.

## Automated checks

- `node --check scripts/main.mjs` — PASSED.
- `node --test tests/quick-map-notes.test.mjs` — 13 PASSED, 0 failed (Node.js v22). Tests cover placement in Token Controls rather than Journal Notes, GM-only visibility, unavailable control fallback, capture-and-Escape placement flow, dialog markup intent, all permission presets, specific-user exclusions, escaped text content, native Note payload, icon/tint/size, existing Journal preservation, failure retention, upload path generation, upload-failure safety and GM-only enforcement.
- `module.json` parses as valid JSON and has ID/version, Foundry v14 compatibility, `persistentStorage: true`, assets and entrypoint.
- Bundled SVG icons parse as valid XML with the standard SVG namespace.

## Still requires live testing

1. Native Quick Map Note button shows under Token Controls (person icon) and not under Journal Notes; click captures exactly one map coordinate.
2. Rendered DialogV2 fields accept color and selected user permissions; browse and local file upload both function.
3. Uploaded file URL from `FilePicker.uploadPersistent` resolves for players and persists after manual module update.
4. Player tests confirm GM-only, pin-only (LIMITED), readable (OBSERVER), and per-user permissions, including Page-level inheritance.
5. Verify rendered tint with selected white SVG and uploaded multicolor PNG, with and without tint.
6. Verify `global` pin respects Journal ownership while ignoring token visibility.
7. Disable module, reload browser, confirm Notes and Journal documents survive.
8. Verify other modules (Scene Library imported Journals in particular) remain unaffected.

**Do not declare Confirmed Live until tested on the user's Foundry v14 + WoD20 environment.**

## GitHub distribution checks (2026-10-15)

- Verify the GitHub `module.json` manifest and downloadable ZIP exist and match version `0.1.1` after upload.
- GitHub Actions release workflow outcome requires separate verification.
- A successful repository upload/CI job does **not** confirm live Foundry functionality.
