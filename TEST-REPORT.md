# STL Quick Map Notes v0.1.4 — Test Report

**Release:** 2026-10-15  
**Intended runtime:** Foundry VTT v14 (system agnostic)  
**Evidence:** Automated/mock-tested, **not** live Foundry-verified.

## Executed checks

- `node --check scripts/main.mjs` — passed.
- `node --test tests/quick-map-notes.test.mjs` — **32 passed, 0 failed** (Node.js 22 runtime expected in GitHub Actions).
- Journal privacy: personal owner permission and default NONE, party default OBSERVER with creator OWNER.
- Player dialog: only Personal and Shared with Party; no generic existing Journal or GM visibility controls.
- Native folder setup: lazy `Party Map Notes/Personal` and `Party Map Notes/Shared with Party`, automatic reuse, concurrent requests do not produce duplicates.
- New Journal and native Note creation: correct folder IDs, ownership, version/player flags; existing world Journals unchanged.
- GM validation: wrong Scene, invalid icon paths, invalid mode, oversized descriptions, arbitrary existing Journal linkage and unsigned requests rejected before world-document writes.
- Private GM `User.query` request with targeted challenge; pending response is one-time; forged player request rejected.
- Icon binary signature, MIME and size checks; GM-only icon upload path preserved.
- GM regressions: Token Controls, Escape placement cancel, nested Journal list, module/Rules Reference exclusions, native text page, Limited/Observer/GM/selected-player permissions, icon tint and error handling.
- Local release builder validates ZIP CRC and content; GitHub Actions reruns syntax and tests and separately publishes release.

## Required first live multiplayer test

1. Make matching **world and persistent image storage backups**. Update module through stable manifest; hard-refresh the GM and two player browsers.
2. GM sees button on top Token Controls and can create a GM-only note as before.
3. Player Alice sees the same button; make **Personal** note with icon/tint. Check Journal under `Party Map Notes > Personal` and Scene pin. Alice can read/edit; Bob sees **neither**. GM can read/edit/delete.
4. Alice makes **Shared with Party** note; check placement under `Party Map Notes > Shared with Party`. Bob can read but **not** edit; Alice can edit; GM can edit/delete.
5. Bob creates his own Personal note; Alice should not see it. The folder hierarchy must contain one root and just the two subfolders, without duplicates.
6. Player tries custom image (512 KB or less) and GM verifies cross-client image rendering. Confirm only authorized notes appear when **Toggle Notes Display** is enabled.
7. Disconnect GM; player should see the 'GM must be online' warning rather than being granted creation privileges. Reconnect GM and retry.
8. Confirm Rules Reference remains absent from GM existing-Journal selector and player never sees that selector.

**Unverified live:** Folder inheritance/visibility, socket query/challenge delivery, Foundry on-change toolbar API, remote FilePicker upload and token-vision map pin visibility. A passing mock suite or published ZIP is not live success.
