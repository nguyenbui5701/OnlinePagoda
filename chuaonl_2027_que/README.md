# Chùa Online — 576 quẻ Đinh Mùi 2027

**Gói mở rộng Bước J:** Dữ liệu và nguyên mẫu, không chỉnh trực tiếp mã nguồn Chùa Online hiện đang chạy.

- **2027 là Đinh Mùi, Tết 06/02/2027**. Tân Mùi là năm sinh 1991; có 48 quẻ bổ sung dành cho chủ đề này.
- 576 quẻ **tự biên soạn mới**, không phải quẻ xăm truyền thống, không khẳng định tiên đoán. Quẻ miễn phí, không cần quà TikTok.
- 384 quẻ/16 chủ đề, 144 quẻ/12 con giáp, 48 quẻ Tân Mùi 1991.
- Có trang HTML 9:16 duyệt toàn bộ quẻ, CSV/JSON để sửa nội dung và module NodeJS nhận diện lệnh/chat, có kiểm thử 8/8 đạt.

## Xem thử ngay

Giải nén ZIP rồi mở file `XEM_THU_QUE_2027.html` bằng trình duyệt. Chọn chủ đề, bấm `RÚT QUẺ XEM THỬ` hoặc nhập số 001–576. Trang này hoạt động độc lập và **không tự kết nối** TikTok, không tác động điểm hay nhân vật.

## Kiểm thử module

```powershell
cd D:\Vibecode\chuaonl\chuaonl_2027_que
node --test .\tests\fortune.test.mjs
```

Nếu muốn Codex gắn vào ứng dụng, gửi cả gói ZIP và tài liệu `docs/BRIEF_CODEX_TICH_HOP.md`. Codex phải đọc **source mới nhất** trước khi thay đổi; không chạy installer của các bản cũ.

## Ý tưởng trải nghiệm người xem

- Bình luận `xin quẻ` hoặc `xin xăm` → rút quẻ chủ đề chung.
- Bình luận `xin quẻ gia đạo` hoặc chủ đề khác → rút đúng nhóm.
- Bình luận `xin quẻ tuổi Mùi` → rút quẻ theo con giáp do người xem tự chọn.
- Bình luận `xin quẻ 1991` hoặc `xin quẻ Tân Mùi` → nhóm riêng cho Tân Mùi 1991.
- Bình luận `xem quẻ 123` → đọc quẻ số 123.
- Lời quẻ là lời gợi mở, không yêu cầu quà tặng, không thu thập ngày sinh thực tế.

Tài liệu chi tiết: `docs/HUONG_DAN_NGUOI_XEM.md`, `docs/BRIEF_CODEX_TICH_HOP.md`.
