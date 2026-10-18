# AFT Map Notes+ v0.1.12 — Test Report

**Source baseline:** GitHub `rebsiot/quick-map-notes` at tag `v0.1.11`, commit `c09a6f04f1635de5ad419105cecd7f98f67cc504`. The verified v0.1.11 release ZIP was 58,073 bytes, SHA-256 `683a587526d88610ba279924dd6251b97dd38c41b86f47b7ede13c151bb5df94`. The installed Foundry version was not accessible for inspection.

**Change:** The two visible Token Controls buttons are replaced by one **Map Notes+** button with a three-action hover/focus/click menu. **Place Map Note** keeps the existing map-click creation process; **Find Map Note** has Pan only; **Manage Map Note** retains Pan, Move selected and GM-only confirmed Delete Pin. The former tool identifiers remain hidden compatibility aliases. No world data, document flags or permissions are migrated.

## Automated / mock checks

- `node --check scripts/main.mjs`: passed.
- `node --test tests/quick-map-notes.test.mjs`: **72 passed, 0 failed**.
- New tests cover exactly three submenu actions, one visible native toolbar button, hover positioning and closing, Escape/focus handling, outside-click and Scene cleanup, click/touch fallback, Find-only buttons and event rejection of a forged Manage action, plus preserved GM deletion and token movement contracts.
- Full ZIP archive CRC, expected entry points, versioned download URL, preserved module ID, license, package file list and exclusions: verified in packaging checks.
- GitHub Actions, remote tag/release asset, and manifest checks must be recorded separately after publication.

## Foundry live checks: not run

No actual Foundry v14 session or installed module files were available for this change. Before relying on the new interface, test the Map Notes+ hover and click menu, then Place, Find/Pan and Manage/Move/Delete in a backed-up GM world. With two player clients, also test Personal versus Shared Journal Page ownership, private pin/title visibility, Scene Journal reuse, refresh/reconnect, and inability to move unowned tokens or delete pins. A passing automated/mock test is **not** evidence of live privacy enforcement.

## Upgrade and rollback

Back up world data and persistent uploaded icon storage separately. Update the same `stl-quick-map-notes` module using its unchanged manifest URL. Revert to the complete v0.1.11 module ZIP for code rollback. Restore a matching world snapshot to undo any notes or token movements performed during use; rolling back code does not undo world document changes.

**Status:** S2 packaged beta pending required live Foundry v14 verification.
