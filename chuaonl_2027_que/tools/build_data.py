#!/usr/bin/env python3
"""Creates original Vietnamese cultural-reflection fortune content; no web content copied."""
import json, csv, hashlib, re
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

# Each is fully original: title | reflection | doable non-commercial action.
THEMES = {
'binh_an':('Bình an','🕊️', '''Ngọn đèn hiền|Giữ được bình tĩnh trong một chuyện nhỏ cũng là giữ sáng cả ngày.|Chọn một việc có thể làm ngay, đừng ôm tất cả.
Dòng suối trong|Khi tâm rối, điều hữu ích nhất thường là nhìn sự việc chậm lại.|Dành vài phút ngồi yên và gọi tên điều mình lo.
Gió qua hiên|Một lời trái ý không nhất thiết quyết định tâm trạng cả ngày.|Đợi cảm xúc lắng xuống rồi mới trả lời.
Cánh cửa mở|Bình an không phải không có đổi thay mà là biết thích nghi.|Ghi ra điều có thể kiểm soát và điều cần buông.
Một hạt mưa|Những tiến bộ nhỏ vẫn đáng được ghi nhận.|Khen bản thân một nỗ lực thực tế hôm nay.
Bếp lửa ấm|Sự quan tâm giản dị giúp một ngày bình thường dịu lại.|Hỏi thăm một người đã lâu chưa trò chuyện.
Lá sen khô|Không phải vướng mắc nào cũng cần giải quyết trong một ngày.|Sắp việc khó thành ba bước nhỏ.
Tiếng chuông xa|Sự yên ổn đôi khi đến từ việc biết nói không.|Từ chối lịch hẹn vượt quá sức mình một cách tử tế.
Vầng trăng nhạt|Dù hôm nay thiếu hoàn hảo, ngày mai vẫn có khoảng trống để sửa.|Chọn một điều cần điều chỉnh vào sáng mai.
Bậc thềm cũ|Nề nếp giản dị tạo chỗ dựa khi xung quanh đổi khác.|Dọn một góc nhỏ trong nhà cho gọn.
Tách trà nguội|Đừng để sự vội vàng khiến mình quên nhu cầu nghỉ ngơi.|Để điện thoại xa trong một khoảng ngắn.
Con đường sương|Khi chưa rõ phía trước, một bước chắc chắn hơn mười lời hứa.|Chỉ cam kết điều đủ nguồn lực để thực hiện.'''),
'gia_dao':('Gia đạo','🏠', '''Mâm cơm sum vầy|Bữa cơm có mặt nhau quý hơn câu chuyện phải hoàn hảo.|Mời gia đình ăn một bữa không thiết bị.
Cửa nhà êm|Không khí gia đình dễ tốt lên từ việc lắng nghe một câu trọn vẹn.|Lắng nghe người thân mà chưa vội góp ý.
Góc bếp sáng|Việc nhà được chia sẻ sẽ giảm những giận hờn âm thầm.|Chủ động nhận một việc nhà cụ thể.
Vườn sau nắng|Khoảng cách đôi khi xuất phát từ thiếu thời gian chứ không thiếu tình.|Sắp một cuộc trò chuyện ngắn với người thân.
Áo cũ thơm|Nhớ việc tốt từng nhận giúp ta bớt chỉ nhìn thiếu sót.|Nói lời cảm ơn vì một việc nhỏ trong nhà.
Dây diều mềm|Quan tâm không đồng nghĩa kiểm soát mọi quyết định của người khác.|Tôn trọng một sở thích khác mình của người thân.
Cành mai trước ngõ|Ngày vui hơn khi không ai phải tự gánh hết việc chuẩn bị.|Cùng lập danh sách việc cần chia sẻ.
Giếng nước hiền|Chuyện cũ chỉ nên nhắc lại khi giúp hiểu nhau hơn.|Tránh dùng một sai lầm cũ để thắng tranh luận.
Thềm nắng chiều|Người lớn và trẻ nhỏ đều cần cảm giác được ghi nhận.|Khen một điểm tiến bộ cụ thể của thành viên.
Đèn phòng khách|Giữ lời hứa nhỏ tạo niềm tin lâu dài.|Hoàn thành một lời đã hứa với gia đình.
Chiếc ghế trống|Có người ít nói nhưng vẫn mong được hỏi han.|Nhắn một tin chân thành cho người ở xa.
Tường nhà vững|Sự bình yên cần cả ranh giới và sự quan tâm.|Thống nhất giờ nghỉ hay khoảng riêng cho mọi người.'''),
'suc_khoe':('Sức khỏe','🌿', '''Hơi thở đều|Lắng nghe dấu hiệu mệt mỏi có ích hơn việc cố chịu đựng.|Sắp xếp một khoảng nghỉ thực sự trong lịch.
Chân bước nhẹ|Vận động đều đặn bắt đầu từ mức vừa sức.|Đi bộ nhẹ nếu điều kiện sức khỏe phù hợp.
Giọt nước trong|Những thói quen cơ bản tạo nền cho sinh hoạt tốt hơn.|Để sẵn nước uống ở nơi dễ thấy.
Giấc ngủ an|Một ngày hiệu quả cần thời gian phục hồi.|Chọn giờ đi ngủ tương đối ổn định.
Mùa rau mới|Bữa ăn cân bằng không cần chạy theo lời quảng cáo kỳ lạ.|Thêm một lựa chọn thực phẩm đa dạng trong bữa.
Nắng ngoài hiên|Ra khỏi màn hình đôi lúc giúp đầu óc dễ chịu.|Đứng lên, đổi tư thế và nghỉ mắt.
Cây mọc chậm|Thể lực tiến bộ theo quá trình, không theo lời thúc giục.|Đặt mục tiêu sinh hoạt nhỏ vừa sức.
Khăn tay sạch|Chủ động chăm sóc bản thân là điều đáng trân trọng.|Ghi lại một thói quen muốn cải thiện.
Nhịp tim hiền|Đừng lấy sức khỏe của người khác làm thước đo cho mình.|Điều chỉnh kế hoạch theo thể trạng cá nhân.
Bờ vai thả|Giảm căng thẳng có thể bắt đầu bằng nghỉ ngắn hợp lý.|Thử thư giãn vùng vai và hít thở nhẹ nhàng.
Sáng sớm yên|Một nhịp sinh hoạt ổn định giúp dễ duy trì kế hoạch.|Chuẩn bị đồ dùng cần thiết từ tối hôm trước.
Tấm lịch chăm sóc|Khi lo lắng kéo dài, thông tin chuyên môn tốt hơn đoán mò.|Ghi câu hỏi cần trao đổi với nhân viên y tế.'''),
'cong_viec':('Công việc','🧰', '''Trang giấy mới|Việc lớn sẽ bớt khó khi xác định một ưu tiên rõ ràng.|Viết ra ba đầu việc và chọn việc quan trọng nhất.
Chiếc bàn sáng|Sự rõ ràng trong trao đổi giảm sai sót không cần thiết.|Xác nhận lại yêu cầu công việc bằng một câu ngắn.
Đường kim khéo|Chất lượng ổn định có giá trị hơn khoe bận rộn.|Kiểm tra một chi tiết trước khi bàn giao.
Ngọn đèn học việc|Một kỹ năng mới có thể mở cách xử lý cũ.|Chọn một kỹ năng phù hợp để học trong tuần.
Ngã ba tỉnh táo|Không phải lời mời nào cũng đáng nhận ngay.|Đọc kỹ điều kiện trước khi đồng ý.
Bàn tay chung|Làm việc nhóm tốt cần nêu rõ ai phụ trách điều gì.|Hẹn lại thời hạn và người chịu trách nhiệm.
Hạt giống nghề|Kết quả bền thường đến từ những ngày tiến bộ khó nhìn thấy.|Lưu lại một thành tựu nhỏ để theo dõi.
Chiếc khóa vừa|Bảo vệ thời gian tập trung là bảo vệ chất lượng.|Dành một khung giờ không bị ngắt quãng.
Gió đầu mùa|Thay đổi kế hoạch có thể là cơ hội sửa cách làm.|Liệt kê phương án dự phòng cho nhiệm vụ chính.
Gương soi nghề|Phản hồi cụ thể giúp tiến bộ hơn lời khen mơ hồ.|Nhờ một người góp ý vào sản phẩm thực tế.
Bậc thang thấp|Tiến chậm nhưng có hệ thống vẫn là tiến.|Hoàn thành bước nhỏ đã trì hoãn.
Đường về đúng giờ|Ranh giới làm việc và nghỉ ngơi cần được tôn trọng.|Xác định giờ dừng công việc hôm nay.'''),
 'tai_loc':('Tài lộc','🪙', '''Hũ gạo đầy|Giữ được phần đã có quan trọng không kém tìm thêm nguồn thu.|Ghi lại ba khoản chi thường gặp.
Đồng xu sáng|Tiền bạc dễ quản lý hơn khi con số được nhìn rõ.|Xem lại ngân sách trong tuần.
Mái hiên kín|Quỹ dự phòng làm giảm áp lực khi phát sinh việc bất ngờ.|Dành một khoản tiết kiệm nhỏ nếu có thể.
Gánh hàng đều|Nguồn thu ổn định thường cần kế hoạch hơn sự nóng vội.|Liệt kê kỹ năng có thể cải thiện thu nhập.
Dòng nước chảy|Một khoản chi nhỏ lặp lại có thể đáng chú ý.|Kiểm tra các đăng ký trả phí không dùng.
Nút thắt nhẹ|Không có quẻ nào thay được việc cân nhắc rủi ro.|Đọc kỹ điều khoản trước khi giao tiền.
Rổ quả chín|Thành quả lao động nên được dành cho cả hiện tại lẫn tương lai.|Phân biệt khoản cần và khoản muốn mua.
Sổ tay gọn|Ghi chép thu chi giúp bớt ra quyết định theo cảm xúc.|Theo dõi chi tiêu trong bảy ngày.
Nắng qua cửa|Đôi lúc cần kiên nhẫn thay vì đuổi theo cơ hội nghe quá tốt.|Dừng lại kiểm chứng một lời quảng cáo hấp dẫn.
Chợ sớm bình|Thỏa thuận minh bạch bảo vệ cả đôi bên.|Giữ hóa đơn hoặc xác nhận bằng văn bản.
Cây nhiều rễ|Không dồn mọi hy vọng vào một nguồn có thể giúp ổn định hơn.|Xem lại kế hoạch dự phòng tài chính.
Hòn đá chặn nước|Mua sắm lúc căng thẳng dễ khác nhu cầu thật.|Đợi một ngày trước quyết định không cấp thiết.'''),
 'hoc_tap':('Học tập','📚', '''Trang đầu tiên|Bắt đầu học quan trọng hơn chờ cảm hứng đủ đầy.|Mở tài liệu và học mười phút tập trung.
Mực mới khô|Ghi lại bằng lời của mình giúp kiến thức bền hơn.|Tự tóm tắt ba ý vừa đọc.
Bậc thềm chữ|Hiểu chậm không đồng nghĩa không thể tiến bộ.|Chia bài khó thành những câu hỏi ngắn.
Đèn bàn nhỏ|Giờ học đều đặn dễ duy trì hơn một đêm thức trắng.|Chọn khung giờ học phù hợp sức mình.
Hạt lúa hiểu|Sai một câu có thể giúp nhận ra điều cần bổ sung.|Xem lại một lỗi và ghi nguyên nhân.
Người hỏi đường|Hỏi đúng câu đôi khi quan trọng hơn cố đoán.|Nhờ thầy cô hoặc bạn giải thích chỗ chưa rõ.
Sách mở nắng|Kiến thức mới dễ hiểu hơn khi gắn với ví dụ thực tế.|Tự đặt một ví dụ của riêng mình.
Tiếng phấn hiền|Ôn tập ngắn nhiều lần giúp tránh quên.|Tạo lịch nhắc ôn từng phần.
Đường chữ quanh co|Đổi cách học khi mắc kẹt là điều bình thường.|Thử sơ đồ hoặc thẻ ghi nhớ.
Bút chì mềm|Chỉnh sửa bản nháp là dấu hiệu đang học.|Viết lại một lời giải cho rõ ràng.
Mầm hiểu biết|Cảm giác tự tin cần dựa vào việc đã tự làm được.|Tự kiểm tra bằng năm câu hỏi nhỏ.
Trang cuối mở|Học xong một phần vẫn nên để lại câu hỏi cho lần sau.|Ghi việc sẽ học tiếp vào ngày mai.'''),
 'tinh_duyen':('Tình duyên','💗', '''Cành đào chớm|Mối quan hệ tốt phát triển từ sự tôn trọng lẫn nhau.|Nói điều mình mong muốn bằng lời rõ ràng.
Chiếc ô chung|Quan tâm không có nghĩa phải đoán được mọi suy nghĩ.|Hỏi đối phương cần được hỗ trợ thế nào.
Dòng thư yên|Một cuộc trò chuyện thật lòng quý hơn nhiều suy diễn.|Chọn thời điểm thích hợp để chia sẻ cảm xúc.
Lối đi đôi|Đi cùng nhau vẫn cần có không gian riêng.|Tôn trọng sở thích và bạn bè của đối phương.
Ngọn nến vừa|Sự vội vàng dễ khiến ta bỏ qua điều quan trọng.|Quan sát hành động nhất quán thay vì lời hứa lớn.
Hoa nở đúng mùa|Độc thân không đồng nghĩa thiếu giá trị.|Dành thời gian cho niềm vui riêng của mình.
Đôi chén trà|Khác biệt nhỏ có thể trao đổi trước khi thành hiểu lầm.|Nói một điều biết ơn ở người bên cạnh.
Ánh mắt chân|Tình cảm không nên buộc ai phải chịu đựng tổn thương.|Nhận diện một ranh giới cần được tôn trọng.
Bến đợi vừa|Không nên đánh mất mình để giữ một mối quan hệ.|Chọn một hoạt động nuôi dưỡng bản thân.
Cánh chim về|Làm hòa cần sự thành thật từ cả hai phía.|Xin lỗi cụ thể nếu mình đã làm tổn thương ai.
Dải lụa mềm|Lắng nghe là cách mở cửa hơn là ép người khác thay đổi.|Nghe trọn câu trước khi phản hồi.
Duyên gặp tử tế|Niềm tin đến từ thời gian và cách đối xử.|Đi chậm và tìm hiểu giá trị sống của nhau.'''),
 'ban_be':('Bạn bè','🤝', '''Bàn trà đông|Bạn tốt đôi khi chỉ cần một lời hỏi han đúng lúc.|Nhắn một lời chúc giản dị cho bạn cũ.
Lối mòn quen|Tình bạn cần cả hiện diện lẫn tôn trọng khoảng riêng.|Chấp nhận một cuộc hẹn bị dời lịch.
Chiếc ghế thêm|Đón người mới không có nghĩa quên người cũ.|Mời một người tham gia hoạt động phù hợp.
Trái ngọt sẻ chia|Niềm vui được chia có thể làm ngày thêm ấm.|Chúc mừng thành công của một người bạn.
Dây đàn hòa|Không phải bất đồng nào cũng làm hỏng tình bạn.|Trao đổi khác biệt mà không công kích.
Chuyến xe ngang|Bạn đồng hành trong một đoạn đường vẫn đáng quý.|Gửi lời cảm ơn cho người từng giúp mình.
Sân chung rộng|Tình bạn lành mạnh không cần kiểm soát nhau.|Tôn trọng quyết định riêng của bạn.
Bụi đường sạch|Tin đồn dễ làm sứt mẻ sự tin cậy.|Xác minh trước khi kể chuyện về người khác.
Cốc nước mát|Sự giúp đỡ nên phù hợp khả năng đôi bên.|Đề nghị giúp một việc nhỏ cụ thể.
Dòng tên cũ|Có người thân thiết đang chờ mình chủ động trước.|Hỏi thăm một người đã lâu ít gặp.
Ngày mưa chia ô|Lúc khó khăn, lắng nghe đôi khi quý hơn lời khuyên.|Hỏi xem bạn muốn được nghe hay muốn nhận góp ý.
Góc sân ấm|Một lời hẹn có giá trị khi được thực hiện.|Giữ đúng giờ cho một cuộc gặp.'''),
 'xuat_hanh':('Xuất hành','🧭', '''Bản đồ mở|Chuyến đi thuận lợi bắt đầu từ việc chuẩn bị thực tế.|Kiểm tra lịch trình và đường đi.
Đôi giày chắc|Đi xa nên ưu tiên sức khỏe và sự an toàn.|Kiểm tra vật dụng cần mang theo.
Đèn đường sáng|Cẩn trọng trên đường là một phần của may mắn.|Dự trù thời gian dự phòng khi di chuyển.
Dấu mốc lành|Một điểm đến mới có thể mở rộng góc nhìn.|Tìm hiểu văn hóa hoặc quy định nơi sẽ đến.
Cánh buồm vừa|Không nên ép lịch trình vượt sức.|Chừa thời gian nghỉ giữa các chặng.
Cầu qua suối|Kế hoạch thay thế giúp bớt lúng túng khi đổi lịch.|Lưu một phương án di chuyển dự phòng.
Túi hành trang|Mang đủ những thứ cần thiết nhẹ hơn mang mọi lo lắng.|Lập danh sách hành lý ngắn.
Bến xe sớm|Đúng giờ tạo cảm giác chủ động.|Kiểm tra thời gian khởi hành một lần nữa.
La bàn đúng|Đến nơi an toàn quan trọng hơn đi nhanh.|Tránh vội vàng khi tham gia giao thông.
Mây đổi hướng|Có lúc thay đổi điểm đến cũng là quyết định tốt.|Kiểm tra dự báo và điều kiện trước chuyến đi.
Cổng làng xa|Mỗi chuyến đi có thể là dịp học thêm điều tử tế.|Chọn một điều mới muốn tìm hiểu.
Đường về ấm|Giữ liên lạc giúp người thân yên tâm.|Thông báo kế hoạch cơ bản cho người cần biết.'''),
 'khai_xuan':('Khai xuân','🌸', '''Mai nở trước sân|Đầu năm là dịp chọn cách sống muốn nuôi dưỡng.|Viết một mong ước thực tế cho năm Đinh Mùi.
Lì xì lời tốt|Lời chúc tử tế có thể ấm hơn quà vật chất.|Chúc người thân một điều cụ thể.
Cánh cửa đầu năm|Bắt đầu mới không cần phủ nhận những nỗ lực cũ.|Ghi điều đã làm tốt trong năm trước.
Tờ lịch mới|Kế hoạch mới hữu ích khi có bước đầu rõ ràng.|Chọn một việc sẽ thực hiện trong tuần đầu.
Bình hoa đầu ngõ|Sắp xếp không gian có thể tạo cảm giác sẵn sàng.|Dọn một góc phòng hoặc bàn làm việc.
Mùi hương nhè nhẹ|Giữ nhịp nhẹ nhàng giúp bước vào năm mới dễ chịu.|Dành thời gian nghỉ đủ trong dịp lễ.
Gặp gỡ đầu xuân|Tái kết nối có thể bắt đầu từ câu hỏi thăm.|Nhắn người bạn muốn gặp lại trong năm.
Nụ cười mới|Không cần đặt mọi kỳ vọng lên một ngày đầu năm.|Chọn mục tiêu linh hoạt thay vì lời thề quá lớn.
Chén trà tết|Một cuộc gặp ngắn cũng có thể ý nghĩa.|Hỏi chuyện người lớn tuổi trong nhà.
Lộc trong tay|Hành động tốt là phần may mắn mình chủ động tạo.|Làm một việc tử tế không cần báo đáp.
Gió mồng một|Một việc không như ý không định nghĩa cả năm.|Giữ một kế hoạch dự phòng cho mục tiêu.
Bước sang sân|Khai xuân bằng điều có thể duy trì mới thật đáng quý.|Chọn một thói quen nhỏ cho ba mươi ngày.'''),
 'tam_an':('Tâm an','🪷', '''Hồ sen tĩnh|Ý nghĩ xuất hiện không nhất thiết là sự thật cần làm theo.|Ghi một suy nghĩ rồi xem bằng góc nhìn khác.
Mây ngang trời|Cảm xúc có thể thay đổi mà không cần bị xua đuổi.|Gọi tên cảm xúc hiện tại thật ngắn gọn.
Ngọn chuông xa|Chú ý tới hiện tại có thể giúp bớt vòng lặp lo lắng.|Nhận biết ba âm thanh đang có xung quanh.
Lá nổi trên nước|Không phải câu hỏi nào cũng cần lời giải lập tức.|Cho mình quyền trì hoãn một quyết định không gấp.
Thềm đá mát|Nghỉ ngơi là phần cần thiết của tiến bộ.|Rời màn hình một lúc và duỗi người.
Ánh nến đứng|Hít thở nhẹ nhàng có thể là điểm tựa khi căng thẳng.|Thử thở tự nhiên chậm hơn trong một phút.
Cửa sổ mở|Có thể xin hỗ trợ mà không làm mình yếu đi.|Chia sẻ một mối lo với người đáng tin.
Mưa rồi tạnh|Một ngày khó không đại diện cho cả cuộc sống.|Nhớ lại một việc mình từng vượt qua.
Mảnh sân yên|So sánh liên tục làm mờ đi thành tựu riêng.|Ghi ba điều mình biết ơn hôm nay.
Bông sen không vội|Tự trách thường không giúp giải quyết nhanh hơn.|Nói với bản thân một câu công bằng hơn.
Nước chảy đều|Thói quen ổn định giúp tâm trí có chỗ dựa.|Giữ một khung giờ thư giãn trong ngày.
Đêm có đèn|Khi lo lắng quá sức hoặc kéo dài, hỗ trợ chuyên môn là đáng quý.|Lập danh sách nguồn hỗ trợ phù hợp nếu cần.'''),
 'du_dinh':('Dự định','🎯', '''Hạt giống mới|Dự định tốt cần đất, nước và thời gian chứ không chỉ háo hức.|Viết mục tiêu bằng một câu đo được.
Bản vẽ nhỏ|Nhìn rõ bước đầu giúp giảm cảm giác xa vời.|Lập ba bước nhỏ cho dự định.
Chiếc thước thật|Đánh giá đúng nguồn lực là cách bảo vệ quyết tâm.|Kiểm tra thời gian và chi phí cần thiết.
Bàn tay bền|Việc đều đặn có thể thắng kế hoạch quá lớn.|Dành mười lăm phút làm bước đầu tiên.
Ngã rẽ sáng|Thay đổi phương án không có nghĩa bỏ mục tiêu.|Ghi một lựa chọn dự phòng.
Hành trang vừa|Không nên nhận quá nhiều mục tiêu cùng lúc.|Tạm gác một việc chưa quan trọng.
Cột mốc gần|Điểm dừng kiểm tra giúp biết mình đang tiến tới đâu.|Đặt ngày xem lại kế hoạch.
Bậc cầu chắc|Kiên trì vẫn cần nhìn lại điều chưa phù hợp.|Xin góp ý từ người có kinh nghiệm.
Dòng mực mới|Ý tưởng cần được thử nhỏ trước khi mở rộng.|Làm bản thử đơn giản trong tuần.
Ngọn gió lành|Sự khích lệ đúng lúc có thể thêm động lực.|Chia sẻ mục tiêu với một người tin cậy.
Đường rộng dần|Đừng đánh giá cả hành trình qua một trục trặc.|Nhận diện một rào cản có thể tháo gỡ.
Hoa kết quả|Nên ghi nhận cả nỗ lực chứ không chỉ đích đến.|Lưu lại một minh chứng tiến bộ.'''),
 'hieu_thuan':('Hiếu thuận','👪', '''Lời hỏi thăm|Quan tâm người lớn tuổi bắt đầu từ sự hiện diện thật lòng.|Gọi điện hỏi một việc thường ngày.
Gánh nhẹ vai|Giúp đỡ cụ thể thường có giá trị hơn lời hứa chung chung.|Hỏi người thân cần hỗ trợ việc gì.
Mâm cơm nóng|Được ăn cùng nhau cũng là một cách gần gũi.|Sắp một bữa cơm chung khi có thể.
Đôi dép trước hiên|Những thói quen nhỏ của người thân đáng được tôn trọng.|Lắng nghe một câu chuyện cũ.
Mùa ảnh cũ|Ký ức chung có thể nối khoảng cách thế hệ.|Xem lại một tấm ảnh gia đình.
Bờ vai vững|Chăm sóc người thân cần cả chăm sóc chính mình.|Sắp lịch hỗ trợ vừa với sức lực.
Cây đa bên ngõ|Sự khác biệt thế hệ không phải lúc nào cũng cần tranh thắng.|Hỏi vì sao người thân nghĩ như vậy.
Cốc trà ấm|Lời cảm ơn đôi lúc chưa được nói đủ.|Cảm ơn một việc cụ thể họ từng làm.
Dấu chân về|Nếu ở xa, duy trì liên lạc đều vẫn rất ý nghĩa.|Đặt lịch gọi định kỳ vừa phải.
Nhà có tiếng cười|Tạo kỷ niệm chung không nhất thiết phải tốn tiền.|Đề nghị một hoạt động giản dị ở nhà.
Lối cửa êm|Tôn trọng và ranh giới lành mạnh giúp quan hệ bền.|Nói rõ khả năng giúp đỡ của mình.
Ngày có nhau|Có thể giữ tình thân bằng những hành động hôm nay.|Hỏi mong muốn gần đây của người lớn tuổi.'''),
 'hoa_giai':('Hòa giải','🌈', '''Cầu gỗ nối|Bất đồng chỉ dễ tháo khi đôi bên được nói hết ý.|Hẹn cuộc trò chuyện không ngắt lời.
Đôi tay mở|Lời xin lỗi cần nhận trách nhiệm cụ thể.|Nhận phần mình làm chưa tốt mà không biện hộ dài.
Bờ sông gần|Không phải ai cũng sẵn sàng hòa giải cùng lúc.|Tôn trọng thời gian của người kia.
Chiếc gương thật|Thừa nhận cảm xúc không đồng nghĩa đồng ý mọi nhận định.|Nói điều mình nghe được bằng lời trung lập.
Mây tan từng lớp|Chuyện lớn dễ giải hơn khi tách từng vấn đề.|Chọn một mâu thuẫn nhỏ nhất để bàn trước.
Lá thư chưa gửi|Viết ra có thể giúp lời nói bớt nóng.|Soạn nháp điều muốn nói rồi đọc lại.
Cánh cửa hai chiều|Hòa giải không thể chỉ do một người gánh.|Xác định điều cả hai cần cam kết.
Gió qua mái|Giảm giọng cao có thể giữ cuộc nói chuyện đi đúng hướng.|Tạm nghỉ nếu tranh luận quá căng.
Đường về khác|Có khi thống nhất tôn trọng khác biệt là đủ.|Chấp nhận một điểm không cần đồng ý.
Mảnh sân mới|Thỏa thuận tốt nên rõ việc nào sẽ đổi.|Ghi lại một nguyên tắc chung cho lần sau.
Trăng sau mưa|Tái xây niềm tin cần hành động theo thời gian.|Thực hiện một lời hứa nhỏ đã thống nhất.
Giọt nước sạch|Hòa giải không có nghĩa quay lại nơi gây tổn thương.|Giữ ranh giới an toàn khi cần.'''),
 'quy_nhan':('Quý nhân','🌟', '''Người chỉ lối|Sự giúp đỡ có thể đến từ lời góp ý hơn là cơ hội lớn.|Hỏi một người có kinh nghiệm về một vấn đề cụ thể.
Tay nối tay|Biết cảm ơn giúp quan hệ hợp tác bền hơn.|Nhắn lời cảm ơn sau khi nhận hỗ trợ.
Ánh đèn học|Người chỉ dẫn tốt giúp mình tự làm tốt hơn.|Ghi lại điều học được từ người hướng dẫn.
Gặp nhau tử tế|Cơ hội gặp người phù hợp dễ đến khi giao tiếp chân thành.|Giới thiệu rõ khả năng khi gặp cộng sự.
Hạt giống chung|Hợp tác cần mục tiêu rõ và đóng góp công bằng.|Thống nhất kỳ vọng với người hợp tác.
Tấm bản đồ được trao|Một lời khuyên hay vẫn cần kiểm chứng với hoàn cảnh riêng.|Đối chiếu lời gợi ý với dữ kiện thực tế.
Bến đợi rộng|Đừng trông chờ người khác quyết định thay mình.|Tự đưa ra hai phương án trước khi xin góp ý.
Chân cầu sáng|Kết nối cũ có thể mang lại bài học mới.|Chủ động hỏi thăm một người từng giúp đỡ.
Đường chung đẹp|Giúp người khác cũng là cách xây cộng đồng lành mạnh.|Chia sẻ một tài liệu hữu ích miễn phí.
Cửa sổ tin|Niềm tin cần được tạo bằng hành động đúng hẹn.|Giữ lời cam kết nhỏ với cộng sự.
Chén trà gặp gỡ|Một cuộc trò chuyện tử tế có thể mở góc nhìn.|Sắp một buổi trao đổi ngắn có mục tiêu.
Tia sáng riêng|Quý nhân không phải người giải quyết hết mọi khó khăn.|Xác định bước mình phải tự thực hiện.'''),
 'phuc_lanh':('Phúc lành','🙏', '''Hạt thiện lành|Điều tốt đẹp bắt đầu từ hành động không cần phô trương.|Giúp một việc nhỏ trong khả năng.
Lời nói dịu|Một câu nói tử tế có thể giảm gánh nặng cho người khác.|Gửi lời động viên cụ thể.
Cánh sen mở|Bình an có thể lớn lên khi mình biết chia sẻ.|Nhường một sự thuận tiện cho người cần hơn.
Mưa đúng mùa|Không phải việc tốt nào cũng nhận đáp lại lập tức.|Làm một điều hữu ích không đợi phần thưởng.
Ánh vàng hiên|Ghi nhớ điều đã nhận giúp ta sống biết ơn.|Cảm ơn người hỗ trợ mình gần đây.
Cây xanh sau nhà|Chăm sóc môi trường cũng là một cách gieo điều lành.|Nhặt một món rác đúng chỗ.
Giọt sáng trong|Cẩn trọng trước lời đồn cũng là giữ công bằng cho người khác.|Không chia sẻ tin chưa kiểm chứng.
Đường tay sạch|Tử tế cần cả sự trung thực trong việc nhỏ.|Nhận lỗi nếu có sai sót của mình.
Chén nước sẻ|Chia sẻ không nhất thiết liên quan tiền bạc.|Dành thời gian hỗ trợ một người.
Nụ cười hiền|Đối xử nhân ái với mình cũng quan trọng như với người.|Nghỉ ngơi khi cơ thể cần.
Bông lúa cúi|Khiêm tốn giúp mình còn chỗ học điều mới.|Lắng nghe một góp ý mà không phòng thủ.
Ngọn đèn lan|Một việc nhỏ có thể tạo hiệu ứng tốt cho cộng đồng.|Giới thiệu một việc thiện minh bạch phù hợp.'''),
}
assert len(THEMES)==16
BLESSINGS=[
 'Chúc bạn và gia đình một năm bình an, lòng nhẹ và ngày thêm sáng.',
 'Nguyện những điều thiện lành được nuôi dưỡng từ hành động nhỏ mỗi ngày.',
 'Chúc bạn đủ kiên nhẫn để bước từng bước chắc chắn trong năm mới.',
 'Nguyện tình thân thêm ấm, lời nói thêm dịu, nếp nhà thêm vui.',
 'Chúc bạn giữ sức khỏe, biết nghỉ ngơi và luôn có người để sẻ chia.',
 'Nguyện mỗi cuộc gặp đều mở thêm sự thấu hiểu và lòng tử tế.',
 'Chúc công việc rõ mục tiêu, học hành thêm tiến bộ, tâm thế vững vàng.',
 'Nguyện mùa mới mang lại dịp để sửa điều chưa tốt và gìn giữ điều đẹp.',
 'Chúc bạn bình tĩnh trước biến động và rộng lòng với những khác biệt.',
 'Nguyện ánh sáng yêu thương luôn hiện hữu trong mái nhà của bạn.',
 'Chúc những kế hoạch mới được bắt đầu bằng việc làm thiết thực.',
 'Nguyện tâm an giữa nhiều việc, người thân yên vui giữa nhiều lo toan.',
]
REFRAME_1=[
 'Đầu năm nên chọn việc vừa sức; kết quả bền cần nhiều ngày chăm sóc.',
 'Điều tích cực không tự xuất hiện, nhưng sự chủ động thường mở đường.',
 'Hãy nhìn hành trình như những bước nhỏ thay vì một phép màu tức thì.',
 'Một nhịp dừng để quan sát có thể giúp chọn đúng hướng tiếp theo.',
]
REFRAME_2=[
 'Giữa năm hãy xem lại điều đã thử và giữ những gì thực sự phù hợp.',
 'Nếu hoàn cảnh đổi khác, điều chỉnh kế hoạch cũng là một dạng trưởng thành.',
 'Điều nên giữ là sự chân thành; điều nên buông là kỳ vọng phải hoàn hảo.',
 'Một thay đổi nhỏ được duy trì có thể quan trọng hơn lời hứa lớn.',
]
LEVELS=['Tĩnh tâm','Mở lối','Bền bỉ','Hòa thuận','Sáng lòng','Nuôi dưỡng']

