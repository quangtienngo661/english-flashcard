# Module spec — System (xuyên module)

> Sinh bởi quy trình `write-spec`, một lần chạy `v1-specs`, đợt 1. Mẫu: `module-spec.md` của harness. Đây là
> spec **mỏng, xuyên module**: chỉ giữ những gì mọi module phải tuân theo. Chi tiết từng module ở spec riêng.
> Cách trích dẫn: **K#** = quyết định đã chốt; **N#, F#** = mặc định hoặc đề xuất mang nhãn riêng (N7–N11 là `ASSUMPTION`, N12 Mở, N13 Đề xuất, nhiều F# có con số là `ASSUMPTION`) trong [DECISIONS](DECISIONS_2026-10-04.md) và
> [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** = finding trong
> [research.md](../tasks/v1-specs/research.md); **ASSUMPTION** = chưa có nguồn.

**Ngày:** 2026-10-04 · **Module:** System (xuyên module) · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu nào để quan sát; spec dựa trên quyết định của chủ dự án và research đã có.

| Surface | How accessed | By whom | When |
|---|---|---|---|
| Quyết định sản phẩm và kỹ thuật (K1–K25) | Chat, ghi lại ở `DECISIONS_2026-10-04.md` | Chủ dự án | 02–04/10/2026 |
| Dữ liệu nguồn CEFR-J, Octanove | Chạy script đo trên file CSV | Trợ lý | 04/10/2026 |

## Scope

App học từ vựng tiếng Anh theo level và chủ đề cho **người học** (web Next.js và mobile Flutter) với một
**owner/admin** duy nhất tự soạn và duyệt nội dung. V1 gồm: tài khoản; catalog từ vựng và từ riêng tư của
người học; thêm nhanh từ gặp phải; nhóm từ, flashcard và lịch ôn tự động; bài kiểm tra theo definition không AI; bài
điền từ do AI sinh và chấm bằng rule; quyền theo gói và hạn mức. Spec này quy định **các quy ước mà mọi
module dùng chung**: danh tính, ngôn ngữ, quy ước API, quyền khác hạn mức, snapshot, xóa tài khoản, điều
kiện trước khi public.

**Ngoài phạm vi V1 (ghi rõ để không bị kéo vào):** phrasal verb, collocation, idiom (chỉ chừa cột
`entry_type`); ngôn ngữ học khác tiếng Anh; bài tự viết câu và AI nhận xét/sửa câu; AI soạn nháp
nội dung (K1b); chatbot/RAG (V1.5); nhắc học (K25); lịch ôn FSRS (K21); học offline (F5); thu tiền
thật; Sign in with Apple (chỉ là điều kiện trước khi ra iOS); thêm nhanh từ app khác trên mobile (K19).
Các spec chi tiết: Identity & Access, Vocabulary Content, Learning, Content Pipeline, Entitlements & Usage,
AI Integration, Practice (xem [chỉ mục](README.md)).

## Thuật ngữ

| Thuật ngữ | Nghĩa trong spec |
|---|---|
| Entry | Một từ hoặc cụm từ cụ thể, xác định bởi (ngôn ngữ, lemma, loại từ). V1 chỉ có `entry_type = word` |
| Sense | Một nghĩa của entry, có ID ổn định; tiến độ học bám sense, không bám chuỗi dịch |
| Catalog | Entry và sense do owner soạn và publish, mọi người học thấy được |
| Từ riêng tư | Entry và sense do một người học tạo; chỉ người đó thấy |
| Trạng thái | Ba mức người học tự gán cho một sense: chưa học, cần ôn tập, đã biết |
| Lịch ôn | Ngày cần ôn tiếp của một (người dùng, sense), do hệ thống tính, tách khỏi trạng thái |
| Quyền (entitlement) | Người dùng **được phép** dùng một feature hay không |
| Hạn mức (quota) | Người dùng **được dùng bao nhiêu** lần một feature |
| Operation ID | Mã định danh một thao tác để lần theo và chống thực hiện hai lần |
| Snapshot | Bản sao đủ để chấm một câu hỏi mà không phụ thuộc nội dung catalog sau đó |

## Constraints

Chỉ những gì đến từ bên ngoài, không phải lựa chọn của người xây.

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Backend NestJS modular monolith + PostgreSQL; web Next.js; mobile Flutter | Chủ dự án (PROJECT_CONTEXT) | Stack đã khai báo cho dự án |
| Lỗi API theo `application/problem+json` (RFC 9457), phân trang token, header `Idempotency-Key` | Chủ dự án (K2) | Chọn để client web và mobile khó đổi sau; nguồn R10–R12 |
| Chạy local trước, chưa thu tiền thật | Chủ dự án | Giới hạn giai đoạn |
| Ghi nguồn CEFR-J (dùng thương mại được khi ghi nguồn) và Octanove (CC BY-SA 4.0: ghi tác giả và giấy phép, không thêm hạn chế) | Giấy phép dữ liệu | R13, R14 |
| Privacy Policy và xóa tài khoản ngay trong app | Store (Apple, Google Play) | R15 |
| Sign in with Apple khi bản iOS có Google Sign-In | Apple 4.8 | R15 |
| Google Play: closed test ≥12 tester ≥14 ngày cho tài khoản cá nhân mới | Google Play | R15 |
| Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 | Pháp luật Việt Nam | R16; nội dung về thời hạn xử lý chưa đọc |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| SR1 | **Ba vai trò.** Người học (mọi tài khoản đã đăng nhập); owner/admin (tài khoản có vai trò admin, gán bằng cấu hình hoặc lệnh khởi tạo, không có màn quản lý admin); hệ thống (tiến trình nền, AI, gửi email) | K1, N1 |
| SR2 | **Định danh.** User ID, sense ID, operation ID… là UUID mờ, không suy ra từ nội dung hay email, không lộ thứ tự. **ID sense không bao giờ được tái sử dụng** cho nghĩa khác | F3 |
| SR3 | **Ngôn ngữ.** Ba thứ độc lập: ngôn ngữ đang học (V1: chỉ tiếng Anh); **tiếng mẹ đẻ** người học chọn ở lần thiết lập đầu, quyết định ngôn ngữ giao diện và ngôn ngữ giải thích mặc định, đổi được trong cài đặt; thiếu bản dịch thì dùng tiếng Anh. V1 có tiếng Việt và tiếng Anh; thêm ngôn ngữ = thêm tài nguyên dịch và nội dung, không đổi cấu trúc dữ liệu hay API. Mã ngôn ngữ theo BCP 47, kiểm theo danh sách cho phép; có mã không có nghĩa là đã hỗ trợ | K4 |
| SR4 | **Quyền khác hạn mức.** Mỗi feature có mã feature riêng (không dùng cờ `is_pro` chung). Quyền trả lời "được dùng không", hạn mức trả lời "còn bao nhiêu lượt". Quyền AI được kiểm khi **tạo** nội dung; chấm đáp án bằng rule không cần quyền AI | K2, F32 |
| SR5 | **Snapshot.** Một câu hỏi lưu mọi thứ cần để chấm (nội dung, đáp án chấp nhận, phiên bản rubric). Sửa hoặc xóa nội dung catalog sau đó không đổi câu hỏi đang làm | F36 |
| SR6 | **Danh tính nghĩa.** Sửa lỗi chính tả giữ nguyên sense ID; thay bản chất nghĩa tạo sense mới và retire sense cũ. Không tự chuyển tiến độ sang sense mới | F14 |
| SR7 | **Quy ước API.** Tiền tố `/v1`; trong v1 chỉ thêm, không đổi nghĩa field. Client bỏ qua field và giá trị enum chưa biết. Lỗi trả `application/problem+json` với `type`, `status`, `title`, `detail`, `instance` và thành viên mở rộng `operation_id`. Phân trang bằng `page_size` (mặc định 20, tối đa 100) và `page_token` mờ | F2, K2, R10, R11; con số `ASSUMPTION` |
| SR8 | **Idempotency.** Thao tác có tác dụng phụ nhận `Idempotency-Key`; key có phạm vi theo người dùng và endpoint. Cùng key và cùng nội dung: nếu lần đầu **đã thành công hoặc đã thất bại vĩnh viễn** thì trả đúng kết quả đã lưu và không thực hiện lại. Nếu lần đầu **thất bại tạm thời** thì key được giải phóng: gửi lại cùng key là một lần thực hiện mới. Nếu lần đầu **đang chạy** thì trả lỗi 409 kèm thời gian chờ, không thực hiện lần hai. Cùng key nhưng nội dung khác: từ chối bằng lỗi Problem Details, không thực hiện. Giữ key tối thiểu 24 giờ | K2, R12 (nguồn lưu cả lỗi và không lưu khi đang chạy; việc giải phóng key sau lỗi tạm là lựa chọn riêng); thời hạn lưu và giải phóng sau lỗi tạm `ASSUMPTION` |
| SR9 | **Phân quyền.** Mỗi tài nguyên của người học chỉ chủ sở hữu truy cập được. Truy cập ID của người khác trả "không tìm thấy" (không tiết lộ tài nguyên có tồn tại). Thao tác admin cần vai trò admin do server kiểm, không tin dữ liệu từ client | ASSUMPTION (cơ sở: Defense Analysis trong V1_DATA_MODEL_DRAFT mục 5, mức "Private leak/abuse"); K1 |
| SR10 | **Dữ liệu cá nhân và log.** Log thông thường không chứa mật khẩu, OTP, token, câu trả lời thô, câu ngữ cảnh của người học. Mọi log liên quan một thao tác mang `operation_id` | F4 |
| SR11 | **Xóa tài khoản.** Xóa ngay sau khi xác nhận lại danh tính (nhập mật khẩu, hoặc đăng nhập lại bằng Google nếu tài khoản không có mật khẩu; **không dùng OTP**, vì OTP chỉ dành cho xác minh email và quên mật khẩu). Thứ tự: (1) Identity đặt tài khoản ở trạng thái "đang xóa", từ đó mọi request của người đó bị từ chối kể cả khi mang token còn hạn; (2) thu hồi mọi phiên; (3) mọi module xóa dữ liệu cá nhân và học tập của người đó; (4) Identity xóa người dùng cuối cùng. Chỉ giữ số liệu tổng hợp không định danh. Chức năng nằm trong app | K3, R15; thứ tự và trạng thái "đang xóa" `ASSUMPTION`; thời hạn xóa bản sao lưu `ASSUMPTION` |
| SR12 | **Chỉ online.** V1 không đồng bộ offline | F5 |
| SR13 | **Thời gian.** Lưu UTC theo ISO 8601; ranh giới ngày (trần ôn mỗi ngày, hạn mức theo ngày) tính theo múi giờ IANA của người dùng, mặc định từ thiết bị. Thứ tự ghi cuối cùng thắng theo giờ server, không tin giờ client | F3, F19; múi giờ `ASSUMPTION` |
| SR14 | **Giới hạn chống lạm dụng.** Mọi endpoint ghi có giới hạn tần suất theo người dùng; vượt thì trả lỗi 429 kèm thời gian chờ. Số cụ thể do từng module đặt | F34; số `ASSUMPTION` |
| SR15 | **Điều kiện trước khi public** (không cần khi chạy local): màn hình "Nguồn dữ liệu & giấy phép"; Privacy Policy; xóa tài khoản trong app; Sign in with Apple nếu có bản iOS với Google Sign-In; closed test Google Play nếu phát hành Android; giấy phép nội dung của mọi nguồn đã dùng | R13–R16 |

## Bản đồ ghi dữ liệu

| Module | Sở hữu đường ghi | Đọc từ |
|---|---|---|
| Identity & Access | user, danh tính đăng nhập, phiên, OTP, hồ sơ (tiếng mẹ đẻ, múi giờ, vai trò), trạng thái "đang xóa" | — |
| Vocabulary Content | entry, sense (kể cả bản nháp và revision), text, topic, level, nguồn; từ riêng tư; câu ngữ cảnh; dạng được chấp nhận | — |
| Content Pipeline | job nhập và xuất, trạng thái job, khóa dòng, báo cáo lỗi; **ghi vào catalog chỉ qua các thao tác của Content** (tạo, sửa bản nháp, thêm level, đặt cờ, đổi trạng thái, publish) | Content |
| Learning | nhóm, mục học, trạng thái, lịch ôn, nhật ký; nhận kết quả ôn từ Practice | Content |
| Practice | câu hỏi, lượt làm bài, ngân hàng câu, báo câu lỗi | Content, Learning |
| AI Integration | nhật ký chi phí từng lần gọi provider, kết quả lưu theo `operation_id`, theo dõi chi phí mỗi ngày | — |
| Entitlements & Usage | quyền, nguồn cấp, sổ lượt dùng, công tắc và trần chi AI, hộp sự kiện billing (sau V1) | Identity |

Hai sổ cuối (chi phí provider và lượt bị trừ của người dùng) tách nhau vì khi retry hai số này không bằng
nhau. Nguồn: kế hoạch spec mục 1.

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| S1 | When a request fails validation, then the response is `application/problem+json` with `type`, `status`, `title`, `detail`, `instance` and an `operation_id`, and a client ignores members it does not know | R10 |
| S2 | When a list endpoint is called with `page_size` and `page_token`, then it returns at most that many items plus a `next_page_token`, and the token is opaque to the client | R11 |
| S3 | When a client sends a `page_token` that is malformed or tampered with, then the response is a 400 Problem Details error, never a 500 | ASSUMPTION |
| S4 | When the same `Idempotency-Key` is sent again with the same payload, then the stored result of the first call is returned and no side effect is repeated | R12 |
| S5 | When the same `Idempotency-Key` is sent with a different payload, then the call is rejected with a Problem Details error and nothing is executed | R12 |
| S6 | When a learner requests a resource ID that belongs to someone else, then the response is "not found" and does not reveal whether the resource exists | ASSUMPTION |
| S7 | When a non-admin calls an admin operation, then the call is refused regardless of what the client claims | K1 |
| S8 | When a learner picks a native language at first setup, then the interface language and the default explanation language follow it, and changing it in settings changes both | K4 |
| S9 | When the chosen native language has no translation resources, then the interface and explanations fall back to English | K4 |
| S10 | When a learner deletes the account after re-authenticating, then every module removes that learner's personal and learning data, all sessions are revoked, and only non-identifying aggregates remain | K3 |
| S11 | When catalog content is edited or retired after a question was created, then the existing question is graded against its snapshot and does not change | F36 |
| S12 | When a v1 response gains a new optional field, then a client built before the change keeps working | F2 |
| S13 | When an unexpected error occurs, then the log carries the `operation_id` and contains no password, OTP, token, raw answer or context sentence | F4 |
| S14 | When the owner prepares a public release, then each pre-public item in SR15 is listed on a release checklist with its status, done or not done | R15 |
| S15 | When a request with an `Idempotency-Key` failed with a transient error and is sent again with the same key, then it is executed again as a new attempt | SR8 (`ASSUMPTION`) |
| S16 | When a request with an `Idempotency-Key` is sent again while the first one is still running, then the response is 409 with a wait time and nothing is executed twice | R12 |
| S17 | When an account is in the "deleting" state, then every request from that user, even with an unexpired token, is refused and no data is written | SR11 (`ASSUMPTION`) |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| SE1 | An account is in the "deleting" state while an AI call or background job for that user is in flight, or another device sends a write | The write is refused; the in-flight operation finishes without writing new data for that user | SR11 (`ASSUMPTION`) |
| SE2 | An `Idempotency-Key` is reused after the retention window | Treated as a new request | R12 (key may be dropped after ≥24 h); behaviour `ASSUMPTION` |
| SE3 | A learner changes time zone between two days | Daily limits follow the current time zone; no day is counted twice | ASSUMPTION |
| SE4 | Two devices change the same learner's state at nearly the same time | Status: last write by server time wins; names and membership: version check, the loser is told to refresh | F19 |
| SE5 | A request carries a malformed or unsupported language tag | 400 Problem Details; no data is stored | ASSUMPTION |
| SE6 | A delete-account request arrives with a stale re-authentication | Rejected; the learner must authenticate again | SR11 (`ASSUMPTION`) |

## Cross-module contract notes

| Chuyện | Quy định |
|---|---|
| Tạo câu hỏi AI | **Practice điều phối:** Entitlements kiểm quyền và giữ chỗ hạn mức → lấy câu từ ngân hàng hoặc gọi AI Integration → xác nhận hoặc nhả. Chấm đáp án không đi qua bước này |
| Thêm nhanh từ | **Learning điều phối:** gọi Content để tra và tạo từ riêng tư, rồi thêm vào nhóm "Mới thêm" và lịch ôn. Chi tiết ở spec Learning (đợt 2) |
| Xóa tài khoản | Mỗi module cung cấp thao tác xóa theo người dùng. Thứ tự: Identity đặt "đang xóa" (mọi request bị từ chối), thu hồi phiên, từng module xóa, Identity xóa cuối (SR11) |
| Nội dung được học | Chỉ sense `published` (hoặc từ riêng tư của chính người học) mới được Learning và Practice dùng |
| Danh tính người dùng | Mọi module nhận user ID từ Identity, không tự suy ra |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở `DECISIONS` và `SPEC_PLAN_AND_DECISIONS`.
- **R#** — finding trong `research.md` (verified, documented hoặc documented (02/10)).
- **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
