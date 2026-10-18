# AFT Quick Map Notes v0.1.10 - Test Report

**Verified baseline:** `rebsiot/quick-map-notes` v0.1.9 at exact commit `036d722548b575202c912597ffc5977c704e97f6`. Local published 55,021-byte ZIP SHA-256 `ed42d98e04d3d1aafcb01bc9f2decf83d1c9407c53d6304d4bc70cc819e380dc`. Current installed live build not accessible.

**Scope:** Surface Find/Manage at top of Token Controls, keep manager open with zero notes, provide refresh, add GM-only confirmed Scene pin deletion, and include saved undrawn Scene Notes in GM list. Continue to use native v14 Note/Scene/Journal APIs. No world migration; preserve the module ID `stl-quick-map-notes`.

## Automated/mock-tested

- `node --check scripts/main.mjs`: to run.
- `node --test tests/quick-map-notes.test.mjs`: to run.
- Mock regression coverage: toolbar order, empty manager, search/refresh/pan/move, page privacy, GM saved-Note fallback, GM deletion confirm/cancel, player deletion blocked, HTML escaping and stale requests. Existing creation and tutorial tests retained.
- Full ZIP CRC, embedded manifest and installation folder, license, icons, CSS and contents: to verify.

## Confirmed live

**Not tested** on user's Foundry v14 world. User reported v0.1.9 list panel was not visible; the code audit verified that v0.1.9 returned early without opening the window when its note list was empty and placed Find at the bottom of Token Controls. This report does not assume the exact cause of the user's live failure was established.

## Next live tests

1. Update a backed-up Foundry world to v0.1.10 and confirm **Find / Manage Quick Notes** is the first tool below the person icon.
2. Open the manager on a Scene with and without pins. Confirm that both display the window, Refresh list works, and saved notes appear for the GM.
3. Pan to a saved note, select two tokens and use Move selected; confirm correct permission checks and token formation.
4. As GM, delete a disposable pin, test Cancel separately, confirm the Journal Entry and Page survive and the deleted pin disappears. The world snapshot allows recovery.
5. As two distinct player clients, verify Personal/Shared Page visibility, private pin/title redaction, and that players cannot delete pins; repeat after refresh/reconnect.

## Backup and rollback

Back up world documents and persistent uploaded images separately. Restore v0.1.9 module code to roll back this release; to undo actual Scene Note deletion or Token moves, restore a matching world backup. No automatic data migrations.

**Status:** S2 packaged beta until real multiplayer tests pass. Publishing is not live deployment.
