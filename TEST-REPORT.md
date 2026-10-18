# AFT Quick Map Notes v0.1.8 - Test Report

**Source baseline:** `rebsiot/quick-map-notes` v0.1.7 at commit `27029411564afe429ad5f708cb8f5455ad5e6cf2`. The user-provided v0.1.7 ZIP has matching Git blob hashes for the manifest, main script, README, license and tests.

**Scope:** Display-title change, matching package/version metadata and documentation layout. No changes to permissions, Journal/Page creation, socket authentication, map-pin rendering, upload behavior, or tutorial dismissal storage.

## Automated/mock checks

- `node --check scripts/main.mjs`: **passed**.
- `node --test tests/quick-map-notes.test.mjs`: **49/49 passed**.
- Validate `module.json.title = "AFT Quick Map Notes"` and unchanged module ID `stl-quick-map-notes`.
- Run Node syntax checks and the full existing simulated test suite.
- Verify archive contains matching manifest, JS and necessary images, preserves the Foundry module folder ID and passes ZIP integrity checks.
- Verify the release `download` URL and tag match v0.1.8. GitHub release publication is reported separately after remote verification.

These checks do not prove the module was deployed or enabled in a real world.

## Live Foundry v14 tests outstanding

With one active GM and two players, test: Personal Page permissions and visibility; private pin/title secrecy; Shared with Party page visibility and authorship; adding to an existing Scene Journal without parent Owner permissions; refresh/reconnect. Test that **AFT Quick Map Notes** appears in Manage Modules and the checkbox reflects that world's enabled state.

## Rollback

Back up the world and persistent icon storage before upgrading. Restore v0.1.7 if needed. Downgrading the module code alone does not remove or revert Journals/Pages/pins created during use. To reverse world changes, restore a corresponding world backup.
