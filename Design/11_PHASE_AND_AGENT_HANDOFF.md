# 11 — Phased Delivery and AI Agent Handoff (PLAN ONLY)

**Approved:** Catholic theme, standalone `OnlineChurch` repository, vetted reuse from OnlinePagoda.
**Pending:** remote repo creation, full Design sign-off and exact content/operational options.

## G0 — Design gate (SA + Owner)
- Owner creates `OnlineChurch` with README and ensures GitHub connector access.
- SA commits the Design snapshot in an OnlineChurch SA branch; opens draft PR.
- Owner confirms: visual style, optional Marian side imagery, free commands, gift FX, Vietnamese thanks, simultaneous Pagoda/Church operation, audio routing.
- SA marks 08 Decision Log approved and commits. **Only after this gate does SA create Task files.**

## Planned tasks (not yet authorized)
| ID | Responsibility | Scope | Acceptance |
|---|---|---|---|
| TASK-001 | AI Code | standalone scaffold, test/build scripts, isolated config and `@onlinechurch/shared` | clean build/typecheck/unit tests; no pagoda runtime coupling |
| TASK-002 | AI Visual then AI Code | original Catholic 9:16 assets, layered scene and sanctuary mask | licensed manifest, Owner image review and protected zone |
| TASK-003 | AI Code | ChurchEngine: entrance, seats, free prayer and virtual votive candles | stable actors, fair queue, no paid access |
| TASK-004 | AI Code | TikTok connector adaptation, reconnect, gift-streak finalization | room/stale/duplicate/unknown-gift tests |
| TASK-005 | AI Code | dashboard, neutral Vietnamese TTS, audio ownership, quiet/pause | correct name, fallback, moderation and operator UX |
| TASK-006 | AI Code + Owner | Windows Electron capture, stress rehearsal and mobile audio QA | safe 9:16, independently running from Pagoda |
| TASK-007 | SA + Owner | code review, release/rollback and real-LIVE approval | all gates + manual Owner acceptance |

## Roles and token-efficient execution
- **SA:** primarily writes `Design/`; after sign-off, writes narrowly scoped `Task/` with read-first paths, allowed paths, acceptance, branch name and tests; commits; reviews GitHub PRs using separate `ReviewPR/PR-n/` if local checkout available. Critical defects -> REQUEST_CHANGES + Task fix list; on accepted & Owner-merged PR -> clean reviewer-owned scratch and completed Task only.
- **AI Code / Codex:** implements one Task/PR at a time in OnlineChurch only. No source changes in Pagoda, no modifications to Design/Task, no real LIVE during automated tests. Returns compact changed-files/commit/tests PASS-FAIL-NOT_RUN evidence, screenshot for UI, risks and rollback.
- **AI Visual/Audio (separate ChatGPT):** reads `Design/06_VISUAL_AUDIO_BRIEF.md` and `Design/09_CATHOLIC_CONTENT_AND_SAFEGUARDS.md`. Produces original concept art, 2.5D/PNG layers with transparency, characters/poses and asset manifest; no application source edits or GitHub push without explicit authorization.
- **Owner:** selects religious/visual content, approves Design and final go-live; merges accepted PRs.

## Context savings
Each AI task receives only its exact Task, required Design files and source path allowlist. Developers report **deltas** rather than pasting entire codebases. SA reviews changed paths first, then context-sensitive dependencies, not all unrelated folders. Image AI works from a compact visual brief, not hundreds of previous chat messages. Preserve test evidence and report failures accurately.

## Unresolved user decisions
- [ ] Choose 2D / 2.5D / 3D-looking style.
- [ ] Marian side image/statue: yes/no.
- [ ] Confirm proposed free enter/prayer/candle, neutral gifts and named TTS.
- [ ] May both apps run simultaneously on same Windows PC, and how will audio/capture be handled?
