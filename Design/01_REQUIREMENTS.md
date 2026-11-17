# 01 — Product Requirements (DRAFT)

> **OWNER DECISION — 2026-11-17:** D-01 **APPROVED**: standalone `nguyenbui5701/OnlineChurch` repository with independent runtime, selectively adapting OnlinePagoda technology. D-04 **APPROVED**: Catholic (Công giáo) identity. The new repository is not yet created/accessibly linked; this is a **temporary Design staging branch**, not permission to merge church code into OnlinePagoda `main`. Remaining interactions, visuals, rollout and complete Design sign-off are pending. See `08_DECISION_LOG.md` and `10_ONLINECHURCH_REPO_MIGRATION.md`.

**Owner:** project owner | **SA:** ChatGPT | **Status:** proposal, not approved

## 1. Goal
Create a dignified Vietnamese-language TikTok LIVE simulation of a **Catholic** church interior where visitors can enter, sit, express a prayer intention, light a **virtual decorative candle**, and receive visual acknowledgment. Retain the proven DEMO -> TikTok LIVE -> 9:16 capture workflow as a *technical* baseline, with a different user-facing identity, scripts, assets and logic.

## 2. Roles and primary journeys
- **Viewer (free):** comment `vào nhà thờ` or `xin chỗ` to enter; `cầu nguyện` / `bình an` to trigger a short respectful kneeling/reflection animation; `thắp nến` to place a virtual light; `amen` to display a gentle response. Vietnamese with/without diacritics.
- **Viewer (optional gift):** gift can trigger **non-liturgical decorative effects** (soft stained-glass light, flowers, stars, bells when enabled) and a thank-you including a sanitized display name. Free participants still have access to core reflection/virtual candle actions.
- **Operator:** DEMO/live selection; username, connection status/retry, audio master and quiet mode, visual presets, bounded test buttons, moderation, telemetry, emergency scene pause and no-audio safe fallback.
- **Visual/audio contributor:** delivers original or licensed approved art/audio with manifest; may not modify business logic.

## 3. Candidate MVP features
| ID | Priority | Requirement | Observable acceptance |
|---|---|---|---|
| R-01 | P0 | 1080x1920 fictional Catholic-style church with front crucifix, pews, center aisle and stained glass | Catholic iconography approved; no Buddhist words, offerings, rituals or reused temple scene assets |
| R-02 | P0 | DEMO starts offline, no automatic TikTok connect | Test actions with zero external credentials |
| R-03 | P0 | Viewer entrance + seat/standing state and one action at a time | Same actor not duplicated by repeated events |
| R-04 | P0 | FREE pray and virtual candle commands; respectful bounded queue | No payment required; no guaranteed miracle/healing promises |
| R-05 | P0 | LIVE connection with explicit operator action, status, recovery | Wrong room/history events ignored |
| R-06 | P0 | Gift dedupe, streak finalization and visual acknowledgment | One transaction counted once, no false inferred price |
| R-07 | P0 | Vietnamese thank-you voice, optional/mute, fallback without blocking scene | No accidental reading of unfiltered chat/profanity |
| R-08 | P0 | Visible DEMO badge, transparent nature of simulation | No misleading claim to real livestream Mass/service |
| R-09 | P0 | Independent port, runtime data, cache, window title and build output | Church tests cannot restart or overwrite pagoda LIVE |
| R-10 | P0 | Manual pause, backlog limits, reconnect indicators and moderation | System degrades predictably |
| R-11 | P1 | Operator change day/night, font sizes and reduced motion | State persists only in church namespace |
| R-12 | P1 | Event log/health dashboard (no leaked personal info) | Session counters available, name leakage avoided |
| R-13 | P2 | Multi-camera / themed holiday seasons | Behind feature flags, separately approved assets |

## 4. Religion, authenticity and monetization boundaries
- **Do not imply official affiliation** with a church, diocese, ministry, cleric or denomination unless authorized.
- No clergy impersonation, virtual Mass, Eucharist, confession, absolution, simulated sacramental blessing or counterfeit liturgy.
- Never connect gifts/coins to forgiveness, prayer efficacy, healing, divine favor, candle priority or access to core acts.
- Avoid public display or narration of sensitive free-form prayer intentions by default. Proposed MVP shows only predefined safe templates, not raw user messages.
- Avoid unlicensed hymns, devotional recordings, church photographs, stained-glass art, brand marks and third-party likenesses. Any chosen scripture translation needs its own rights review.
- Clearly label SIMULATION / virtual reflection and make a disclosure in channel description or operator intro. Relevant platform policies must be rechecked before launch, not assumed satisfied by this document.

## 5. Out of scope for MVP
Real church service, confession, Mass/Eucharist, donation collection on behalf of a parish, counseling, private prayer inbox, account registration, automated moderation of all TikTok content, TikTok publishing/stream-key management, mobile native streaming.

## 6. Provisional non-functional targets (to validate on target PC)
- 9:16 rendering at 1080x1920; target >= 30 fps in 120-person/30-minute isolated stress rehearsal, no unbounded growth; run warmup/soak and report actual p50/p95 not guesses.
- Backpressure: bounded event, action, voice and gift animation queues; surface drop counters.
- Privacy: no credentials, cookies, raw chat, full TikTok payloads, personal voice cache indices or logs in Git. Operator can reset church session/locally generated data.
- Security: local-only UI with origin checks, input validation, output encoding; demo and live namespaces never mix.
- Failure: TikTok down -> keep scene and DEMO usable; TTS down -> no stale or wrong-user speech; overlay hidden -> recover/resync.
- Accessibility: low-flash effects, legible text and mute/reduced-motion toggles; protect central imagery from clutter.

## 7. Acceptance gate
No `Task/` creation before Owner approves `08_DECISION_LOG.md`. Aesthetic mockups and gifts are **illustrative proposals**, not commitments.

## Catholic-specific product constraints
- The altar/presbytery/crucifix is a protected non-interactive zone. Visitors remain in pews, aisle or approved side devotional area.
- A virtual votive candle and prayer reflection are free symbolic visual actions, never sacramental or sold in exchange for TikTok gifts.
- Marian artwork is an **optional Catholic content choice still pending Owner approval**; do not treat it as already signed off.
- Never auto-read private prayer petitions aloud or imply that gifts affect divine favor.
- See `09_CATHOLIC_CONTENT_AND_SAFEGUARDS.md` for stricter acceptance checks.
