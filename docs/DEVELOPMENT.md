# Cấu trúc và tái tạo môi trường

| Thư mục | Nội dung |
| --- | --- |
| `apps/server/src` | Engine, connector TikTok, hàng đợi, giọng |
| `apps/dashboard/src` | Điều khiển DEMO/LIVE |
| `apps/overlay/src` | PixiJS, camera, nhân vật, âm thanh |
| `apps/overlay/public` | Ảnh, sprite, âm thanh chạy ứng dụng |
| `packages/shared/src` | Schema, kiểu dữ liệu và tính toán chung |
| `tests` | Unit, fixture cách ly |
| `scripts` | Build, capture, tạo giọng, kiểm thử |
| `stage4_assets/incoming` | Ba ảnh gốc dùng đối chiếu trong unit |
| `chuaonl_2027_que` | Bộ 576 quẻ và công cụ dữ liệu |

`npm.cmd ci` dùng `package-lock.json`. Electron nằm trong devDependencies vì launcher capture dùng nó; không cài với `--omit=dev` trên máy desktop này. Tài sản hiện đóng gói không cần Git LFS.

Python runtime chỉ cần `requirements.txt`; FFmpeg cài riêng. Kiểm tra ảnh/ghi loopback tùy chọn:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

`generate-stage31-voice.py` là công cụ Piper cũ, không cần để chạy ứng dụng; nếu dùng lại cần cài `piper-tts` và model riêng. Giọng hiện tại dùng gTTS. Các bài preservation/baseline lịch sử cần checkpoint/build cũ không có trong repo, không phải bước cài đặt bắt buộc.

Runner E2E dùng Edge tại `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Nếu máy cài nơi khác, chỉnh `executablePath` trong runner tương ứng; bộ mới dùng `scripts/visual-fixture.mjs`. Unit/typecheck không mở trình duyệt.

Build riêng, không ghi vào `dist` đang LIVE:

```powershell
$env:APP_BUILD_DIRECTORY='test-results/manual-build'
npm.cmd run build
Remove-Item Env:APP_BUILD_DIRECTORY
```

BAT kiểm thử tự chọn build/data cách ly. Chỉ áp dụng production sau khi kết thúc LIVE và duyệt hình/âm thanh. Dữ liệu kênh, cache giọng, báo cáo và video cục bộ không đưa lên Git.

`.gitignore` dùng danh sách cho phép ở gốc để tránh đưa bộ cài, ZIP, bản vá cũ và tài liệu dự án khác vào repo. Khi thêm thư mục source mới ở gốc, thêm mục cho phép; không dùng `git add -f` cho dữ liệu riêng/thư viện.
