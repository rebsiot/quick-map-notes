# New standalone Quick Map Notes — Handoff

**Project:** St. Louis v2
**Module ID:** `stl-quick-map-notes`
**Release:** v0.1.2 (2026-10-15)
**Owner:** New independent module conversation. A provisional `16.1 — Quick Map Notes` slot is suggested, subject to `00-START-HERE.md` numbering, which was unavailable at build time.
**Status:** Automated/mock tested only. Not tested or deployed on a live Foundry v14 instance.

## Intent / decisions

- Single obvious tool in primary Token Controls (person icon): tool > location click > concise setup dialog > native Journal and Note. Removed the old location under Journal Notes.
- Permission presets operate on **Journal ownership**, not an auxiliary database or hidden flags. Default GM-only.
- Native icon texture src + tint, bundled icons, custom FilePicker images, direct local upload to module persistent storage.
- Existing Journal may be linked but its permissions/content are never changed by the tool.
- No automated Scene/Journal imports, changes to creator materials, or other modules.

## Data contract

- Scene has ordinary embedded `Note` with `entryId`, optional `pageId`, `texture:{src,tint}`, `iconSize`, `text`, `global`, `x/y`, and an innocuous version flag.
- New Journal has native single text Page with inheritance `ownership.default=-1` and escaped HTML text.
- Module-created journals have an innocuous version flag; neither flag is required for reading Notes without the module.
- Persistent uploaded assets live in the package `storage/` folder, separate from shipped source files; `persistentStorage: true` is declared. Back this folder up during manual reinstall/upgrade.

## Install / smoke test

See README. Live tests before public or campaign reliance:

1. GM creates a secret warehouse note. Second player sees neither pin nor Journal.
2. GM creates a Limited pin. Player sees pin/label but cannot read text page.
3. GM creates Observer pin. Player can open the text page.
4. GM grants access to one specific player, verify another has none (in multiplayer, reload both clients).
5. Choose bundled icon and yellow tint, verify rendered Note texture; upload PNG and ensure path loads on a second player's session.
6. Confirm fog/global option changes vision gating only, not permissions.
7. Link existing Journal; ensure Journal ownership/content unchanged. Remove/disable module; note & Journal survive.
8. Compare with Scene Library imported GM-only Journals; must not expose them inadvertently.

## Rollback / unresolved questions

Do not delete existing world Notes/Journals. Restore a world snapshot to roll back content changes. Recheck module persistent storage before uninstalling uploaded icons.
Verify Foundry v14 actual current build and WoD20 version; verify `uploadPersistent` return and availability, `DialogV2.input` render behavior, scene tool placement under Token Controls, and `texture.tint` behavior. No live success is asserted.

## Shared documents to update after live confirmation

- `00-START-HERE.md`: add new numbered module/thread once numbering is assigned.
- `GLOBAL-02-ARCHITECTURE-DATA-CONTRACTS.md`: record native Notes ↔ Journals ownership and persistent icon storage boundaries.
- `GLOBAL-03-RELEASE-DEPLOYMENT-TESTING.md`: add a real-player Notes permissions/icon-upload smoke test.
- `GLOBAL-04-DECISIONS-ROADMAP-RISKS.md`: add the release and live verification state after actual test.

## GitHub packaging (2026-10-15)

- Repository: https://github.com/rebsiot/quick-map-notes (public).
- Stable manifest: https://raw.githubusercontent.com/rebsiot/quick-map-notes/main/module.json.
- Current immutable-version ZIP path in repository: `dist/stl-quick-map-notes-v0.1.2.zip` (reflected in manifest download URL).
- `.github/workflows/release.yml` validates source and ZIP, runs automated tests, and publishes versioned GitHub releases.
- No module ID/schema change. Uploaded icons in module persistent storage are *not* part of releases.
- This package has not been deployed or live-tested in the user's Foundry world.

## v0.1.1 change (2026-10-15)

- User requested Quick Map Note under the top **Token Controls** (person icon) instead of Journal Notes; it is a single GM-only button, not a duplicated control.
- Only the `getSceneControlButtons` injection target changed from `controls.notes.tools` to `controls.tokens.tools` (plus version/release metadata). Placement, dialogs, permissions, native document contracts, and icon storage unchanged.
- Automated Node mock tests check the new location, absence in Notes, GM-only access, missing Token Controls, and pointer placement. Live Foundry v14 toolbar verification remains pending.

## v0.1.2 change (2026-10-15)

- Existing Journal dropdown now shows a grouped tree using disabled folder headings and indented entries, honoring nested Folder ancestors and grouping unfiled Journals.
- Filter imported module Journals using Foundry v14 `_stats.compendiumSource` and `game.packs` packageType (with `game.modules` fallback), and module-authored Journals explicitly tagged with creation markers. Do not exclude arbitrary user Journals simply because other modules have attached flags.
- Journals originating from **world** and **system** compendia stay eligible. Module-created world Journals with stripped/unmarked provenance may still be visible; identifying those requires the relevant module's actual provenance contract, not guesses.
- Filtering and grouping occur only in `buildJournalOptions`; native Journal permissions, folder membership, document IDs, and creation/linking APIs remain unchanged. No existing world document migration.
- Automated tests increased from 13 to 18 (v14 provenance, module flags, multi-level folder sorting, malformed folder data, actual dialog integration). Live Foundry checks pending.
- Versioned ZIP is `dist/stl-quick-map-notes-v0.1.2.zip`, manifest URL remains stable. Continue this standalone module's numbered conversation once officially registered in `00-START-HERE.md`.