def validate_seed(line):
 vals=[x.strip() for x in line.split('|')]
 assert len(vals)==3, line
 return vals

fortunes=[]
for theme_idx,(slug,(label,emoji,raw)) in enumerate(THEMES.items()):
 seeds=[validate_seed(l) for l in raw.splitlines() if l.strip()]
 assert len(seeds)==12,(slug,len(seeds))
 for phase in range(2):
  for i,(title,reflection,action) in enumerate(seeds):
   n=theme_idx*24+phase*12+i+1
   frame=(REFRAME_1 if phase==0 else REFRAME_2)[(i+theme_idx)%4]
   period='khởi đầu' if phase==0 else 'chặng tiếp theo'
   motto = f'{title}: {reflection}'
   description=f'{reflection} {frame}'
   short=f'{title} — {reflection}'
   voice=f'Quẻ số {n}, {label}: {title}. {reflection} {BLESSINGS[(i+theme_idx+phase)%len(BLESSINGS)]}'
   fortunes.append(dict(id=f'DM27-{n:03d}',number=n,collection='chu_de',theme=slug,theme_label=label,
      zodiac=None,title=title if phase==0 else title+' · Nhịp mới',tone=LEVELS[(i+phase+theme_idx)%len(LEVELS)],
      year='Đinh Mùi 2027',period=period,poem=motto,meaning=description,action=action,
      blessing=BLESSINGS[(i+theme_idx+phase)%len(BLESSINGS)],short_text=short[:160],voice_text=voice[:330],
      disclaimer='Quẻ gợi mở văn hóa/giải trí, không dự đoán chắc chắn.'))

