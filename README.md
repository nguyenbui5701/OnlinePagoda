# Vườn Sen An Lành — OnlinePagoda

Ứng dụng tương tác cho **TikTok LIVE trên Windows**: chánh điện Phật vàng, sân Quan Âm, nhân vật người xem, hành lễ, hiệu ứng quà/bình luận, xin quẻ, hoa đăng và camera đa góc. Công nghệ: Node.js, TypeScript, React, PixiJS, Socket.IO; cửa sổ capture 9:16 dùng Electron.

Repository gồm source, ảnh/âm thanh cần chạy, kho 576 quẻ và kiểm thử. Không chứa thư viện đã cài, `dist`, `.env`, dữ liệu phiên LIVE, cache giọng, video và log kiểm thử.

## Cài đặt trên Windows

Cần Git, **Node.js 22.12+** kèm npm và Edge/Chrome có tăng tốc phần cứng. Cần Internet để cài thư viện và kết nối TikTok. Các lệnh sau chạy trong **PowerShell**:

```powershell
git clone https://github.com/nguyenbui5701/OnlinePagoda.git
cd OnlinePagoda
npm.cmd ci
npm.cmd run build
.\start.bat
```

Hoặc sau khi clone, chạy `install.bat` lần đầu rồi `start.bat`. Giữ cửa sổ lệnh mở; **Ctrl+C** để dừng.

- Dashboard: <http://localhost:3000/dashboard/>
- Overlay: <http://localhost:3000/overlay/>

Ứng dụng khởi động ở **DEMO**, không tự kết nối TikTok. Dùng nút thêm người, bình luận và quà giả lập trên dashboard để thử trước. DEMO dùng tài sản cục bộ sau khi cài xong; không cần LIVE thật.

`start.bat` dùng build có sẵn; sau khi sửa/cập nhật source phải build lại. **Không build đè hoặc restart khi đang LIVE.** Launcher không tự dừng server đang chiếm cổng 3000.

## Giọng đọc tiếng Việt

Âm thanh dựng sẵn nằm trong `apps/overlay/public/audio/`. Giọng đọc tên và nội dung động dùng Google gTTS qua Python, cần Internet; tên đã lọc/nội dung đọc được gửi tới dịch vụ khi tạo giọng.

