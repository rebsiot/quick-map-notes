# STL Quick Map Notes v0.1.3 -- Test Report

**Date:** 2026-10-15  
**Target:** Foundry VTT v14, independent of the WoD20 game system.  
**Evidence level:** Automated/mock-tested only. The live client and world data were not accessed.

## Automated checks

- `node --check scripts/main.mjs` -- passed.
- `node --test tests/quick-map-notes.test.mjs` -- **21 passed, 0 failed**, Node.js 22.
- Rules Reference filtering: common folder/title variants, descendants whose source metadata is stripped, explicit compendium provenance, no orphan folder headings, and no removal of normal campaign notes.
- Journal selector coverage: deep folder nesting; correct visual indentation and ordering; `Unfiled`; no empty/module-only folder headings; safe escaping for names; Folder references and IDs; cyclic-folder protection.
- Provenance coverage: Foundry v14 `_stats.compendiumSource`; module versus world/system packs; module-owned generated markers; unrelated module flags kept; legacy `core.sourceId` fallback.
- Integration mock confirms the actual creation dialog uses the filtered, folder-indented options.
- Regression coverage: toolbar location under Token Controls and GM-only access, click placement and Escape, native Notes/Journals, permissions, upload handling and safety.
- ZIP package built using `tools/build_release.py`; CRC validation, manifest content check and archive file inventory were run locally. GitHub Actions repeats package and test checks on publish.

## Live verification required

1. Open Quick Map Note from the person/Token Controls menu, then click the map.
2. Open **Use an existing Journal**: verify top-level and nested world Journal folders appear indented and in the proper hierarchy.
3. Verify Journals imported from TC Modern/other module compendiums and previous Quick Map Notes-generated Journals are excluded. Verify **M20 Rules Reference** and its nested pages no longer appear, even when copied into world Journals without original compendium metadata. Verify a manually authored Journal remains selectable.
4. Select an eligible Journal, create a pin and verify it links correctly without mutating the Journal.
5. Confirm preexisting permissions, player visibility, and custom icon uploads/tints still work.

**Known limitation:** Rules Reference filtering recognizes distinctive folder names, Journal titles, and compendium IDs, but cannot infer an unknown alternate folder name with all original module provenance removed. Source provenance cannot be inferred from world documents lacking a module source UUID or recognized module creation marker. The picker may show those unmarked module-created entries.

## GitHub publishing

- Manifest should remain `https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json`.
- Versioned artifact: `dist/stl-quick-map-notes-v0.1.3.zip`.
- GitHub release/CI status must be verified separately after publishing; a passing workflow is not evidence of live Foundry success.
