# AFT Quick Map Notes v0.1.9 - Test Report

**Source baseline:** `rebsiot/quick-map-notes` published v0.1.8, exact commit `b817feea85af37fda3a36b1e732049d8618bb3b3`; local v0.1.8 release ZIP SHA-256 `319e83145b4399e401da07fc6fa963549ea55e03bee792b8d1cc285bedbc06e8` verified. Installed/working live version unknown.

**Scope:** Add adjacent Place/Find buttons to native Token Controls, an accessible/current-Scene finder using native NotesLayer pan, and explicit selected-token relocation via native Scene update. Preserve the older creation toolbar key, all existing documents, module ID, storage/flags and user preferences. No migration.

## Automated/mock-tested

- `node --check scripts/main.mjs`: passed.
- `node --test tests/quick-map-notes.test.mjs`: 59/59 tests passed.
- New tests cover v14 tool ordering; current Scene and visible note filtering; per-Journal and per-Page permissions; title escaping; pan and stale note checks; selected token grouping, snapping, boundary handling, owner/lock checks, and one native Token update only after explicit move; finder dialog event wiring.
- Complete ZIP archive: `zipfile.testzip`, manifest ID/version/download URL, packaged runtime files and bundled icons; exclude private user data, paid art, credentials and old internal handoff from release ZIP.
- GitHub Actions/publication verification are separate from local mock testing.

## Live Foundry v14 tests - NOT YET RUN

- Confirm both adjacent tools appear under Token Controls in a GM and player client; creation still works.
- With GM + Alice + Bob, verify the finder hides Alice's Personal pin/title from Bob, honors fog and shows party pages. Reload/reconnect and repeat.
- Verify searching and panning to near and far native notes on the current Scene, including core Foundry Notes created outside this module.
- GM selects two Tokens, moves them to a note, confirms relative positions, grid snapping, in-bounds placement and no unexpected side effects. Check that Pan alone does not edit any Token.
- Player tries a permitted token and one unauthorized token. Unauthorized/mixed selection must fail without movement. Confirm no movement path, walls, collisions or cost checks are implied.
- Re-test append-to-existing Scene Journal, Page editing and tutorial dismissal.

## Rollback

Back up the entire world and module persistent uploads before updating. Restore the published v0.1.8 module ZIP for software rollback. World Token coordinates changed during play, or notes created after updating, are native world state and require normal undo/manual reposition or restoration from a matching world backup; reverting code does not reverse them.

**Readiness:** S2 packaged beta, not yet confirmed safe live. Publication does not establish installation, world enabled status or permission safety.