Cài **Python 3.10+** và **FFmpeg** riêng. Đưa FFmpeg vào PATH hoặc cấu hình đường dẫn như dưới đây:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# Chỉ copy khi chưa có .env, tránh ghi đè cấu hình riêng:
Copy-Item .env.example .env
```

Chỉnh `.env` theo đường dẫn thực trên máy:

```dotenv
PORT=3000
TTS_DYNAMIC_ENABLED=1
TTS_PYTHON=D:/OnlinePagoda/.venv/Scripts/python.exe
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
```

Sau khi server cũ đã dừng, chạy **`start-que-co-giong.bat`**. Launcher kiểm tra Python/gTTS/FFmpeg, build và mở ứng dụng. Bật giọng cảm ơn/đọc quẻ/hoa đăng trên dashboard và **bật âm thanh tại cửa sổ overlay dùng phát**.

`requirements.txt` dành cho Python; thư viện Node nằm trong `package.json` + `package-lock.json` và được cài bằng `npm.cmd ci`. Không cần Python để chạy DEMO không có giọng động. Không đưa `node_modules`, `.venv` hoặc FFmpeg lên Git.

## Kết nối TikTok LIVE và capture dọc

1. Bật LIVE công khai trên kênh có quyền phát.
2. Trên dashboard chọn nguồn TikTok LIVE, nhập `@username`, bấm **Kết nối** và đợi `LIVE_CONNECTED`.
3. Dùng tài khoản khác bình luận để đối chiếu tên/hiệu ứng. Tạo người từ sự kiện vừa vào phòng có tùy chọn riêng; sự kiện này không luôn đầy đủ.
4. Giữ server chạy, mở **`mo-overlay-doc.bat`**.
5. Trong TikTok LIVE Studio thêm **Window Capture**, chọn **Vườn Sen · Capture dọc** của Electron, tắt con trỏ và căn khung 9:16. **Ctrl+Shift+9** căn lại cửa sổ; **Alt+F4** đóng riêng capture.

Kết nối TikTok chỉ nhận tương tác, **không tự chèn overlay vào video phát từ điện thoại**. Cần đưa cửa sổ vào cảnh phát LIVE Studio. Capture hình không tự bảo đảm thu âm thanh: kiểm tra nghe trên máy, cấu hình nguồn âm thanh LIVE Studio, rồi kiểm tra điện thoại người xem.

Ứng dụng không chính thức. `tiktok-live-connector` được khóa phiên bản trong npm lockfile và có thể phụ thuộc dịch vụ ký bên thứ ba. Không nhập mật khẩu, cookie hoặc session token TikTok. Khi kết nối bị giới hạn/lỗi, xem trạng thái dashboard; DEMO vẫn dùng được. Không cần mua quà để thử chức năng miễn phí.

## Lệnh bình luận

| Bình luận | Chức năng |
| --- | --- |
| `vào chùa`, `ngồi`, `xin chỗ` | Xin ghế |
| `lạy`, `lạy Phật`, `lễ Phật`, `đảnh lễ` | Hành lễ |
| `thắp nhang`, `thắp hương`, `dâng hương` | Dâng hương miễn phí |
| `cầu an`, `nam mô`, `a di đà phật` | Cầu an/niệm Phật |
| `hoa sen`, `thắp nến`, `trái tim`, `chuông` | Hiệu ứng miễn phí |
| `ngũ quả`, `cá chép`, `rồng vàng`, `phượng hoàng`, `long phụng` | Hiệu ứng miễn phí |
| `sen yêu thương`, `sen cá chép`, `sen ánh nến` | Hiệu ứng phối hợp |
| `hoa đăng`, `hoa đăng gia đình` | Thả đèn kèm lời chúc soạn sẵn |
| `xin quẻ`, `xin quẻ công việc`, `xin quẻ 1991`, `xem quẻ 123` | Xin/xem quẻ |

Các tính năng cần được bật trên dashboard. Hỗ trợ dấu/không dấu và nhiều lời dẫn; vẫn loại câu phủ định, cấu trúc không được hỗ trợ và yêu cầu nhiều tính năng cùng lúc.

**Cooldown 5 giây/người**; các hiệu ứng bình luận dùng chung cooldown với nhau. Hết cooldown không có nghĩa phát ngay: vẫn giữ hàng đợi, lượt đang hành lễ và ưu tiên quà. Bảng quẻ/hoa đăng hiện 4 giây, giọng tiếp tục theo thời hạn riêng.

100 ghế và tối đa 20 người đứng được vẽ. Hết giờ ngồi thì ra khu đứng và vẫn tương tác; xin lại ghế bằng lệnh ngồi. Không suy ra chắc chắn người xem im lặng đã rời LIVE.

Sen avatar dành cho quà; bình luận không có avatar. Combo theo từng người, chốt điểm khi kết thúc. Quà nhỏ tối đa hai lượt cùng lúc nếu đủ chỗ; quà lớn xếp lượt riêng. Quà thiếu giá trị/ID chưa xác nhận dùng quy tắc dự phòng của source, không suy giá từ tên.

## Cập nhật và dữ liệu riêng

`.env` và `data/` chỉ ở máy chạy; ứng dụng tạo dữ liệu cục bộ khi cần. Sao lưu riêng nếu muốn chuyển cài đặt. Giữ `apps/overlay/public/` và `apps/server/src/data/` khi clone: đó là tài sản/kho quẻ cần chạy.

Sau khi kết thúc LIVE, khi không có sửa local chưa lưu:

```powershell
git pull --ff-only
npm.cmd ci
npm.cmd run build
.\start.bat
```

Nếu dùng giọng động, chạy `start-que-co-giong.bat` thay cho `start.bat`.

## Phát triển và kiểm thử

```powershell
npm.cmd run dev
```

Dev phục vụ cả hai giao diện ở cổng 3000; không chạy cùng production ở cổng đó.

```powershell
npm.cmd run typecheck
npm.cmd test
```

Kiểm thử cách ly đầy đủ: `kiem-tra-hoan-thien-trai-nghiem-v2.bat`; thêm `--stress` để thử 120 người/30 phút. Build thử trong `test-results/`, ảnh/video/log/report trong `artifacts/temple-experience-v2/`. Không chạy nhiều BAT cùng lúc vì có thể dùng chung cổng/thư mục. Xem [ghi chú phát triển](docs/DEVELOPMENT.md).

**Trạng thái source:** đã sửa lỗi bố trí hai sen nhỏ, đang chờ chạy lại kiểm thử sau sửa. Việc push repository không có nghĩa đã kiểm chứng build/E2E trên máy mới, LIVE Studio, avatar CDN và âm thanh/ảnh trên điện thoại.