ZODIAC={
 'ty':('Tý','🐭','Nhanh nhạy khi quan sát nhưng cũng cần nghỉ trước khi quyết định.'),
 'suu':('Sửu','🐂','Kiên trì là điểm tựa; linh hoạt sẽ giúp đường đi dễ hơn.'),
 'dan':('Dần','🐯','Chủ động có giá trị khi đi cùng lắng nghe và tính toán.'),
 'mao':('Mão','🐈','Sự tinh tế phát huy tốt khi bạn nói rõ điều cần thiết.'),
 'thin':('Thìn','🐉','Tầm nhìn lớn cần gắn với những bước có thể làm ngay.'),
 'ti':('Tỵ','🐍','Quan sát sâu có ích khi không biến thành suy nghĩ quá lâu.'),
 'ngo':('Ngọ','🐎','Nhiệt tình sẽ bền khi bạn biết phân bổ sức.'),
 'mui':('Mùi','🐐','Sự mềm mỏng phát huy khi đi cùng ranh giới rõ ràng.'),
 'than':('Thân','🐒','Sáng tạo đem đến lựa chọn, còn kỷ luật giúp giữ lựa chọn tốt.'),
 'dau':('Dậu','🐓','Chú ý chi tiết rất tốt, miễn đừng ép mọi thứ hoàn hảo.'),
 'tuat':('Tuất','🐕','Trung thành quý giá khi biết chăm sóc cả bản thân.'),
 'hoi':('Hợi','🐖','Cởi mở và chân thành nên đi cùng sự tỉnh táo khi tin người.'),
}
ZODIAC_TOPICS=[('Khởi đầu','Đặt một mục tiêu có thể đo được trong tháng đầu năm.'),
 ('Gia đình','Nói một lời cảm ơn cụ thể với người thân.'),
 ('Công việc','Rà soát một nhiệm vụ cần làm rõ trách nhiệm.'),
 ('Tài chính','Nhìn lại ngân sách, tránh quyết định theo cảm xúc.'),
 ('Sức khỏe','Xây dựng nhịp sinh hoạt vừa sức và đều đặn.'),
 ('Học hỏi','Học một điều nhỏ có thể áp dụng trong tuần.'),
 ('Quan hệ','Lắng nghe nhiều hơn khi có ý kiến khác nhau.'),
 ('Dự định','Chia mục tiêu lớn thành ba việc nhỏ.'),
 ('Khó khăn','Tìm người đáng tin để cùng xem xét phương án.'),
 ('Hợp tác','Làm rõ kỳ vọng trước khi nhận lời.'),
 ('An vui','Để ra thời gian nghỉ và kết nối với người thương.'),
 ('Cuối năm','Ghi nhận tiến bộ và sửa một điều chưa hợp lý.')]
