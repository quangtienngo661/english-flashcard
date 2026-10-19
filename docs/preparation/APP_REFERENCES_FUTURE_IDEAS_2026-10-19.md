# Tham khảo app khác và ý tưởng phát triển sau (19/10/2026)

Ghi lại theo yêu cầu của chủ dự án trong lúc brainstorm Bước 5: "lưu tra cứu vào file giúp mình để làm hướng phát triển sau này". Đây là **tham khảo ý
tưởng**, không phải quyết định. Các quyết định của Bước 5 nằm ở design và decision record Bước 5; mục 4 dưới đây chỉ là danh sách để cân nhắc ở các bước sau.

**Nguồn và cách đọc:**
- luyentu.com: Claude đọc ngày 19/10/2026 trong Chrome của chủ dự án (tài khoản của chủ dự án, đã đăng nhập), **chỉ đọc**: không bấm mua, không đổi cài đặt,
  không nhập gì. Trang đã xem: `/home`, `/category-list`, `/roadmap`, `/words`, `/practice`, `/store`, `/leaderboard`. Không ghi tên người dùng khác.
- Trang gói của Corodomo, Quizlet (bản giá Việt Nam) và Luyện Từ: ảnh chụp chủ dự án gửi trong chat ngày 19/10/2026.
- Đây là quan sát giao diện tại một thời điểm; con số và tính năng có thể đã đổi. Không suy ra cách họ làm bên trong.

## 1. luyentu.com — app làm gì (quan sát 19/10/2026)

| Khu vực | Quan sát |
|---|---|
| Trang chủ | Ô thống kê (tổng từ, đã thuộc, tiến độ), **chuỗi ngày học** (streak, 7 ô theo thứ), truy cập nhanh (thêm từ, luyện tập, xếp hạng, cộng đồng), **lộ trình học** theo kỳ thi và nhóm người học (THPT, sách IELTS, IELTS, TOEIC, người nổi tiếng khuyên dùng, theo level, người đi làm và chuyên ngành, THCS và tiểu học); mỗi lộ trình là nhiều bộ từ, có tiến độ (ví dụ 1/6) và độ khó 1–5 |
| Bộ từ vựng | Tạo bộ từ, tạo folder, xem lộ trình; tab "Bộ từ vựng của tôi", "Cộng đồng", "Lớp học" (chia sẻ bộ từ, học theo lớp) |
| Từ vựng cá nhân | Thống kê tổng / thuộc / chưa / %; tìm và lọc; **"Thêm từ với AI"** và **"Thêm nhiều từ"** (thêm hàng loạt); bảng từ có nghĩa, loại từ, ví dụ, trạng thái thuộc |
| Học từ vựng | Chọn bộ từ, bộ lọc, thứ tự (mặc định ngẫu nhiên), số lượng (mặc định 20 từ); 6 dạng bài, mỗi dạng thưởng **xu**: Flashcard +5, Trắc nghiệm +10, Nối từ với nghĩa +10, Gõ từ vựng +10, Nghe viết +15, Đặc biệt (hỗn hợp, dịch câu…) +20; nút **ôn tập ngắt quãng (SRS)** riêng, có số "từ sẵn sàng"; lịch sử đấu |
| Cửa hàng | Tiêu xu mua **ảnh đại diện, hình nền, đặc biệt** (đồ trang trí): đa số 3.000 xu; ảnh đại diện tự tải lên 20.000 xu; số xu hiện ở góc màn hình |
| Xếp hạng | Bảng xếp hạng theo **lượt chơi game** và theo **streak**; bản đồ ngày học theo tuần; "chuỗi chung" làm cùng bạn bè, lời mời, đã gửi; **trò chuyện cộng đồng** (người học hỏi nhau, ví dụ hỏi bài sau có cần lên Pro mới mở không); liên hệ admin qua mạng xã hội |
| Gói (ảnh chủ dự án gửi) | Free "luôn miễn phí": AI tạo từ nhanh **2 lần/ngày**, 500 từ cá nhân, 6 dạng bài, thống kê cơ bản, SRS. Premium: AI tạo từ nhanh **100 lần/ngày**, 5.000 từ, mở khóa **hơn 50.000 từ theo lộ trình**, tiện ích dịch trên Chrome, ưu tiên hỗ trợ; bán trả trước **3 / 6 / 12 tháng** (189.000 / 319.000 / 449.000 đ, có đồng hồ khuyến mãi); **mã giới thiệu** (người giới thiệu nhận 5% giá trị đơn) |
| Nền tảng | Web; app iOS (App Store Việt Nam) và Android (Google Play); banner mời tải app |

## 2. Trang gói của Corodomo và Quizlet (ảnh chủ dự án gửi)

| App | Quan sát |
|---|---|
| Corodomo | Hai gói trả phí Plus (116.000 đ/tháng, khuyến mãi lần đầu, giá gốc 180.000) và Pro (263.000 đ/tháng); chọn hàng tháng / hàng năm / **vĩnh viễn**; hạn mức AI tính bằng **giờ sử dụng AI mỗi tháng** (30 / 100 giờ) kèm link "chi tiết cách trừ hạn mức AI"; Plus có "không quảng cáo"; tối đa 4 thiết bị; Pro có model AI nâng cao, dùng trước tính năng mới |
| Quizlet (giá Việt Nam) | Plus 2,99 USD/tháng trả theo năm (35,99 USD/năm), Plus Unlimited 3,75 USD/tháng (44,99 USD/năm); nút "Bắt đầu dùng thử miễn phí"; Plus vẫn giới hạn **theo tháng** cho tính năng không AI (3 bài kiểm tra thử, 3 lời giải, 20 câu chế độ Học); cả hai gói "loại bỏ quảng cáo khi học" |

