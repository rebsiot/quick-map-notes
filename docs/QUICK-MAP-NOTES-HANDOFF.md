# New standalone Quick Map Notes — Handoff

**Project:** St. Louis v2
**Module ID:** `stl-quick-map-notes`
**Release:** v0.1.5 (2026-10-15)
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
- Current immutable-version ZIP path in repository: `dist/stl-quick-map-notes-v0.1.5.zip` (reflected in manifest download URL).
- `.github/workflows/release.yml` validates source and ZIP, runs automated tests, and publishes versioned GitHub releases.
- No module ID/schema change. Uploaded icons in module persistent storage are *not* part of releases.
- This package has not been deployed or live-tested in the user's Foundry world.

## v0.1.1 change (2026-10-15)

- User requested Quick Map Note under the top **Token Controls** (person icon) instead of Journal Notes; it is a single GM-only button, not a duplicated control.
- Only the `getSceneControlButtons` injection target changed from `controls.notes.tools` to `controls.tokens.tools` (plus version/release metadata). Placement, dialogs, permissions, native document contracts, and icon storage unchanged.
- Automated Node mock tests check the new location, absence in Notes, GM-only access, missing Token Controls, and pointer placement. Live Foundry v14 toolbar verification remains pending.

## v0.1.3 change (2026-10-15)

- Existing Journal dropdown now shows a grouped tree using disabled folder headings and indented entries, honoring nested Folder ancestors and grouping unfiled Journals.
- Filter imported module Journals using Foundry v14 `_stats.compendiumSource` and `game.packs` packageType (with `game.modules` fallback), and module-authored Journals explicitly tagged with creation markers. Do not exclude arbitrary user Journals simply because other modules have attached flags.
- Journals originating from **world** and **system** compendia stay eligible. Module-created world Journals with stripped/unmarked provenance may still be visible; identifying those requires the relevant module's actual provenance contract, not guesses.
- Filtering and grouping occur only in `buildJournalOptions`; native Journal permissions, folder membership, document IDs, and creation/linking APIs remain unchanged. No existing world document migration.
- Automated tests increased from 13 to 18 (v14 provenance, module flags, multi-level folder sorting, malformed folder data, actual dialog integration). Live Foundry checks pending.
- Versioned ZIP is `dist/stl-quick-map-notes-v0.1.3.zip`, manifest URL remains stable. Continue this standalone module's numbered conversation once officially registered in `00-START-HERE.md`.

## v0.1.3 change (2026-10-15)

- Excluded the Rules Reference from existing-Journal picker by recognizing rules-library folder names anywhere in the folder ancestry (including nested pages), matching standalone Rules Reference index titles, and explicit Rules Reference compendium provenance. This solves rules pages copied to the world with blank compendium source metadata when their folder is labeled Rules Reference.
- Keep other campaign/world/system Journals eligible and folder indented. Hide empty library-only folder headings. No world Journal or Note mutations.
- Player-access question raised: current module remains GM-only both for toolbar and actual writes. Enabling player note creation requires a separately designed GM-authorized creation bridge and access restrictions; not silently enabled in v0.1.3.
- Automated checks: syntax plus 21 mock tests. Real Foundry v14 filtering and multi-client visibility still require live checks.
- GitHub v0.1.3 release uses stable manifest URL and versioned ZIP; release run and asset must be verified. Preserve persistent image storage on upgrades.

## v0.1.4 — Player notes and `Party Map Notes` folder (2026-10-15)

**Intent:** Players get the Quick Map Note button in Token Controls. GM workflow remains unchanged. The player dialog offers Personal or Shared with Party, not arbitrary existing Journals or GM permissions.

**World data:** One new Journal + single text Page per note and native Scene Note; folder tree `Party Map Notes/Personal` or `Party Map Notes/Shared with Party`, created on demand by the active GM client. No auto-migration of historical Notes/Journals or imports. The root folder with a matching name is reused, as are existing child folders.

**Ownership:** Personal `default:0, creator:3`. Party `default:2, creator:3`. GM retains effective full access. Non-creators may read party notes but cannot edit them; normal Foundry Journal OWNER lets the creator edit. Actual page inheritance `ownership.default:-1` follows parent. Source flags `stl-quick-map-notes.playerCreated` and `.playerScope` identify created entries but do not replace native ownership. GM-made notes continue independent of these folders.

**Authorization:** Player client uses `User.query` to contact active GM. GM sends a fresh random challenge to the claimed player's connected client; that client returns the challenge only if there is a pending locally initiated request with the matching 256-bit request ID. GM checks player Scene, map coordinates, scope, icon and description before any write. No generic `game.socket` broadcast and no player world-document create grant. Query `stl-quick-map-notes.createPlayerNote`; query `stl-quick-map-notes.verifyPlayerNote`. The client must stay connected throughout creation. Player-uploaded raster icons are limited to 512 KB and have MIME/signature validation; GM icon upload remains 5 MB. This is pending live two-player verification.

**Release:** v0.1.4 module ID unchanged. 32 Node mock tests + syntax, plus ZIP CRC/build checks. GitHub Actions release and actual live verification are separate. Preserve module persistent storage, world Notes, new Journal folder and permissions on upgrade or rollback.

**Update shared docs after live check:** Add independently numbered component conversation to `00-START-HERE.md`, and note new native Journal folder/ownership and active-GM query dependency in `GLOBAL-02`, deployment smoke checks in `GLOBAL-03`, and verified status in `GLOBAL-04`.

## v0.1.5 — One Journal per Scene, explicit per-Page permissions