for zidx,(slug,(label,emoji,trait)) in enumerate(ZODIAC.items()):
 for j,(topic,action) in enumerate(ZODIAC_TOPICS):
  n=len(fortunes)+1
  reflection=f'Quẻ tuổi {label} về {topic.lower()}: {trait} Với chuyện {topic.lower()}, hãy để quyết định dựa trên thông tin và hoàn cảnh thực tế, không chỉ dựa vào quẻ.'
  title=f'{label} · {topic}'
  fortunes.append(dict(id=f'DM27-{n:03d}',number=n,collection='con_giap',theme=f'tuoi_{slug}',theme_label=f'Tuổi {label}',zodiac=label,title=title,
     tone=LEVELS[(j+zidx)%6],year='Đinh Mùi 2027',period='cả năm',poem=f'{label} đón năm mới, giữ điều lành từ việc nhỏ.',
     meaning=reflection,action=action,blessing=BLESSINGS[(zidx+j)%12],short_text=f'{title} — {trait}',
     voice_text=f'Quẻ {n}, tuổi {label}, {topic}. {trait} {action}',
     disclaimer='Quẻ giải trí theo con giáp, không phải tử vi cá nhân hay dự báo đáng tin cậy.'))

# Bonus: theme for people asking about birth year 1991; no gender, no birth date, no private info.
SPECIAL_TOPICS=[('Khởi sự','Mở việc mới'),('Công việc','Giữ uy tín'),('Gia đình','Kết nối'),('Sức khỏe','Lắng nghe cơ thể'),
 ('Tài lộc','Kiểm soát chi tiêu'),('Tình cảm','Tôn trọng đôi bên'),('Học hỏi','Tích lũy kỹ năng'),('Bạn bè','Giữ lòng tin'),
 ('Dự định','Xem lại mục tiêu'),('Thay đổi','Thích nghi'),('Tâm an','Giữ nếp sống'),('Hiếu nghĩa','Quan tâm người thân'),
 ('Gặp gỡ','Mở rộng góc nhìn'),('Hòa giải','Nói lời chân thành'),('Phúc lành','Làm điều hữu ích'),('Tổng kết','Ghi nhận tiến bộ')]
