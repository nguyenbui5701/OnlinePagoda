# ONLINE CHURCH — Design Index

> **OWNER DECISION — 2026-11-17:** D-01 **APPROVED**: standalone `nguyenbui5701/OnlineChurch` repository with independent runtime, selectively adapting OnlinePagoda technology. D-04 **APPROVED**: Catholic (Công giáo) identity. The new repository is not yet created/accessibly linked; this is a **temporary Design staging branch**, not permission to merge church code into OnlinePagoda `main`. Remaining interactions, visuals, rollout and complete Design sign-off are pending. See `08_DECISION_LOG.md` and `10_ONLINECHURCH_REPO_MIGRATION.md`.

**Status:** G0 PARTIAL — Catholic & independent repository approved; remaining design choices pending | **Date:** 2026-11-17 | **SA branch:** `sa/onlinechurch-design-v0`

## Purpose and boundary
Design a separate interactive **Nhà thờ Online Công giáo** experience for TikTok LIVE on Windows, using `OnlinePagoda` as the **audited technical reference**, not as a theological or visual template. Never modify or restart the existing pagoda LIVE installation in order to test the church project.

### Baseline examined
- Repo: https://github.com/nguyenbui5701/OnlinePagoda
- Reference commit: `ee55ee81e507135b805d116586f5814eed9a89a9` (2026-11-17)
- `apps/server/src/sources.ts`: separate DEMO/LIVE engines and providers.
- `apps/server/src/tiktok/{provider,mapper,transport}.ts`: connector, validation, room binding, reconnect, gift-streak events.
- `apps/server/src/{engine,app,voice32}.ts`: business state, Socket.IO, dynamic thank-you audio.
- `apps/overlay/src/{main.ts,golden/scene.ts}`: PixiJS 1080x1920 stage and church-incompatible Buddhist assets/ceremonies.
- `apps/dashboard/src/main.tsx`: React operator dashboard.
- `packages/shared/src/{index,gifts,live}.ts`: current types/schemas; many are temple-coupled.
- `scripts/build.mjs`, `docs/DEVELOPMENT.md`, `.gitignore`: build isolation and whitelist.

**Audit limitation:** source inspection only; not a local build, test run, TikTok verification, religious consultation, or copyright clearance. Existing README notes production/E2E has not been reverified on a fresh machine.

## Contents
1. [01_REQUIREMENTS.md](01_REQUIREMENTS.md) — scope, user stories, safeguards, non-functional goals
2. [02_UI_UX.md](02_UI_UX.md) — 9:16 LIVE scene and dashboard specifications
3. [03_ARCHITECTURE.md](03_ARCHITECTURE.md) — isolation options, boundaries, data flow
4. [04_EVENT_CONTRACTS.md](04_EVENT_CONTRACTS.md) — interaction model and failure policies
5. [05_AI_WORK_RULES.md](05_AI_WORK_RULES.md) — SA / AI Code / reviewer contracts
6. [06_VISUAL_AUDIO_BRIEF.md](06_VISUAL_AUDIO_BRIEF.md) — handoff to visual/audio agent
7. [07_TEST_RELEASE_GATES.md](07_TEST_RELEASE_GATES.md) — acceptance and LIVE safety
8. [08_DECISION_LOG.md](08_DECISION_LOG.md) — approved decisions and open sign-offs
9. [09_CATHOLIC_CONTENT_AND_SAFEGUARDS.md](09_CATHOLIC_CONTENT_AND_SAFEGUARDS.md) — Catholic content, imagery and devotional boundaries
10. [10_ONLINECHURCH_REPO_MIGRATION.md](10_ONLINECHURCH_REPO_MIGRATION.md) — independent repository creation and technical porting
11. [11_PHASE_AND_AGENT_HANDOFF.md](11_PHASE_AND_AGENT_HANDOFF.md) — phased tasks and agent handoff

## Phase plan — NOT YET APPROVED
- **G0:** Catholic identity and separate `OnlineChurch` repo **APPROVED 2026-11-17**. Still OPEN: visual style/Marian imagery, exact interaction list, machine deployment and final Design approval.
- **G1:** DEMO scene + visual assets + visitor actions, no TikTok or external TTS dependency.
- **G2:** TikTok event adapter + duplicate/streak safety + operator controls + voice and FX.
- **G3:** Windows separate-instance capture, rehearsal, safeguards, go-live.
- **G4:** optional extensions after actual LIVE observations.

**Task gate:** SA creates `Task/*.md` with exact paths, deliverables, tests, branch and acceptance criteria **only after G0 Design approval**. No implementation task has been authorized by these drafts.

## Safety note
This is an independently authored interactive artwork, **not a real parish/church, clergy, religious service, sacrament, or guaranteed spiritual benefit**. Gifts are optional appreciation and must not buy prayer, blessings, forgiveness, absolution or priority of spiritual care.

## Repository migration status
- Target is `nguyenbui5701/OnlineChurch`, **not created / accessible** on the 2026-11-17 connector check (404). This ChatGPT GitHub connection does not expose a create-repository action.
- Do not merge temporary OnlinePagoda draft PR #1 to its live `main`; transfer Design to the new repository once Owner creates it, then retire the staging PR without merge.
- No `Task/` is issued until the Design gate has been completed in OnlineChurch.
