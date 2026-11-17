# 03 — System Architecture and Separation (DRAFT)
**Reference:** `OnlinePagoda` at `ee55ee81e507135b805d116586f5814eed9a89a9`.

## Decision in principle: isolate first, reuse selectively
**Provisional recommendation:** create a **separate OnlineChurch application/repository and runtime** based on a pinned, reviewed technical snapshot, rather than a runtime `theme=church` flag inside the existing pagoda engine. The actual repository destination is **not authorized yet**; Owner chooses in `08_DECISION_LOG.md`. This Design lives in `OnlinePagoda/Design` only because that is the provided repository.

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

## Runtime separation options to decide
- **Option A (preferred):** new repository `OnlineChurch`, separate Windows folder, default proposed port 3100, independent `dist`, `data`, settings and Electron window title. Reuse selected code by copy/license audit first; no active dependency on pagoda.
- **Option B:** same monorepo, independent `apps/church-*` and `packages/church-domain` plus separate build targets; more coupling and root build risk. Do not edit the current pagoda launch/build scripts until isolated tests demonstrate no regression.
- Both: *not* two TikTok receivers to the same channel during real operation without a deliberate owner-approved design; avoid duplicate reactions.

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
