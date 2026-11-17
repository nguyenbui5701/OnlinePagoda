# 07 — QA, Release Gates and Acceptance (DRAFT)

## 1. Mandatory stages
**Gate A — contract review:** 01–08 Design signed off; religious direction, repository and interactions decided; creator art rights recorded.
**Gate B — isolated build:** on non-LIVE development copy, `npm.cmd ci`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` with source and build directory logged. In a new repo, replace scripts only after implementation; commands from pagoda are a reference, not proof that church supports them today.
**Gate C — demo:** no Internet/TikTok account; command fixture, queue and voice mute/fallback; no Buddhist text/assets in final church capture.
**Gate D — adapter rehearsal:** mocked TikTok events, repeated combo, disconnected room, reconnect, duplicate event, long names; no double scoring or TTS wrong-user.
**Gate E — capture rehearsal:** Windows Electron/Window Capture 1080x1920, LIVE Studio check; image, audio routing, legibility, visibility under native TikTok chrome. Never test while pagoda is running production unless fully isolated hardware/ports and Owner authorizes it.
**Gate F — Owner go-live:** manual approval after real device check. No silent deployment.

## 2. Test matrix
| Test ID | Input/stress | PASS criterion |
|---|---|---|
| T01 | boot without LIVE | DEMO active, no unsolicited external connection |
| T02 | 1 user enters twice | one stable actor, one seat |
| T03 | free `cầu nguyện`, `thắp nến` | animations without gift/payment |
| T04 | gift progress + final + duplicate | exactly one finalized confirmation in same room/session; no fabricated coin value |
| T05 | mismatched room/late event | dropped and counted, no renderer action |
| T06 | reconnect same/new room | room scoped correctly, stale queue cleared |
| T07 | giant name/profanity/HTML | sanitized display + no raw speech injection |
| T08 | TTS disabled/timeout | scene continues, no wrong-name fallback |
| T09 | dual overlay audio claim | only one audible owner |
| T10 | 120 participants for 30 minutes in isolated soak | >=30 fps target *if hardware supports*, bounded queue, log measured fps/memory; no fabricated PASS |
| T11 | LIVE Studio phone viewer check | text not obscured; actual viewer hears correct audio |
| T12 | shutdown and relaunch | only church service stopped/restarted; pagoda unaffected |
| T13 | missing/offline art, lost overlay | recover/safe fallback with visible warning |
| T14 | content safety scan | no parish impersonation, pay-to-pray, religious mislabeling, unlicensed music |
| T15 | regression: current pagoda baseline untouched | no source/runtime/data changes without separate explicit approval |

## 3. Evidence per PR
PR description must include baseline SHA, branch, affected files, commands with environment, PASS/FAIL table, reasons for skipped tests, screenshots/video for UI, known issues, risk and rollback steps. Tests not executed must say **NOT RUN**. No automated test uses an actual viewer gift.

## 4. Incident/rollback
Operator controls: pause new LIVE actions, mute all speech/audio, disable gift FX, switch to static safe scene, disconnect receiver. Rollback church only; preserve data with privacy safeguards. Pagoda LIVE must not be a dependency. Log timestamp and non-identifying fault code, not raw chat or credentials.

## 5. Completion definition
A milestone is COMPLETE only when acceptance criteria, security/content checks, relevant runtime evidence and Owner approval all exist. A PR review alone does not launch production.
