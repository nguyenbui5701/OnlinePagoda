# 03 — System Architecture and Separation (DRAFT)

> **OWNER DECISION — 2026-11-17:** D-01 **APPROVED**: standalone `nguyenbui5701/OnlineChurch` repository with independent runtime, selectively adapting OnlinePagoda technology. D-04 **APPROVED**: Catholic (Công giáo) identity. The new repository is not yet created/accessibly linked; this is a **temporary Design staging branch**, not permission to merge church code into OnlinePagoda `main`. Remaining interactions, visuals, rollout and complete Design sign-off are pending. See `08_DECISION_LOG.md` and `10_ONLINECHURCH_REPO_MIGRATION.md`.

**Reference:** `OnlinePagoda` at `ee55ee81e507135b805d116586f5814eed9a89a9`.

## Decision in principle: isolate first, reuse selectively
**Owner-approved decision (2026-11-17):** target independent `nguyenbui5701/OnlineChurch` repository and runtime; selectively port vetted technical modules from pinned OnlinePagoda. No `theme=church` flag in the existing pagoda engine. This temporary `OnlinePagoda/Design` draft exists only until the independent repository is created and migrated.

Why: `apps/server/src/engine.ts` includes temple ceremonies, incense queues, fortune and lantern features; `packages/shared/src/index.ts` includes temple-specific settings/state; `apps/overlay/src/golden/*` embeds Buddhist visual stages. Renaming assets is insufficient to produce a church-specific behavior model. Avoid a sweeping common-core refactor before MVP.

## Candidate deployment boundaries
```text
TikTok LIVE public event
        │
        ▼
  TikTok connector / adapter (sanitized, bounded)
        │  EventEnvelope (room/session/identity/dedupe)
        ▼
 SourceManager  ── separate DEMO + LIVE state
        │
        ▼
 ChurchEngine (presence | seats | reflection | candles | gifts)
        │  Snapshot + Delta, monotonically versioned
        ▼
 Socket.IO server ────────────────────────┐
        │                                │
   operator dashboard                PixiJS overlay
   React / control UI                render + local audio
        │                                │
        └────── audio request ────────────┤
                                         ▼
                               Windows capture 9:16
                               TikTok LIVE Studio
```

### Shared technical candidates (copy/adapt with full attribution and tests)
- TikTok transport/provider worker state machine, mapping and validated event contract from `apps/server/src/tiktok/*`.
- Source separation, local Express/Socket.IO transport, audio owner lock, reconnection diagnostics.
- Render pipeline concepts: PixiJS 1080x1920, Electron capture, scene snapshot/delta and camera transitions.
- TTS subprocess/cache architecture with **church-specific thanks templates** and data minimization.

### Do NOT reuse unchanged
- `SceneEngine` religious actions/lantern/fortune, `golden/scene.ts`, incense and bow animations, Buddhist gifts/thanks, cached religious speech, temple scene settings, seat geometry, audio/visual assets without a new license review.
- Copying a complete app tree and switching images is an unsafe shortcut.

## Recommended interfaces (names conceptual)
```ts
type NormalizedLiveEvent =
  | { kind:"enter"|"chat"|"like"; roomId:string; sessionId:string; actorKey:string; eventKey:string; at:number; text?:string; count?:number }
  | { kind:"gift"; roomId:string; sessionId:string; actorKey:string; eventKey:string; at:number; giftId:string; units:number; streakKey?:string; finished:boolean; unitCoins?:number };
type ChurchIntent = "ENTER"|"PRAY"|"LIGHT_CANDLE"|"PEACE"|"AMEN";
type ChurchAction = { id:string; actorKey:string; kind:ChurchIntent|"GIFT_FX"; startedAt:number; expiresAt:number };
```
- **Adapter:** validates and bounds untrusted payloads, scopes to active room; never exposes tokens or raw event tree to renderers.
- **Domain:** one authoritative simulation clock, states, queue limits, exact-once scoring; no PixiJS dependency.
- **Presenter:** renders snapshots + actions; never interprets gifts as religious authority.
- **Audio:** single owner; only approved bounded text; queue and mute; never assign fallback audio from a different user.
- **Persistence:** local church-specific `data/`; never share `.env`, voice cache, room ID, session IDs or port with OnlinePagoda.

## Runtime separation — selected standalone option
- **Selected:** independent `OnlineChurch` repository/folder with separate `dist`, `.env`, `data`, voice cache and capture title. Proposed port **3100** is a candidate only; verify on the Windows machine.
- **Rejected:** add the church as a mode or package in the OnlinePagoda production repository.
- Do not connect two receivers to the same real LIVE stream without deliberate approved coordination; avoid duplicates and resource contention.

## Change control and migration
1. Freeze reference SHA and identify contracts in README/index; build DEMO in **different working directory and port**.
2. Copy only technical modules explicitly reviewed; write church-only schemas, commands and scenes.
3. Keep original namespace `@vuonsen` out of the new product API when porting code, unless clearly isolated; no accidental import from old src.
4. Migration tests: baseline pagoda build/unit unchanged; church independent build/unit; no shared mutable files.
5. Blue/green manual cutover to church LIVE only after rehearsal; keep pagoda untouched and rollback via earlier church build.

## Design risks
- Third-party `tiktok-live-connector` may break or be rate-limited; pin version, DEMO fallback, never rely on private credentials.
- Current README explicitly warns no fresh-host LIVE/E2E guarantee. Separate tests needed; source reading is not execution evidence.
- TTS via gTTS sends synthesized text to an external provider. Require operator enablement and display-name filtering.
- Port/account, hardware load, virtual audio routing and capture must be verified on actual Windows PC.

## Catholic-specific scene responsibility
A distinct `ChurchEngine` owns actors, pews, free prayer, virtual votive candles and gifts; an independent renderer enforces a protected sanctuary mask. Do not port the pagoda's `incense`, `fortune`, `lantern`, offerings, Buddhist effects and text, or entire `SceneEngine` logic. Port only connector, source-management, state synchronization, Windows capture and TTS *patterns* with contract tests. Detailed provenance and repo steps: `10_ONLINECHURCH_REPO_MIGRATION.md`.
