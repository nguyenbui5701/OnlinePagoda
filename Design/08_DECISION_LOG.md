# 08 — Owner Decision Log
**Status:** G0 OPEN — these questions are not approved assumptions.

## Architecture decisions
| ID | Current proposal | Status / Owner action |
|---|---|---|
| D-01 | **Separate OnlineChurch repository/runtime**; OnlinePagoda serves as pinned technical reference; current repo stores design until destination chosen | OPEN — choose separate repo or same monorepo |
| D-02 | Default language Vietnamese; Windows desktop + TikTok LIVE Studio; 1080x1920 | PROPOSED — confirm |
| D-03 | DEMO-first MVP; free entrance/prayer/virtual candle; optional non-religious gift effects | PROPOSED — confirm |
| D-04 | Church tradition / iconography: default **non-denominational fictional Christian-inspired interior** until decision; no priest/pastor or ceremony representation | OPEN — Catholic, Protestant, or general Christian-inspired? |
| D-05 | Visual style: calm, luminous realistic 2.5D; muted FX, central cross + side candle station | OPEN — choose 2D / 2.5D / 3D appearance |
| D-06 | No gift-for-prayer/forgiveness; no public raw prayer text | SAFEGUARD — should remain |
| D-07 | Interactive avatar walks to side reflection station, pauses, returns (6–8s); no simulated Mass | PROPOSED — approve / revise |
| D-08 | Optional voice thanks by name (Vietnamese), no real-clergy impersonation, mute by default in test | PROPOSED — approve / revise |
| D-09 | Proposed different app runtime/port 3100; independent data/cache/capture | PROPOSED — confirm technical environment |
| D-10 | No `Task/` before Owner formally approves G0; SA only commits Design on SA branch | ACTIVE process pending ratification |

## Owner sign-off checklist
- [ ] Church identity / tradition and boundaries selected.
- [ ] Separate repo versus monorepo selected; if separate repo, name/owner confirmed and repository creation explicitly authorized.
- [ ] Initial interactions confirmed (enter, pray, candle, gifts, thanks).
- [ ] Visual concept direction approved; scene and art creation authorized.
- [ ] Deployment hardware and whether pagoda/church may run simultaneously confirmed.
- [ ] Sign off Design documents before Task creation.

## Future change protocol
When approved, SA records decision, date and rationale here, changes `Status: APPROVED`, commits Design, then generates tasks in `Task/`. Later changes are versioned ADRs, never silent spec drift. All changes to religious interactions must be explicitly reviewed by Owner.
