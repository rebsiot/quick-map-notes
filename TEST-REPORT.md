# AFT Map Notes+ v0.1.14 - Test Report

**Verified source baseline:** `rebsiot/quick-map-notes` v0.1.13, exact GitHub commit `114e199ae23a5758bb66f807e980e552c1a9b7ce`; local release ZIP SHA-256 `d852acccb5e4d9e6e2db041869ae1546f4c313a2cb588eeb3d3cb2aca2169b0e`. The extracted script git blob `2c55dc39dcce63fab0b00c4cd031dc7c6975d63c` matches GitHub. Installed live version is unknown.

## Change

A single visible Map Notes+ icon now requests the sixth tool position in Foundry v14 Token Controls, after five visible tools. It uses a numeric gap between existing tool orders to avoid modifying native or third-party tool records; with fewer than five visible tools, it appends at the end. Legacy hidden tools do not influence the calculation, including on rerender. Tied existing orders stay unchanged, so exact placement may vary in heavily customized toolbars. No Note, Journal, Token or world-data migration.

## Automated/mock tests

- `node --check scripts/main.mjs`: passed.
- `node --test tests/quick-map-notes.test.mjs`: **85/85 tests passed; zero failures**.
- Newly added regression tests verify placement after five visible tools, preservation of native tool order, hidden-tool exclusion, rerender stability, minimal toolbar fallback, tied native order behavior, and no change to Notes toolbar.
- Full ZIP integrity and manifest/runtime parity: passed; 22 package files, no world data or internal handoff included.

## Live Foundry tests

- This new tool order has **not** been tested in the user's live Foundry v14 environment. First verify on the user's actual toolbar that Map Notes+ sits around sixth, the three-option flyout still works, and Token Controls / selected tokens remain selected after hover dismissal.
- GM plus two player clients: verify private Journal Page/pin titles and permission boundaries, existing Scene Journal reuse, refresh/reconnect, authorized token relocation, and GM-only pin deletion. **Not yet run / live unverified.**

## Upgrade / rollback

Back up the world, installed module and persistent uploaded icon storage before upgrading. Use the same module ID and Foundry manifest to update; hard-refresh clients. Code rollback restores the complete v0.1.13 ZIP. If users edit Journals, move Tokens, or delete pins after upgrading, only a matching world backup can reverse those world edits.

**Status:** Packaged beta, automated/mock-tested only until the user confirms live behavior.