VARIANTS=[('Trước khi bắt đầu','Hôm nay hãy chọn một việc nhỏ có thể làm ngay.'),
 ('Giữa hành trình','Trong tuần hãy xem tiến độ của việc đã chọn.'),
 ('Khi gặp trở ngại','Nếu vướng mắc, thử tìm một cách làm khác có ít rủi ro hơn.')]
for i,(topic,focus) in enumerate(SPECIAL_TOPICS):
 for k,(when,act) in enumerate(VARIANTS):
  n=len(fortunes)+1
  title=f'Tân Mùi 1991 · {topic} · {when}'
  reflection=f'Dành cho người muốn xem chủ đề Tân Mùi 1991 trong năm Đinh Mùi 2027: {focus.lower()} cần sự chủ động và cân nhắc. {when.lower()}, điều quan trọng không phải dự báo may rủi mà là chọn cách ứng xử phù hợp.'
  fortunes.append(dict(id=f'DM27-{n:03d}',number=n,collection='tan_mui_1991',theme='tan_mui_1991',theme_label='Tân Mùi 1991',zodiac='Mùi',title=title,
    tone=LEVELS[(i+k)%6],year='Đinh Mùi 2027',period=when,poem=f'Một tuổi đã qua, một năm lại đến; sống chậm mà sâu, làm điều mình chọn.',
    meaning=reflection,action=act,blessing=BLESSINGS[(i+k)%12],short_text=f'{title} — {focus}.',
    voice_text=f'Quẻ {n}. {title}. {reflection} {act}',disclaimer='Nội dung chiêm nghiệm cho người quan tâm tuổi Tân Mùi 1991; không luận sao hạn hay dự đoán vận mệnh.'))
