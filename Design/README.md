# ONLINE CHURCH — Design Index
**Status:** DRAFT — awaiting Owner approval | **Date:** 2026-11-17 | **SA branch:** `sa/onlinechurch-design-v0`

## Purpose and boundary
Design a separate interactive **Nhà thờ Online** experience for TikTok LIVE on Windows, using `OnlinePagoda` as the **audited technical reference**, not as a theological or visual template. Never modify or restart the existing pagoda LIVE installation in order to test the church project.

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
8. [08_DECISION_LOG.md](08_DECISION_LOG.md) — choices still needing Owner sign-off

## Phase plan — NOT YET APPROVED
- **G0:** Owner chooses Christian tradition, church visual direction, desired interactions, repository/deployment model.
- **G1:** DEMO scene + visual assets + visitor actions, no TikTok or external TTS dependency.
- **G2:** TikTok event adapter + duplicate/streak safety + operator controls + voice and FX.
- **G3:** Windows separate-instance capture, rehearsal, safeguards, go-live.
- **G4:** optional extensions after actual LIVE observations.

**Task gate:** SA creates `Task/*.md` with exact paths, deliverables, tests, branch and acceptance criteria **only after G0 Design approval**. No implementation task has been authorized by these drafts.

## Safety note
This is an independently authored interactive artwork, **not a real parish/church, clergy, religious service, sacrament, or guaranteed spiritual benefit**. Gifts are optional appreciation and must not buy prayer, blessings, forgiveness, absolution or priority of spiritual care.