- **Design correction requested:** Keep one Journal named after the map under root `Party Map Notes`, with each new player map note as its own Page. Player Personal versus Shared-with-Party permissions are Page-specific; parent Journal remains Observer for all players and has no player OWNERS.
- **Document contract:** New player Journal `flags.stl-quick-map-notes.playerMapJournal=true`, `.playerMapSceneId=Scene.id`, ownership `{default:2}`, folder direct child of `Party Map Notes`. Pages have `flags.stl-quick-map-notes.playerCreated=<player id>`, `.playerScope=personal|party`, `.playerMapSceneId` and native ownership `{default:0 or 2, [authorId]:3}`; Scene Notes reference both `entryId` and `pageId`. Flags are for grouping only, not permissions.
- **Safety:** Never absorb or alter unflagged same-name world Journals or migrate v0.1.4 entries. Parent Journal permission modification raising a player to OWNER or removing general Observer access blocks further notes and requires GM review. Existing v0.1.4 `Personal` and `Shared with Party` folders/entries stay in place.
- **Async concurrency:** Per-Scene creation queue serializes Journal lookup/create and Page append, plus separate global root-folder creation queue. No player document creation privileges or broadcast socket payloads; v0.1.4 targeted User.query verification remains.
- **Error behavior:** A native Page remains for manual GM review if its map pin creation fails, avoiding loss of description text.
- **Testing:** 37 isolated Node mock tests and packaging CRC; **live Foundry v14 Journal Page permissions, map pin visibility and author-only Page editing require explicit two-player test**. No claim of live success.
- **Further work:** If requested later, offer separate previewable migration of legacy individual Journals into per-Scene Pages, with backup/rollback and no silent permission changes. Do not implement migrations automatically.
- **Shared document notices:** `00-START-HERE.md` should assign formal module/thread, and `GLOBAL-02`, `GLOBAL-03`, `GLOBAL-04` should note per-Page permission contract, required live multiplayer test, and unverified status respectively.


## v0.1.6 — Fix false parent-Journal permission rejection (2026-10-15)

- **Observed by user:** v0.1.5 displayed `The map Journal permissions changed` when adding another Page, although the player was an Observer of the map Journal. The v0.1.5 check required `ownership.default === 2` and forbade *any* explicit OWNER, including GM. This made valid explicit Observer grants and GM overrides fail.
- **Fix:** `findPlayerMapJournal` keeps Scene-ID / managed-folder safety checks but authorizes the requester via `JournalEntry.testUserPermission(user, "OBSERVER")` where available, with an ownership fallback in mocks. For Personal notes only the author needs parent Observer; for Shared with Party notes every player must be able to observe it. Explicit GM OWNER on the parent does not block, but non-GM OWNER remains disallowed to prevent private Page exposure. All changes apply during authenticated GM-side `User.query` player creation.
- **UI constraint:** A player Observer cannot use Foundry native Journal `Add Page`. The supported way to add another note/page is **Quick Map Note** under Token Controls, which privately asks the active GM to create the Page and Scene Note. Do not grant Journal OWNER to 'fix' the missing native Add Page button. Personal page is `{default:0,[creatorId]:3}`; party page `{default:2,[creatorId]:3}`.
- **Data:** No migration, automatic Journal ownership changes, reparenting, deletion, or import of module source content. Existing v0.1.5 Journal/Page/Scene Note IDs and names remain stable. No cross-module API changes.
- **Tests:** 42 Node mock tests including consecutive pages, GM-owned override, explicit player-Observer grants with default NONE, native permission method precedence, no-access and parent OWNER rejection. ZIP validated locally. **Live multiplayer validation pending** (especially privacy of Personal pages and map pins).
- **Shared docs:** At next handoff sync update `00-START-HERE` owning module/conversation and `GLOBAL-02`, `GLOBAL-03`, `GLOBAL-04` for this native Page contract and live verification status.


## v0.1.7 - First-login Quick Tutorial (2026-10-16)

- **Feature scope:** On each user's first world login with the updated module, show a three-step Quick Map Notes tutorial via native v14 `DialogV2.wait`. Step 1 locates the Token Controls tool, step 2 covers title/icon/tint, step 3 covers GM Journal visibility or player Personal/Shared-with-Party Page visibility and the requirement for an online GM. Closing early does not set a preference. "Don't show again" appears only on the final step.
- **Persistence:** Preferred storage is user-level Foundry flag `User.flags.stl-quick-map-notes.tutorialDismissed`; it is world-account-specific and syncs across browsers. If `User.setFlag` is denied, store a per-user key in hidden `scope:client` setting `stl-quick-map-notes.tutorialDismissedUsers` instead; this fallback is per-browser, not server synchronized. One user's dismissal never suppresses a different account sharing the browser.
- **Replay:** A subtle `Quick tutorial` button appears inside the normal map note creation Dialog, not as a duplicate Token Controls tool. Forced replay never clears or resets the preference. Active tutorial promise prevents simultaneous duplicate popups.
- **Unchanged:** Player query authorization, identity challenge, Page permission model, native Scene Notes, per-Scene Journal grouping, versioned icon storage, GM creation and Journal-filtering behavior. No world Journal/Note migrations or permissions updates.
- **Tests:** Syntax and 48 Node mock tests pass; package checksum/CRC checks and GitHub Actions planned. Real player/GM login rendering, User flag writes and client fallback remain pending live testing.
- **Release / continuity:** v0.1.7 release update in `module.json` and complete ZIP. The owner remains standalone `stl-quick-map-notes`; assign its formal numbered handoff entry in `00-START-HERE.md` if not already present. Shared GLOBAL files should note login UI test if they are updated in their authoritative conversation.
