# Tài nguyên sân Quan Âm — 05/11/2026

Tạo bằng tool `image_gen` tích hợp theo skill `C:/Users/tuank/.codex/skills/.system/imagegen/SKILL.md`, không dùng API key/CLI. Ảnh là tài nguyên sinh mới, không phải screenshot ứng dụng. Ảnh render thực tế: `artifacts/quan-am-courtyard/`.

| File | Vai trò | Output nguồn |
|---|---|---|
| day.png | Bản tham chiếu ban đầu, runtime không tải | exec-7fc1bd95-2722-45fa-bf13-fe4245de4895.png |
| day-v2.png | Nền ngày dùng thật, gom hồ sen lên trên để phần sân thấp đủ chỗ | exec-ade852cc-5057-47de-bf78-9802dee0cca3.png |
| night.png | Nền đêm, cùng bố cục với day-v2 | exec-755310a6-8ed3-45a1-a3d1-20d83ec11d1c.png |
| quan-am.png | Tượng Quan Âm đá trắng đứng, có alpha thật | exec-4c35615d-4a98-4ea9-8eee-25a6e3c44d16.png |

Nguồn output nằm trong `C:/Users/tuank/.codex/generated_images/01a1920b-aa16-7840-ad57-737de3e7d0f6/`. Đã sao chép vào source để runtime không phụ thuộc thư mục đó. Chiều ấm dùng tint/lớp màu trên nền ngày; đêm dùng ảnh riêng và lớp sáng đèn. Đây là ánh sáng 2D, không mô phỏng vật lý/3D. Không dùng ảnh tham khảo bên ngoài hoặc ảnh người thật.

## Prompt nền ngày

Create a polished original 2D game background for Vietnamese Buddhist outdoor courtyard, portrait 9:16 1080x1920 composition. No statue, no humans, no text, no UI, no mats, no incense burner. Soft beautiful daylight, lush bodhi trees framing left and right, distant misty green mountains, open blue sky in the top quarter, tasteful Vietnamese tiled-roof garden pavilions at upper side edges only. Quiet pale warm grey stone plaza, symmetric frontal camera with slight view down onto ground. A subtly raised empty stone altar landing centered around 45% image height, clear open space center top for separate standing white Guanyin statue from y=200 to900 on 1080x1920 canvas. Small lotus ponds hug far left/right edges ONLY around y=650 to980, never in the main walking plaza. Entire bottom 48% is uninterrupted broad dry paved courtyard, lightly patterned large stone slabs in perspective, no buildings, water, benches or obstacles there, spacious straight center walkway. Avoid strong convergence or big central staircase. Elegant restrained gold/bronze trim, white stone balustrades at upper side edges. Compatible with warm detailed semi-realistic 3D illustration chibi Buddhist game, rich high-quality textures, serene atmospheric depth, clean functional composition. Include small unlit stone lantern structures at x=90 and x=990 around y=850, but NO baked glowing lights. No worship symbols drawn on paving. The background must fill full portrait canvas without border.

## Prompt tượng — transparent_background=true

One isolated full-body statue of Vietnamese Quan Am / Guanyin Bodhisattva, standing gracefully on a wide double lotus pedestal, frontal camera, symmetrical balanced calm composition. Entire statue carved from luminous ivory-white marble with delicate subtle pale gold trim on robe and crown. Feminine serene compassionate face, elegant tall crown and flowing white robes, right hand gently holds a fine willow branch, left hand holds a small purification vase; detailed graceful hands and five natural fingers. High quality softly rendered realistic sculpture matching a polished Vietnamese Buddhist garden game. Statue and lotus base only, no scene, no halo, no scenery, no sky, no floor, no typography, no extra figures. Genuinely transparent alpha background with generous clear margins around whole figure and lotus, retain complete base. Tall narrow portrait silhouette, warm neutral daylight with gentle shadows and fine marble folds, respectful elegant appearance, not cartoon mascot, not golden seated Buddha.

## Prompt sửa bố cục — input day.png

Edit this exact game courtyard background, preserve its camera, beautiful daylight, trees, sky, pavilions, colors, style and overall symmetrical composition. Crucial game-layout correction: the entire bottom 50% of this portrait image must be broad continuous dry flat stone paving from leftmost to rightmost edge, absolutely no ponds, water, plants, lanterns, raised railings or steps in bottom half. Relocate/shrink both lotus ponds and both stone lanterns into the upper half along far left/right edges, with pond bottom edges ending at 49% image height. Move the central empty altar landing slightly upward, top at 44%, bottom at 49% image height. Keep center above platform empty for separate statue. Do not add statue/people/seats/mats/UI/text. Preserve portrait 9:16 full bleed. Leave a subtle central paving path and uniform wide floor suited to 100 separate seat markers rendered by code.

## Prompt ban đêm — input day-v2.png

Create the NIGHT LIGHTING variant of this EXACT outdoor Vietnamese Buddhist courtyard game background. Preserve pixel-aligned composition, camera, every tree trunk, roof, stone slab, platform, side lotus ponds, TWO stone lanterns, all positions and dimensions. Change only time/lighting: deep indigo evening sky, distant mountains blue silhouettes, bodhi leaves dark teal, subtle warm golden light glowing from both stone lantern windows and inside side pavilions, gentle warm pools on near ground. Courtyard floor remains clearly visible soft blue stone with no harsh black areas. Peaceful luminous night with a few very subtle stars, no moon dominating composition. No statue or people, no text, no new objects, no obstacles on floor, don't move or change perspective. Full portrait same dimensions and exact layout. This image will crossfade directly over the source daylight image, so geometric alignment is essential.
