# 10 — New Repository and Technical Migration Playbook

**D-01 APPROVED:** standalone `nguyenbui5701/OnlineChurch`. As of 2026-11-17, that repository returns **404** through the connected GitHub lookup, and the exposed GitHub actions cannot create repositories. **No OnlineChurch commit exists yet.**

## 1. One-time Owner action
1. Open https://github.com/new while signed in to GitHub as `nguyenbui5701`.
2. Owner: `nguyenbui5701`, repository name: `OnlineChurch`.
3. Choose visibility. Private is suggested during development until art licensing/publication is reviewed.
4. Initialize with README and create repository, so a `main` branch exists.
5. Allow the connected GitHub integration access if prompted, then send SA the repository URL. Do not provide credentials, ZIPs or production files.

## 2. SA migration after existence is verified
1. Read new repo main HEAD and check existing files/permissions; create `sa/catholic-design-v1`.
2. Migrate `Design/*.md` from the pinned temporary staging branch, keeping audit provenance and approved decisions. Add project-specific `.gitignore` to permit `Design/` and `Task/` while excluding `ReviewPR/` and secrets.
3. Commit and open **OnlineChurch draft Design PR**. Verify no runtime/source copy was included.
4. After successful verification, explicitly mark the old OnlinePagoda draft PR #1 superseded and close it **without merging** to pagoda `main`. Keep source/production untouched.
5. Complete remaining G0 approvals; only then issue `Task/TASK-001-*.md` in OnlineChurch.

## 3. Selective reuse from OnlinePagoda
Pinned reference: `nguyenbui5701/OnlinePagoda@ee55ee81e507135b805d116586f5814eed9a89a9`.

| Old file/group | Future action | Evidence |
|---|---|---|
| `apps/server/src/tiktok/mapper.ts`, `provider.ts`, `transport.ts`, `worker.ts` | PORT selected event handling | validation, room binding, duplicate/combo tests |
| `apps/server/src/sources.ts` | ADAPT | DEMO/LIVE ChurchEngine split |
| `apps/server/src/app.ts` | ADAPT | local origin validation, Socket.IO snapshots, isolated data |
| `apps/server/src/voice32.ts` | ADAPT | neutral thanks templates, no wrong-user speech, separate cache |
| `apps/overlay/src/main.ts` | REUSE PixiJS composition concepts | new Catholic scene and sanctuary mask |
| `apps/dashboard/src/*.tsx` | REUSE dashboard patterns | new Catholic operator UI |
| `packages/shared/src/*` | REWRITE into `@onlinechurch/shared` | own schema, domain/event contracts |
| `apps/server/src/engine.ts`, fortune/lantern/incense features | **DO NOT PORT** whole engine | new ChurchEngine with free symbolic actions |
| `apps/overlay/public/art` and temple audio | **NO DEFAULT REUSE** | new original/licensed art and audio |

For every copied technical module, track original file path, pinned original SHA, target path, changes and dependencies/licenses in the initial implementation task. Having the same GitHub owner does not automatically make all third-party assets reusable.

## 4. Planned standalone tree (not yet present)
```
OnlineChurch/
  Design/               # SA only
  Task/                 # approved active tasks
  ReviewPR/             # ignored local scratch
  apps/server/src/      # church engine + TikTok
  apps/overlay/src/     # Catholic scene
  apps/dashboard/src/   # operator UI
  packages/shared/src/  # @onlinechurch/shared
  assets/               # original/licensed artwork + manifest
  tests/                # deterministic fixtures
  scripts/              # isolated launch/build/rehearsal
  .env.example          # no secrets
  README.md
```

## 5. Windows boundary and rollback
A suggested separate folder is `D:/Vibecode/OnlineChurch`, with independent `dist/`, `data/`, `.env`, TTS cache, Electron window title `OnlineChurch - Capture doc` and candidate port **3100** (port availability unverified). OnlinePagoda remains untouched on port 3000. No church build may overwrite pagoda files or restart the active pagoda server. First start is offline DEMO only. Real TikTok LIVE must be manually enabled after isolated tests and Owner go-live approval.

Repository provisioning + Design migration are not authorization to start coding.
