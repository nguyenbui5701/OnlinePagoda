# Giọng tiếng Việt Giai đoạn 3.1

Ngày: 01/11/2026. Người dùng đã nghe `rose.wav` và xác nhận **“Rõ, dùng giọng này”**. Mẫu Piper cũ bị đánh giá khó nghe đã chuyển sang thư mục bằng chứng, không được ứng dụng tải.

- Giọng: Google Translate Vietnamese qua [gTTS 2.5.4](https://gtts.readthedocs.io/en/latest/), tạo trước bằng `scripts/generate-stage31-voice-v2.py --all`.
- Nội dung: 9 câu gốc trong `scripts/voice-phrases.json`, lời cảm ơn theo 8 nhóm quà và câu chung. Chỉ gửi các câu cố định khi tạo tài nguyên; không gửi tên, ID hoặc bình luận của người xem.
- File `.mp3`: kết quả tạo giọng. `.wav`: bản PCM mono 24 kHz, âm lượng nguồn 0,8 để nghe/kiểm tra. `.voice.json`: cùng PCM16 đóng gói base64 để runtime tải cục bộ và tạo AudioBuffer, tránh phản hồi rỗng của đường media đã gặp trên máy này.
- Không cần mạng, Python, gTTS hoặc FFmpeg khi chạy app. Build chỉ sao chép các file đã tạo. Công cụ tạo lại là bước phát triển riêng, không nằm trong `npm run build`.
- Fallback không đọc tên; tên người tặng luôn hiện bằng chữ. Nếu Windows/trình duyệt cung cấp giọng Việt **localService**, chế độ auto có thể đọc tên bằng SpeechSynthesis; chưa kiểm chứng giọng động trên máy hiện tại vì không có giọng Việt cục bộ.
- SFX và âm nền được tổng hợp bằng Web Audio trong `apps/overlay/src/audio.ts`, không lấy từ clip/video. Tám nhóm có nhịp/cao độ riêng; cá có thêm nhiễu lọc mềm mô phỏng nước. Chuông là âm tổng hợp, không phải bản thu chuông chùa thật.

Lời đọc và nguồn tạo giọng được liệt kê chi tiết trong `manifest.json`. Không tuyên bố đây là giọng người thu riêng hoặc quyền độc quyền đối với giọng dịch vụ.
