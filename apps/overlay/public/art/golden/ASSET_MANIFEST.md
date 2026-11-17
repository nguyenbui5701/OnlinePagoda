# Bộ hình Chánh điện vàng

Tạo cho Vườn Sen An Lành bằng công cụ `image_gen` tích hợp, theo skill `imagegen`; không dùng API key, không tải hình khi chạy ứng dụng. Ngày bàn giao: 01/11/2026. Các PNG là tài nguyên đồ họa, **không phải ảnh chụp ứng dụng**. Screenshot thực chạy nằm trong `artifacts/stage3/`.

| File | Công dụng | Nguồn output image_gen |
|---|---|---|
| temple-hall.png | Kiến trúc gỗ, đèn, bàn thờ, sàn và thảm; nền 941×1672 | exec-1fe29c58-60bf-45b5-baf1-b9272deb0af3.png |
| buddha-lotus.png | Tượng và đài sen, lớp alpha độc lập | exec-9eff0ac7-4d61-440f-9f76-3591710cb9ab.png |
| devotees.png | Atlas 1536×1024; 4 nhân vật × 2 tư thế, alpha thật | exec-54b6745d-dd42-4bc0-8a05-4297dcaaa9ae.png |
| incense-burner.png | Lư hương đồng, alpha độc lập | exec-5156b0ac-6b70-4af0-ab58-dd9afb41cb2a.png |
| devotees-back.png | Giai đoạn 3.1: 4 trang phục × 3 tư thế mặt sau đứng/quỳ/cúi; alpha thật | exec-e496bfe2-bfad-45ca-8c91-985c430643f6.png |
| devotees-side.png | 05/11: 4 trang phục trong atlas 2×2, nghiêng trái; mirror sprite để đi phải; RGBA 1263×1246 | exec-08a35fec-f4ba-4abf-86ff-9cfa5c20c0a8.png; prompt đầy đủ trong devotees-side.prompt.md |

Output gốc ở `C:/Users/tuank/.codex/generated_images/01a1920b-aa16-7840-ad57-737de3e7d0f6/`. Bản dùng trong sản phẩm đã được sao chép vào thư mục này; không phụ thuộc đường dẫn máy phát triển.

## Nội dung prompt đã dùng (tóm lược, không phải bản chép nguyên văn)

1. Tạo kiến trúc chánh điện Việt Nam nguyên bản, dọc 9:16, ánh sáng vàng ấm, gỗ sẫm chạm trổ, cột, đèn lồng, nến, hoa; hốc thờ giữa để trống cho tượng riêng; sàn và thảm đỏ ở nửa dưới. Không người, tượng, chữ, logo, panel giao diện.
2. Tạo tượng Phật vàng ngồi thiền trên đài sen ba tầng, chi tiết kim loại và nếp áo, nền trong suốt; không hào quang, chữ hoặc cảnh nền.
3. Tạo atlas chibi nguyên bản 4 cột × 2 hàng; bốn biến thể áo lam, nâu, ngà, hồng sen; hàng trên đứng, hàng dưới quỳ chắp tay; nhân vật nhất quán, không chữ. Bản đầu: `exec-3a01db13-9d6b-4890-bd4a-06777ce16330.png`.
4. Sửa atlas bằng image_gen: bỏ nền, giữ chính xác bố cục và kích thước 1536×1024, bảo toàn từng nhân vật, alpha trong suốt. Runtime chỉ lấy các ô sprite và bỏ padding alpha; không cắt nhân vật từ ảnh tham khảo.
5. Tạo lư hương đồng nguyên bản có tay rồng, họa tiết sen, chân đế, que nhang đỏ; góc nhìn chính diện, nền trong suốt, không khói. Khói được vẽ và hoạt ảnh trong ứng dụng.
6. Giai đoạn 3.1: tạo atlas nguyên bản 4 cột × 3 hàng, cùng áo lam/nâu/ngà/hồng; nhìn hoàn toàn từ sau, không thấy mặt/mắt; hàng đứng, quỳ, cúi lễ hướng lên tượng. Nền trong suốt. Renderer lấy ba hàng và nội suy chuyển tư thế, không lật ngang sprite mặt trước.

Hiệu ứng quà Giai đoạn 3.1 là hình thủ tục PixiJS trong `golden/gift-effects.ts`: nến/cánh hoa, đèn tim, sen, chuông, mâm quả, cá biểu tượng, hoa đăng, rồng vàng cách điệu. Không trích hình/âm thanh clip. Ảnh ứng dụng thực chạy ở `artifacts/stage3_1/`.

Ảnh trong `stage3_reference` chỉ dùng định hướng; không dùng screenshot mẫu làm nền sản phẩm hay cắt logo, tên, bảng, nhân vật từ đó. Các panel, chữ tiếng Việt, hào quang, khói, hoa tương tác, nhãn và chuyển động được render bằng PixiJS/Canvas; không nằm sẵn trong ảnh. Font dùng Segoe UI/Georgia có trên Windows, không phân phối file font. Classic giữ bộ hình vẽ bằng code của Giai đoạn 1–2.

Đây là bộ ảnh sinh bằng AI, không tuyên bố độc quyền pháp lý. Chất lượng hiện tại là cảnh 2.5D nhiều lớp, không phải mô hình 3D hoặc chuyển động nhân vật rig đầy đủ. Nền gốc thấp hơn 1080×1920 nên chi tiết nền không thể bằng một render 4K; chữ và hình giao diện vẫn render ở canvas 1080×1920.
