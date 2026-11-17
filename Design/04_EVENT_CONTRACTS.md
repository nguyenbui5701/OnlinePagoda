# 04 — Interaction and Event Contracts (DRAFT)

## 1. Input trust boundary
Incoming TikTok data is untrusted; adapt only `chat`, `member`, `gift`, `like`, and `roomUser` initially, following existing `apps/server/src/tiktok/mapper.ts`. Validate ID lengths, chat length, gift count and price bounds; bind to current room/connection epoch; reject historical/wrong-room events; do not trust gift names as monetary values.

Represent each input as a **single sanitized envelope** with room + connection epoch + actor identity + event ID or conservative synthetic dedupe key. Treat missing stable IDs as a risk: ignore for transaction accounting when exact-once cannot be assured. Progress updates for a TikTok combo are not yet final gifts.

## 2. Draft command grammar
| Canonical intent | Accepted examples (case/diacritic insensitive) | Animation |
|---|---|---|
| ENTER | `vào nhà thờ`, `xin chỗ`, `ngồi` | Welcome/seat |
| PRAY | `cầu nguyện`, `xin cầu nguyện` | Reflection pause |
| LIGHT_CANDLE | `thắp nến`, `nến bình an` | Decorative candle |
| PEACE | `bình an`, `cầu bình an` | Soft light |
| AMEN | `amen`, `a men` | Text/accent |

Exact token boundaries, normalize NFC, trim length; reject overlapping, negated, quoted commands and multiple action requests in one message. Never echo raw chat to overlay or TTS. User text beyond known command is handled by normal viewer-chat policy, not as a public prayer.

## 3. Domain state and limits (initial proposals)
- `actorKey` scoped to room/session. Existing actor gets merged, not recreated on reconnect.
- Seat cap candidate 60, standing display cap 20; both settings to benchmark.
- Commands: one actionable command per actor per 5 seconds; dedupe per message.
- Reflection animation <= 8 seconds; candle <= 5 seconds. Do not block other users with long religious sequences.
- Three queue classes: presence/welcome; free reflection; optional gift acknowledgment. All queues bounded, with explicit metrics and fair scheduling; gift may have *visual acknowledgment timing* but **may not delay or buy religious action**.
- Gift streak progress -> update count only; finalized once -> persist in-memory idempotency ledger, thank once. Unknown price cannot be converted to coins. Do not promise perfect exactly-once across disconnected sessions.
- Daily/session reset and reconnect must preserve clear scope boundaries. If a session changes, clear stale pending events before accepting new room.

## 4. Suggested actions
```text
DEMO enter -> actor seated -> optional PRAY -> move to side reflection
            -> quiet hold -> return to seat -> UI acknowledgment
Gift event  -> validate/commit streak once -> optional FX -> optional named TTS
```
Audio voice text examples:
- Greeting: "Chào mừng bạn đến không gian suy niệm trực tuyến."
- Reflection: "Chúc bạn một ngày bình an."
- Gift: "Cảm ơn [tên đã lọc] đã ủng hộ buổi phát."
Not allowed: "Bạn đã được tha tội", "Tặng quà để được cầu nguyện", promises of healing/miracles or simulated sacraments.

## 5. Failure cases to simulate
Duplicate packet, out-of-order gift progress/end, missing ID, stale room event, rate-limit, worker crash, broken TTS, very long/unicode nickname, profanity, floods of 100+ commands, two overlay windows claiming sound, lost socket then resync. Count drops and use silent generic fallback when uncertain; no wrong-person voice.
