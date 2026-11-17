# 06 — Visual/Audio Contributor Brief (DRAFT)
**Recipient:** separate Image/Audio ChatGPT agent. **No implementation privilege.**

## Goal
Create original, cohesive 9:16 fictional church interior art for a live interactive digital experience in Vietnamese, with layered assets compatible with PixiJS. Emotional direction: calm, luminous, warm, reverent, not a copy of a real church or a mock religious service.

## Deliverables (proposal)
1. **Concept sheets:** three art directions (soft realistic 2D, painterly 2.5D, stylized illustration); include 1080x1920 composite and safe overlays.
2. **Scene background:** wide interior, central aisle, pews to left/right, stained glass, clearly visible cross; artwork without baked-in dynamic text or avatars.
3. **Layer separation:** background/far windows, central cross/chancel, foreground pews, decorative side candle stand, diffuse light, shadow/occlusion mask. Transparent PNG or WebP for layers with alpha, coordinated 1080x1920 pixel coordinate system.
4. **Character sprites:** generic fictional visitor front/side/back, neutral walking/standing/seated/kneeling **optional after denomination sign-off**, sprite pivot / scale / hitbox guide; no real individual likeness.
5. **FX sprites:** soft rays, candle, petals/light motes (not altar offerings); low-flash alternatives.
6. **Audio:** original/licensed short chime and neutral ambient only; no recorded Mass, hymns, copyrighted music or impersonated clergy voices.
7. **Manifest:** filename, license/source/generation method, prompt, created date, dimensions, transparency, author, attribution/rights and approved status.

## Prompts (for initial exploration, not final approval)
- Scene: "Original fictional church nave, symmetrical view toward a simple wooden cross, warm evening sun filtering through stained-glass windows, central aisle and wooden pews, peaceful illustration, portrait 9:16, 1080x1920 composition, no humans, no text, no logos, no watermark, no real-world church name, leave clear central aisle for animated characters".
- Sprite: "Original friendly generic visitor character, simple modest everyday clothes, consistent 2.5D sprite design, isolated transparent background, front side back poses, subdued palette, no clergy garments, no text".
- Layer: "Transparent decorative candle stand positioned to the side of a fictional church nave, respectful and non-liturgical, soft warm lighting, isolated on transparent background".
- Don't encode denomination-specific statues, Marian iconography, Eucharistic objects, pastor/priest, vestments, altar rites until Owner chooses tradition and the imagery is reviewed.

## Handoff and quality checklist
- Do not use full-width composite image as a substitute for transparent sprite assets.
- Edge halos, alpha errors, cutout gaps and visual duplication rejected.
- All layers assembled in PixiJS at fixed coordinate anchors; performance budget verified by AI Code.
- Final approval requires screenshot under the LIVE Studio chat overlays, not just an attractive standalone picture.
- Optimise asset sizes without altering approved framing; never use images from OnlinePagoda in a church scene without rights and semantic review.
