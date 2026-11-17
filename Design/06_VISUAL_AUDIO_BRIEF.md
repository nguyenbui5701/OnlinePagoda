# 06 — Visual/Audio Contributor Brief (DRAFT)

> **OWNER DECISION — 2026-11-17:** D-01 **APPROVED**: standalone `nguyenbui5701/OnlineChurch` repository with independent runtime, selectively adapting OnlinePagoda technology. D-04 **APPROVED**: Catholic (Công giáo) identity. The new repository is not yet created/accessibly linked; this is a **temporary Design staging branch**, not permission to merge church code into OnlinePagoda `main`. Remaining interactions, visuals, rollout and complete Design sign-off are pending. See `08_DECISION_LOG.md` and `10_ONLINECHURCH_REPO_MIGRATION.md`.

**Recipient:** separate Image/Audio ChatGPT agent. **No implementation privilege.**

## Goal
Create original, cohesive 9:16 **Catholic** fictional church interior art for a live interactive digital experience in Vietnamese, with layered assets compatible with PixiJS. Emotional direction: calm, luminous, warm, reverent, not a copy of a real church or a mock religious service.

## Deliverables (proposal)
1. **Concept sheets:** three art directions (soft realistic 2D, painterly 2.5D, stylized illustration); include 1080x1920 composite and safe overlays.
2. **Scene background:** wide interior, central aisle, pews to left/right, stained glass, clearly visible **crucifix**; artwork without baked-in dynamic text or avatars.
3. **Layer separation:** background/far windows, central cross/chancel, foreground pews, decorative side candle stand, diffuse light, shadow/occlusion mask. Transparent PNG or WebP for layers with alpha, coordinated 1080x1920 pixel coordinate system.
4. **Character sprites:** generic fictional visitor front/side/back, neutral walking/standing/seated/kneeling **optional after denomination sign-off**, sprite pivot / scale / hitbox guide; no real individual likeness.
5. **FX sprites:** soft rays, candle, petals/light motes (not altar offerings); low-flash alternatives.
6. **Audio:** original/licensed short chime and neutral ambient only; no recorded Mass, hymns, copyrighted music or impersonated clergy voices.
7. **Manifest:** filename, license/source/generation method, prompt, created date, dimensions, transparency, author, attribution/rights and approved status.

## Prompts (for initial exploration, not final approval)
- Scene: "Original fictional Catholic nave, symmetrical view toward a respectful front crucifix, warm evening sun filtering through stained-glass windows, central aisle and wooden pews, peaceful illustration, portrait 9:16, 1080x1920 composition, no humans, no text, no logos, no watermark, no real-world church name, leave clear central aisle for animated characters".
- Sprite: "Original friendly generic visitor character, simple modest everyday clothes, consistent 2.5D sprite design, isolated transparent background, front side back poses, subdued palette, no clergy garments, no text".
- Layer: "Transparent decorative candle stand positioned to the side of a fictional church nave, respectful and non-liturgical, soft warm lighting, isolated on transparent background".
- Catholic identity is approved, but **Marian side imagery remains optional**. Front crucifix is suitable. Never create a real named parish, priestly ceremony, fake Mass, sacramental items or gifts at the altar.

## Handoff and quality checklist
- Do not use full-width composite image as a substitute for transparent sprite assets.
- Edge halos, alpha errors, cutout gaps and visual duplication rejected.
- All layers assembled in PixiJS at fixed coordinate anchors; performance budget verified by AI Code.
- Final approval requires screenshot under the LIVE Studio chat overlays, not just an attractive standalone picture.
- Optimise asset sizes without altering approved framing; never use images from OnlinePagoda in a church scene without rights and semantic review.

## Catholic production handoff
Produce a variant **with** and **without** optional Marian side devotional imagery for Owner decision; preserve a front **crucifix** and non-interactive sanctuary zone. Avoid sacred-area animations and clergy avatars. Before AI Code integration: log art license/attribution, provide mask geometry, get SA content review and Owner approval as specified in `09_CATHOLIC_CONTENT_AND_SAFEGUARDS.md`.
