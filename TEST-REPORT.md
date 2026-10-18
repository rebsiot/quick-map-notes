# AFT Map Notes+ v0.1.13 - Test Report

**Baseline:** Verified `rebsiot/quick-map-notes` GitHub v0.1.12 at commit `3a9206ec334d435560ab8d1bea83cf5b4973a8c1`; ZIP 62,871 bytes, SHA-256 `1c7b097f72d5bf50bff13b6d309f16c82558459a8c99fbcfff6f5778e12c8d37`. The source and module manifest inside the ZIP were inspected. The user's actual installed build remains uninspected; a user-reported screen behavior is not proof of its exact source.

## Scope

Reported live regression in v0.1.12: on moving off Map Notes+, the Journal Notes tool palette remains selected instead of returning to Token Controls. Fix is limited to local control-layer restoration after hover dismissal/menu actions or a toolbar rerender; selected tokens can be locally reselected when lost, using normal native permission checks. Intentionally switching to another toolbar is respected. No world-document schema, Journal/Page permissions, map-pin data, or scene/token coordinates change during installation.

## Automated and mock-tested

- `node --check scripts/main.mjs`: passed.
- `node --test tests/quick-map-notes.test.mjs`: **80 passed; 0 failed**. New regressions cover v14 `SceneControls.activate({control:'tokens',tool:'select'})`, preservation of selected native Tokens, hover-leave timing, action dispatch while Notes is active, restoration when Scene Controls re-renders, deliberate outside toolbar clicks and keyboard focus changes (no forced restoration), other layers and Scene mismatch (no forced restoration), and an early Notes state at hover opening.
- Existing native Journal, page visibility, player/GM permissions, pin lifecycle, token grouping, Find/Manage windows, and legacy control IDs remain covered by the preexisting tests.
- ZIP contents: complete module, versioned manifest, runtime files, CSS, icons, docs, license and tests; `unzip -tq` and manifest/package parity check must pass at release time.

## Foundry live tests

- **Regression observation:** User reported the previous v0.1.12 behavior in a live Foundry session.
- **Fix live test:** Not run. Hover Map Notes+, move off without selecting a command, confirm the green Token Controls selection and the Select Tokens tool remain active; repeat after Find > Pan and after Place > Cancel. Select two tokens before opening and verify they remain selected.
- **Remaining security test:** GM plus two players: Personal/Party Journal Page ownership, hidden pin/title visibility, updating existing Scene Journal, refresh/reconnect, authorized token movement and GM-only Delete Pin.

## Backup and rollback

Back up world Journals/Pages, Scene Notes, token positions, and the persistent uploaded icon storage separately before installing. Existing module ID/flags/permissions remain unchanged; there is no migration. Restore v0.1.12 code as needed. Code rollback does not reverse any actual token movement, journal edits, or pin deletions during play; use a matching world backup to reverse those.

**Status:** Automated/mock-tested packaged beta. No live confirmation of the v0.1.13 fix.
