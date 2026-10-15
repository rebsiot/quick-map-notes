# STL Quick Map Notes v0.1.5 — Test Report

**Release date:** 2026-10-15  
**Target:** Foundry VTT v14, native Scene Notes / JournalEntry / JournalEntryPage  
**Evidence:** Automated mock/syntax and package integrity only. Not verified live on a Foundry v14 server.

## Local and CI checks

- `node --check scripts/main.mjs` — passed.
- `node --test tests/quick-map-notes.test.mjs` — **37 passed, 0 failed**.
- ZIP built with Foundry's expected root `stl-quick-map-notes/module.json` and intact icons, JS, docs and tests; verified ZIP CRC and manifest version/URL.

## Behaviors covered by mock tests

- GM remains able to create native Journal+Page+pin or link permitted existing Journals; Rules Reference/import filters remain in place.
- Player requests remain private to the active GM with client-specific identity challenge, Scene/position/contents constraints, and scope checking; arbitrary GM Journal access rejected.
- One Scene-named, flagged Journal per Scene under **Party Map Notes**, identified by **Scene ID**, not display name. No accidental reuse of unflagged GM Journals.
- Each player note creates exactly one Page with explicit page-level ownership (private author-only or party-readable author-editable), and each native Scene Note references its pageId. Parent Journal remains Observer without non-GM OWNER rights.
- Shared and personal notes coexist as Pages in one Journal, with separate author ownership.
- Simultaneous requests from the same Scene and from two different Scenes reuse the correct Journals/root folder without duplicates.
- Tampered/moved parent Journals block new writes rather than silently resetting permissions; failed map pin creation leaves the new Page for review.
- Existing v0.1.4 documents and their flags are never migrated, rewritten or deleted.

## Required live verification (GM + Alice + Bob)

1. Back up the **world** and module persistent icon storage; upgrade to v0.1.5 and refresh all clients.
2. Alice creates a **Personal** note on Maryland Heights; confirm `Party Map Notes > Maryland Heights > [page]` and correct pin/page link. Bob must see **neither the private Page nor pin/title**; GM can read/edit.
3. Bob creates a **Shared with Party** note on the same Scene. Confirm only **one** `Maryland Heights` Journal; Alice can read Bob's page but cannot edit; Bob can edit it. Alice can still edit only her own private Page, not the Journal itself.
4. Alice creates a note on a second Scene; it creates a distinct Journal named after that Scene. Old `Personal` and `Shared with Party` Journals and notes remain untouched.
5. Verify icon selection, upload/tint, fog controls and one existing GM-only map note. Ensure party visibility does not reveal GM notes.
6. Test a multiplayer refresh/reconnect. Confirm Page permissions remain enforced in Journal sidebar, map pin labels and direct Page links.

**Risk:** Foundry v14 Page ownership and native map-pin visibility enforcement are not simulated accurately by JavaScript mocks. Do not use personal pages for secrets until live privacy checks pass.

## Rollback

Restore module v0.1.4 source/ZIP without deleting world documents or persistent icon storage. Rolling back program code does **not** revert new Journals/Pages; restore matching pre-update world backup if a complete data rollback is required.