## 3. So với Wordmet (tại 19/10/2026)

| Điểm | Wordmet đã chốt ở Bước 5 | Họ làm |
|---|---|---|
| Đơn vị hạn mức AI | Lượt mỗi tháng, hai kho riêng (bài AI 300, tra nghĩa 100) | Luyện Từ: lượt mỗi ngày; Corodomo: giờ mỗi tháng; Quizlet: lượt mỗi tháng |
| AI ở gói Free | Không có; thử AI qua trial 7 ngày giữ thẻ | Luyện Từ: Free có 2 lần/ngày để nếm thử |
| Giới hạn không AI | Free 3 phiên luyện/ngày; nhóm, từ riêng, câu ngữ cảnh không theo gói | Luyện Từ: Free 500 từ cá nhân; Quizlet: giới hạn chế độ Học, bài kiểm tra theo tháng |
| Nội dung có sẵn | Catalog mở cho mọi người | Luyện Từ: lộ trình đầy đủ thuộc Premium |
| Quảng cáo | Free có, trial và Pro không (công tắc mặc định tắt) | Corodomo, Quizlet: "không quảng cáo" là quyền lợi gói trả phí |
| Chu kỳ bán | Tháng và năm (năm giảm 10%, K26) | Luyện Từ: trả trước 3/6/12 tháng; Corodomo: thêm gói vĩnh viễn |
| Gamification | Chưa có | Luyện Từ: xu, cửa hàng, streak, bảng xếp hạng, chuỗi chung, chat cộng đồng |

## 4. Ý tưởng để cân nhắc sau (chưa quyết định)

| # | Ý tưởng | Lấy từ | Nếu làm thì cần |
|---|---|---|---|
| I1 | **Xu và cửa hàng đồ trang trí**: thưởng xu theo dạng bài, tiêu xu mua ảnh đại diện, hình nền | Luyện Từ | Một sổ xu **riêng**, không trộn với sổ lượt AI của Entitlements (đổi xu lấy lượt AI là một quyết định riêng vì đụng tiền thật); luật chống gian lận (làm bài nhanh để cày xu) |
| I2 | **Streak và bảng xếp hạng** (theo lượt luyện, theo streak), bản đồ ngày học, "chuỗi chung" với bạn | Luyện Từ | Thuộc nhóm "giữ người dùng quay lại" (Learning hoặc module mới); quyền riêng tư khi hiện tên trên bảng xếp hạng |
| I3 | **Khóa một phần nội dung có sẵn theo gói** (lộ trình, bộ từ chuyên ngành) | Luyện Từ | Một mã quyền mới (ví dụ `content.premium`); cờ "chỉ Pro" ở Content; đổi K10 hoặc catalog mở hiện nay |
| I4 | **Cho Free nếm thử AI** một ít mỗi ngày (ví dụ 2 lượt) | Luyện Từ | Đổi F31 (Free không AI); kho lượt theo ngày cho Free; xem lại chi phí với trần toàn hệ thống |
| I5 | **Hạn mức AI theo ngày** thay cho hoặc cộng với theo tháng | Luyện Từ, Speak | Sổ lượt Bước 5 đã có kho theo ngày (phiên luyện), thêm được kho AI theo ngày bằng cài đặt |
| I6 | **Gói trả trước 3/6/12 tháng**, gói vĩnh viễn | Luyện Từ, Corodomo | Cổng thanh toán Bước 5 đã có kiểu "app tự gia hạn" (thanh toán một lần → cấp N ngày); gói vĩnh viễn cần quyết định riêng về chi phí AI kéo dài |
| I7 | **Mã giới thiệu** (5% giá trị đơn), **mã giảm giá, khuyến mãi lần đầu**, đồng hồ đếm ngược | Luyện Từ, Corodomo | Phần billing chưa có trong Bước 5: lưu mã, áp giảm giá ở nhà cung cấp, chống lạm dụng |
| I8 | **Bộ từ cộng đồng, lớp học** (chia sẻ bộ từ, giáo viên giao bài) | Luyện Từ | Learning: nhóm chia sẻ được; quyền xem và sao chép; kiểm duyệt nội dung cộng đồng |
| I9 | **Thêm nhiều từ một lần** cho từ riêng | Luyện Từ | Learning/Content: thêm hàng loạt; nếu có AI tra nghĩa thì mỗi từ một lượt `ai.lookup` |
| I10 | **Tiện ích trình duyệt** tra và lưu từ khi đọc web | Luyện Từ | Ứng dụng riêng gọi API thêm nhanh (K19 đã để mobile chia sẻ văn bản về sau) |
| I11 | **Dạng bài nghe viết**, nối từ với nghĩa | Luyện Từ | Practice: dạng bài mới; nghe viết cần âm thanh (giọng đọc), có thể tốn tiền dịch vụ giọng |
| I12 | **Link "cách trừ hạn mức AI"** ngay trên trang gói | Corodomo | Trang giải thích lượt AI (đơn vị câu 8 của Bước 5) khi làm giao diện gói |
| I13 | **Giới hạn số thiết bị** theo gói | Corodomo | Identity: phiên theo thiết bị đã có (K5); đếm và chặn theo gói là quyết định mới |
