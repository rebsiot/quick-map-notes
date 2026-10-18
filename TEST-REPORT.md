# AFT Map Notes+ v0.1.11 - Test Report

**Baseline:** AFT Quick Map Notes v0.1.10, GitHub source commit `3d3798266477a5e895e466ea8bbb4a6765d2aaea`, release ZIP SHA-256 `0a1eaca92f0fdbf764ab09de008f708a649d748bb5e628ae86502880fdf08b6a`, 58,053 bytes. ZIP's script, README and manifest Git blob hashes match the repository. Installed world version not confirmed.

**Change:** Only user-facing branding to **AFT Map Notes+**, version/ZIP URL, plus tests and documentation. Action names and internal module ID `stl-quick-map-notes` remain stable. There is no Journal/Scene migration, token movement, pin deletion or permissions modification on update.

## Automated / package checks

- `node --check scripts/main.mjs`: passed.
- `node --test tests/quick-map-notes.test.mjs`: 65/65 passed; all existing GM/player creation, manager, token action and permissions mocks retained.
- Manifest `id`, `title`, `version`, `download`, complete ZIP archive CRC/content check and private-data exclusion: passed locally.
- GitHub workflow, exact released asset and branch/tag identity: must be verified separately after publication.

## Confirmed live

None for v0.1.11. Previous live issue reports and mock tests are not proof of production functionality. No installed source or multiplayer test available in this environment.

## Next live test

1. With the backed-up v14 Foundry world open, verify **Game Settings > Manage Modules** lists **AFT Map Notes+** once and existing notes remain accessible.
2. Open **Token Controls > Find / Manage Quick Notes** on a Scene with notes, pan to one note, and verify **Place Quick Note** still works.
3. With a GM and two player clients, verify private Page/pin/title visibility, Scene Journal reuse and refresh/reconnect; confirm players cannot delete pins or move unauthorized tokens.

## Upgrade and rollback

Back up the Foundry world and persistent uploaded images. Update the same module using the unchanged manifest URL; refresh all clients. The full v0.1.10 ZIP can restore previous code; restoring world documents after user-created/delete/move actions requires a separate matching world backup.

**Status:** S2 packaged beta until the required live Foundry multiplayer tests pass.
