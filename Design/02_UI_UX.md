# 02 — UI / UX (DRAFT)
**Canvas:** 1080x1920 portrait for TikTok LIVE Studio Window Capture. **Theme:** warm, elegant, contemplative, not a real religious ceremony.

## A. Visual hierarchy (coordinates are initial layout guides, not final pixels)
```text
┌──────────────────── 1080 px ────────────────────┐
│ 0–150   NHÀ THỜ ONLINE · DIGITAL SIMULATION     │
│         status / counter / unobtrusive notice   │
│                                                 │
│ 150–1050  WINDOWS / CROSS / QUIET CHANCEL       │
│           center focal point (unobstructed)     │
│           no gifts obscuring the cross          │
│                                                 │
│ 800–1540 CENTRAL AISLE + PEWS                   │
│           avatar enters, sits, approaches       │
│           side reflection point / candles       │
│                                                 │
│ 1450–1770 LOW NOISE INTERACTION PANELS          │
│           recent greeting / 1 active card       │
│           keep TikTok's native chat area clear  │
│                                                 │
│ 1770–1920 concise command hints / footer        │
└─────────────────────────────────────────────────┘
```
Recommended: center aisle clear (roughly x=450..630), pews in left/right banks; candles only at an accessible **side location**, not on or in front of altar. A camera move must never replay event/audio. Respect application safe margins calibrated from actual Studio capture, not assumed mobile overlays.

## B. Design system
- Palette candidate: ivory #F5E9D4, dark walnut #36291F, gold #CBAA69, midnight blue #1C283C, glass jewel accents; ensure contrast.
- Background: original fictional church interior, no real parish logo/location, focal cross. Architecturally neutral pending Catholic/Protestant selection.
- Typography: readable Vietnamese sans-serif for UI; restrained serif for title; fonts only with verified redistribution rights.
- Default animation: subtle light rays, movement no faster than safe readability, no flash/strobe. Gift effects cannot cover cross > 1s.
- Audio: ambient off by default during integration, no copyrighted hymns/choir tracks unless explicitly licensed. Independent sliders for SFX, ambience and voice.
- Emblem: a cross only pending approved denominational direction; remove imagery that suggests a real clergy officiating.

## C. Interactions (provisional)
| Trigger | Visual | Text/audio |
|---|---|---|
| Enter / greeting | Visitor walks in, stands or takes pew | "Chào mừng bạn đến không gian suy niệm trực tuyến" |
| `cầu nguyện` | Visitor approaches side reflection/kneeling point, pauses, returns | Quiet acknowledgment; no promises of intervention |
| `thắp nến` | One decorative virtual candle lights on side stand | "Một ngọn nến tượng trưng cho lời cầu nguyện" |
| `bình an` / `amen` | Gentle rays / text, no payment | Short positive message |
| Gift | Non-liturgical glow / flowers / small stars | "Cảm ơn [tên] đã ủng hộ buổi phát" |
| TikTok reconnect | Scene continues, status changes | No spoofed live event |
| Quiet mode | Stop music, optional TTS, reduce animations | Operator controls unchanged |

Gift effects: one on-screen at a time for large FX, two short effects maximum if benchmark allows; visualize queue drops instead of excessive animation. All gift mappings must use confirmed event data.

## D. Dashboard (operator only)
Sections: 1) DEMO/LIVE + room + connection; 2) scene/camera/day-night; 3) free command test and gift test; 4) sound/voice/quiet/mute; 5) moderated text / command configuration; 6) metrics and dropped-event reasons; 7) pause/reset with confirmation.

Main status indicators: mode, TikTok connected/reconnecting, scene FPS, queue depth, latest action, voice ready/fallback, whether audio ownership claimed. Disable commands that require LIVE where inappropriate; never let a browser autoplay secretly connect to TikTok.

## E. Visual acceptance review
The image agent produces: 1 background 1080x1920; separate transparent layers for cross/altar area, pews, candle stand, foreground; visitor sprite poses and visual FX; a low-res composite preview for Owner. SA signs off imagery before AI Code integrates. Generated visual is concept art until dimensions, transparency, IP rights and readability are checked.