assert len(fortunes)==576,len(fortunes)
assert len({f['id'] for f in fortunes})==576
assert len({f['voice_text'] for f in fortunes})==576
for x in fortunes:
 assert len(x['title'])<=95
 assert len(x['short_text'])<=160
 assert len(x['voice_text'])<=450
 assert not any(b in x['meaning'].lower() for b in ['trúng số','đầu tư chắc thắng','chữa khỏi','hạn chết'])
meta={'id':'DM-2027','display_name':'Xin quẻ an lành năm Đinh Mùi 2027',
  'calendar':{'year':'Đinh Mùi','lunar_new_year':'2027-02-06','timezone':'Asia/Ho_Chi_Minh',
    'note':'Tân Mùi là năm âm lịch 1991, không phải năm 2027.'},
  'editorial':'576 quẻ viết mới theo phong cách chiêm nghiệm văn hóa. Không phải bộ xăm/quẻ truyền thống hay kết quả bói cá nhân.',
  'total':len(fortunes),'collections':dict(Counter(f['collection'] for f in fortunes)),
  'free':True,'gift_required':False,'source':'Nguyên tác riêng, biên soạn mới cho ứng dụng Chùa Online',
  'items':fortunes}
(ROOT/'data'/'que_dinh_mui_2027_576.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (ROOT/'data'/'que_dinh_mui_2027_576.csv').open('w',encoding='utf-8-sig',newline='') as out:
 fieldnames=['id','number','collection','theme','theme_label','zodiac','title','tone','year','period','poem','meaning','action','blessing','short_text','voice_text','disclaimer']
 writer=csv.DictWriter(out,fieldnames=fieldnames); writer.writeheader();writer.writerows(fortunes)
counts=dict(Counter(f['theme'] for f in fortunes))
(ROOT/'data'/'index_themes.json').write_text(json.dumps({'topics':[{'id':slug,'label':item[0],'emoji':item[1],'count':counts[slug]} for slug,item in THEMES.items()], 'zodiacs':[{'id':slug,'label':item[0],'emoji':item[1],'count':counts[f'tuoi_{slug}']} for slug,item in ZODIAC.items()], 'tan_mui_1991':counts['tan_mui_1991']},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('CREATED',len(fortunes),Counter(f['collection'] for f in fortunes))
for f in fortunes[::87][:7]:print(f['id'],f['title'],f['action'])
