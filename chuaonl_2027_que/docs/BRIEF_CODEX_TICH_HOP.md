# CODEX BRIEF — Bước 3.2.5J: Xin quẻ Đinh Mùi 2027

## Trạng thái bàn giao

**Đây là gói dữ liệu + module xử lý độc lập + trang DEMO HTML, KHÔNG PHẢI bản vá đã cài vào Chùa Online.** Không chép đè `engine.ts` / `main.ts` nếu chưa đọc source Windows 3.2.5I mới nhất. Hai file đó đã thay đổi nhiều lần qua H3 và I, có nguy cơ xung đột khi vá theo mẫu cũ. Gói không có `install.py` cố tình để tránh lỗi `Anchor mismatch`.

## Nội dung

- `data/que_dinh_mui_2027_576.json` — 576 quẻ (384 chủ đề, 144 theo con giáp, 48 Tân Mùi 1991).
- `data/que_dinh_mui_2027_576.csv` — dùng biên tập bằng Excel; giữ UTF-8 BOM.
- `data/index_themes.json` — 16 chủ đề và 12 con giáp.
- `src/fortune-core.mjs` — parse câu xin quẻ và hàng đợi hiện quẻ, không phụ thuộc TikTok, không yêu cầu quà.
- `tests/fortune.test.mjs` — test offline bằng `node --test`.
- `XEM_THU_QUE_2027.html` — giao diện 9:16 để xem quẻ, mở trực tiếp, không kết nối LIVE.

## Phân chia việc cần làm trong code hiện tại

### P0: Server an toàn và tương thích

1. Đọc source mới nhất: `packages/shared/src/index.ts`, `apps/server/src/engine.ts`, `apps/server/src/app.ts`, `apps/server/src/tiktok/mapper.ts`, `apps/overlay/src/main.ts`, `apps/overlay/src/audio.ts`. Tạo checkpoint/backup trước mọi thay đổi.
2. **Phát hiện bình luận xin quẻ ở ranh giới xác thực sự kiện**, sau khi raw chat đã qua Zod và xác nhận đúng session/room, nhưng trước khi `normalizeEvent()` bỏ văn bản nguyên bản. Đừng ghi nội dung chat thô xuống log hoặc settings. Gắn duy nhất `fortuneIntent` (scope, theme hoặc number) cho DomainEvent.
3. Chỉ xử lý `e.type === 'chat'`, không kích hoạt từ `member`, `gift`, `like`, HTTP/browser tự gửi làm giả LIVE. Kiểm tra event ID đã qua chống trùng và phân vùng phòng.
4. Khi nhận bình luận chuẩn, gọi `FortuneQueue.onIntent({sessionId, userKey, displayName, eventId, intent, now})`. Không tạo quẻ từ `gift`; không thay `gifts.confirm`, `giftScoreboard`, `queueRitual`, tính điểm hay thời gian thắp nhang 7200ms.
5. Khi `tick`, gọi `fortuneQueue.next(now)` (tối đa 1 thẻ/7 giây), phát **action mới** `FORTUNE_REVEAL` với `fortuneId`, tên sạch, tiêu đề và lời ngắn. Thêm DTO schema và giới hạn độ dài; idempotent theo ID/session. Khi Reset hoặc thay room/session, reset FortuneQueue, không dùng danh tính phiên cũ.
6. Giữ số sự kiện chờ <=32 và chống trùng ID; một người xin 1 lần / chủ đề / ngày, cooldown 60 giây. Không suy ra 1 quẻ mỗi người từ nickname: phải dùng `userKey` ổn định của server.
7. Module `FortuneQueue` không có IO. Server nạp JSON một lần từ đường dẫn nằm trong build `dist`, không tải Internet trong LIVE. Dùng `path` tương đối/asset copy để tương thích Windows. Có fallback nếu thiếu JSON, không làm sập server.

### P1: Overlay

- Thêm bảng xăm gỗ/giấy ngà viền vàng (không thay tượng Phật), chiếm tối đa khoảng 22–26% chiều cao bên dưới hoặc một bên, không che mặt Phật, lư hương, bảng công đức.
- Hiện trong 7–10 giây: tên người xin quẻ, số quẻ, tên quẻ, 1–2 câu ngắn, 1 việc nhỏ nên làm. Câu dài xử lý nhiều dòng, clip và scale ở 1080×1920 / 576×1024.
- 1 tiếng chuông/mõ nhẹ khi mở quẻ (tùy chọn, không tranh âm với SFX tặng quà). Giọng TTS đã ổn ưu tiên lời cảm ơn người tặng; lời quẻ nên TTS 1 câu ngắn hoặc tắt mặc định để không ùn âm thanh.
- Cung cấp toggle `bật xin quẻ`, `bật đọc quẻ`, `âm lượng`, `tần suất`; mặc định bật xem nhưng voice xin quẻ có thể tắt. Khi test live thì không reset toàn bộ ứng dụng.

### P2: Dashboard và E2E

- Bảng giới thiệu 3 lệnh phổ biến, nút DEMO "Rút quẻ thử", thống kê quẻ đã phát/người chờ/quẻ bị cooldown.
- Quà hoàn tất độc lập, không yêu cầu tặng quà để được xin quẻ. Không dùng gift ID làm seed, quẻ không ưu tiên người gửi quà.
- 20–50 bình luận trong 10s: vẫn 30 FPS mục tiêu và không quá 32 quẻ chờ; không nhân đôi qua reconnect; Reset sạch; phân vùng phòng LIVE; tên trùng/ID khác không lẫn; không chứa raw chat/log nhạy cảm.
- Sau khi ghép xong, chạy `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, các E2E fixture liên quan; kiểm tra âm thanh OBS/LIVE Studio và screenshot trước khi LIVE thật.

## Mốc âm lịch và thông điệp trung thực

- 2027 là **Đinh Mùi**, Tết Nguyên đán 06/02/2027 (UTC+7), không phải Tân Mùi.
- **Tân Mùi 1991** là bộ quẻ tùy chọn, chỉ khi người xem tự bình luận `xin quẻ 1991`; không thu thập ngày sinh, giới tính hay thông tin cá nhân khác.
- 576 câu được viết mới, không nhận là quẻ Kinh Dịch/Xăm chùa chính thống hoặc lời Phật dạy. Hiển thị: “Quẻ văn hóa – chiêm nghiệm; chỉ để tham khảo”.

## Demo module tối thiểu (server test; không inject live)

```js
import { readFileSync } from 'node:fs';
import { FortuneQueue, parseFortuneCommand } from './src/fortune-core.mjs';
const items = JSON.parse(readFileSync('./data/que_dinh_mui_2027_576.json','utf8')).items;
const fortunes = new FortuneQueue(items);
// `parsedEvent` is an ALREADY validated server-side chat event:
const intent = parseFortuneCommand(parsedEvent.text);
fortunes.onIntent({sessionId, userKey, displayName, eventId, intent, now:Date.now()});
const reveal = fortunes.next(Date.now());
if(reveal) console.log(reveal.overlay); // DEMO only: renderer action should be server-authorized
```

Không sao chép đoạn console.log này vào LIVE; chuyển qua action/socket có schema xác thực đã tồn tại.
