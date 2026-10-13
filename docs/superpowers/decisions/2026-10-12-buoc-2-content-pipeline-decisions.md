# Decisions — Bước 2: Content + Pipeline (phía quản trị)

Ngày: 12/10/2026. Đi kèm design doc
[`../specs/2026-10-12-buoc-2-content-pipeline-design.md`](../specs/2026-10-12-buoc-2-content-pipeline-design.md).
File này gom **các quyết định đã chốt** trong lúc brainstorm (11–12/10/2026), mỗi quyết định có các phương án đã cân nhắc,
trade-off, phương án được chọn và lý do. Design doc mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Chủ dự án (ok)" = trợ lý
đề xuất và chủ dự án trả lời "ok"; "Đề xuất" = trợ lý đề xuất, chưa được xác nhận riêng; "Chờ bạn" = còn mở.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Phạm vi Bước 2 | Quản trị + tìm kiếm/duyệt chỉ-đọc cho người học; từ riêng tư, câu ngữ cảnh, chuỗi tra nghĩa, xóa lan để sau | Chủ dự án |
| D2 | Cách nhập và soạn | Upload gộp một lần (cột nguồn + cột nội dung) | Chủ dự án |
| D3 | Số nghĩa ở pilot | Một nghĩa chính mỗi (từ, loại từ) | Chủ dự án (ok) |
| D4 | Xử lý lỗi | Hai danh sách tách riêng; file lỗi sửa xong upload lại được | Chủ dự án |
| D5 | Chuẩn hóa và thiếu nội dung | Tự chuẩn hóa lỗi vô hại; không loại dòng vì thiếu ví dụ/chủ đề | Chủ dự án (ok) |
| D6 | Job nền | BullMQ + Redis (giữ sau khi biết có backend Postgres) | Chủ dự án |
| D7 | Tìm kiếm và revision | Khớp đúng → đầu từ → chứa; sửa qua revision nháp | Chủ dự án (ok) |
| D8 | Xuất để sửa | Gồm cả sense đã publish | Chủ dự án (ok) |
| D9 | Giao diện | Bước 2 là API; giao diện làm ngay sau | Chủ dự án |
| D10 | Chia bước | Một design, ba mốc M1–M3 | Đề xuất (chủ dự án nghiêng về không chia) |
| D11 | Phiên bản CEFR-J | Mặc định 1.5 trong repo, chờ xác nhận | Chờ bạn |
| D12 | Bảng quyền | 4 quyền content cho `admin` và `editor`; ánh xạ endpoint | Chủ dự án (bảng D6); ánh xạ: Đề xuất |
| D13 | Lọc trước dòng không đổi | Truy vấn hàng loạt trước khi xử lý từng dòng | Chủ dự án (ok) |
| D14 | Khung job nền | Giữ đủ lease/`lease_epoch`/đối soát, viết thành khung dùng chung cho mọi loại job; **mô hình dữ liệu: bảng `background_jobs` chung + bảng chi tiết theo loại job** (chốt ở phiên review) | Chủ dự án |
| D15 | Giới hạn upload | Không có luật riêng, chỉ luật chung `user.write` | Chủ dự án (ok) |
| D16 | Tìm sense theo lần upload | Bộ lọc `batch_id` cho danh sách và lệnh xuất | Chủ dự án (ok) |
| D17 | Level lệch nguồn | Loại dòng có level khác bản ghi đã có của cùng nguồn bên thứ ba; từ tự thêm để trống level | Chủ dự án (ok) |
| D18 | Luật xung đột khi upload lại | CSV ghi đè revision mở do CSV tạo; `gloss-changed` chỉ áp cho sense đã publish | Chủ dự án (ok) |
| D19 | Lọc danh sách entry | `conflict`, `has_sense`, `level`, `batch_id` | Chủ dự án (ok) |
| D20 | Publish số lượng lớn | Giữ trần 500 cho lệnh đồng bộ; thêm job publish theo bộ lọc (không giới hạn số lượng) | Chủ dự án |

## Nguyên tắc: design doc so với spec (chốt 12/10/2026)

Design doc là tài liệu chính thức để build; spec chỉ là khung ban đầu. Doc khác spec khi quyết định thay đổi trong lúc phân tích, và
không cần sửa spec theo. Review design doc theo chính nó, không đối chiếu spec. Vì vậy design Bước 2 bỏ cột "Lệch spec?" và mục sửa spec.

## D1 — Phạm vi Bước 2

Bối cảnh: HANDOFF §2 xếp vào Bước 2 "catalog, import, CSV soạn nội dung, publish, tìm kiếm, từ riêng tư". Chủ dự án muốn tập trung phần quản
trị trước và để phần người học sau.

| Phương án | Trade-off |
|---|---|
| Đúng HANDOFF (cả từ riêng tư) | Một bước trọn Content; nhưng từ riêng tư gần như vô dụng khi chưa có thêm nhanh (Bước 3) và kéo theo xóa lan sang module chưa tồn tại |
| ✅ A: quản trị + tìm kiếm/duyệt/xem chỉ-đọc | Kiểm chứng được "publish xong thì người học thấy" ngay cuối Bước 2; phần chỉ-đọc nhỏ (khoảng 3 endpoint dùng chung truy vấn với admin); Bước 3 nhẹ hơn |
| B: chỉ quản trị, mọi thứ người học sang Bước 3 | Bước 2 nhỏ nhất; nhưng Bước 3 (Learning, mốc pilot sớm nhất, một trong hai spec lớn nhất) phải gánh cả tìm kiếm, duyệt, từ riêng tư, chuỗi tra nghĩa; và chỉ biết kết quả publish khi gần pilot |

Hệ quả: câu ngữ cảnh (CR14), chuỗi tra nghĩa (CR15), từ riêng tư (CR13) và xóa lan (CR21, CR23) rời Bước 2. Phần Content của việc xóa từ riêng tư
làm cùng từ riêng tư ở Bước 3, điểm móc cho Learning/Practice thiết kế lúc đó.

## D2 — Cách nhập nguồn và soạn nội dung

Bối cảnh: spec tách "nhập file nguồn" (tạo entry, level, không sense) và "soạn bằng CSV" (tạo sense). Để soạn, phải xuất file mẫu rồi điền rồi nhập lại; chủ dự
án thấy "nhập rồi xuất rồi nhập" lằng nhằng.

| Phương án | Trade-off |
|---|---|
| Đúng spec: nhập nguồn → xuất mẫu → điền → nhập lại | Giữ nguyên PR2/PR5; ba bước mỗi đợt; còn lỗ hổng vì PR15 chỉ xuất bản nháp, mà sau nhập nguồn chưa có sense nào |
| Thêm thao tác "xuất entry chưa có nghĩa ra CSV mẫu" | Vá lỗ hổng; vẫn ba bước |
| ✅ Upload gộp: file nguồn cộng cột nội dung, một lần upload | Một bước; mỗi dòng có hai phần (level thuộc nguồn, nội dung thuộc `owner`) cùng một file nên phải khai báo nguồn của cột level, dòng lỗi thì loại cả dòng; file chứa dữ liệu CC BY-SA lẫn nội dung của owner nên giữ riêng tư; lệch PR2 |

Ghi chú: dòng không có nội dung chỉ tạo entry và level, nên upload cả file nguồn vẫn dùng được như "nhập khung". Xuất chỉ còn để sửa sense đã có.

## D3 — Số nghĩa ở pilot

| Phương án | Trade-off |
|---|---|
| ✅ Một nghĩa chính, mô hình cho nhiều nghĩa | Đúng K10; soạn nhanh; nghĩa thứ hai thêm sau bằng `context_label` mới mà không đổi dữ liệu |
| Bắt buộc soạn nhiều nghĩa cho từ đa nghĩa (`bank`) | Đầy đủ hơn, nhưng K10 đã chốt "chưa đủ nghĩa ở pilot" |

## D4 — Xử lý lỗi sau upload

Bối cảnh: chủ dự án muốn dòng lỗi vào một danh sách để tải CSV về sửa rồi upload lại.

| Phương án | Trade-off |
|---|---|
| Báo cáo lỗi chỉ để đọc (số dòng, lý do) | Đúng chữ PR10; phải tự chép dòng sai ra file sửa |
| ✅ Hai danh sách, file lỗi upload lại được | (a) *Dòng bị loại*: các cột gốc cộng `_row`, `_error`; cột bắt đầu bằng `_` bị bỏ qua im lặng nên sửa xong upload lại chính file đó. (b) *Sense nháp chưa publish được* (đã vào DB): CSV có `sense_id`, `revision`, `_missing`. Tách hai vì (a) chưa vào DB còn (b) cần `sense_id` và `revision` |
| Gộp thành một file "cần sửa" | Một nơi để tải; nhưng trộn hai loại dữ liệu có cách sửa khác nhau |
| Nhận nửa dòng (nghĩa vào, level bỏ) | Mất ít dòng hơn; nhưng sense thiếu level không publish được và khó theo dõi |

Đã chọn: loại **cả dòng** khi có lỗi (đơn giản, dễ lần). Mỗi dòng báo **mọi** lỗi để sửa một lần là xong.

## D5 — Chuẩn hóa tự động và dòng thiếu nội dung

| Phương án | Trade-off |
|---|---|
| Loại mọi dòng lệch khuôn | Nghiêm; người soạn phải sửa cả `Noun` thành `noun` |
| ✅ Tự chuẩn hóa lỗi vô hại, chỉ loại giá trị thật sự sai (`nuon`) | Ít dòng lỗi vô nghĩa; phải liệt kê rõ phép chuẩn hóa (khoảng trắng, hoa/thường của loại từ và level, NFC) |
| ✅ Thiếu ví dụ/chủ đề vẫn vào thành sense nháp, chặn lúc publish | Đúng P11 và K10; không mất công sức đã nhập |

## D6 — Job nền

Bối cảnh: Pipeline Defense Analysis ghi điều kiện xét lại BullMQ (chỉ còn job nhập CSV sau K1b). Chủ dự án chọn Redis + BullMQ.

| Phương án | Trade-off |
|---|---|
| ✅ BullMQ + Redis | Đã chọn 02/10 và giữ; retry, hàng đợi, hợp đồng thuê sẵn cho nguồn ngoài và AI sau này. Thêm Redis (docker-compose, Testcontainers, vận hành) và một tiến trình worker |
| Bảng job trong Postgres có lease (tự viết) | Không thêm Redis; phải tự viết hàng đợi, retry, nhịp tim |
| Nhập trong request kèm tiến độ | Không thêm dịch vụ; request dài; mất retry và chạy lại |
| **Mới 12/10:** BullMQ 6.3.12 với backend Postgres | Giữ API BullMQ mà không cần Redis. Chưa có trong README, có bản vá 09/10; chưa chạy thử. **Chủ dự án không chọn (12/10): giữ Redis** |

Kết luận: Redis (chủ dự án xác nhận lại 12/10/2026). DB vẫn là nguồn sự thật dù chọn backend nào (PR12). Doc ghi rõ cái gì thay đổi nếu đổi backend (bỏ Redis khỏi compose, Testcontainers, cấu hình).

## D7 — Tìm kiếm và revision

| Phương án | Trade-off |
|---|---|
| ✅ Khớp đúng → đầu từ → chứa, sắp theo lemma | Kết quả dễ đoán cho người học; con trỏ phân trang phải mang hạng |
| Chỉ sắp theo lemma | Đơn giản; từ gõ đúng có thể nằm sau nhiều từ chứa chuỗi đó |
| ✅ Sửa qua revision bản chụp bất biến | Giữ lịch sử, kiểm `revision` chặn hai người sửa chồng; tốn thêm dòng (nhỏ ở pilot) |
| Sửa trực tiếp nội dung đang hiển thị | Đơn giản; trái CR17 và mất khả năng chặn sửa chồng |

## D8 — Xuất để sửa

Bối cảnh: sau khi publish, muốn sửa hàng loạt (ví dụ 50 nghĩa) thì phải có sense_id và revision trong file.

| Phương án | Trade-off |
|---|---|
| Chỉ xuất bản nháp (PR15) | Đúng spec; sửa sense đã publish phải tự gõ `sense_id` |
| ✅ Xuất cả sense đã publish (revision mới nhất) | Sửa hàng loạt thuận tiện; lệch PR15 |

## D9 — Giao diện

| Phương án | Trade-off |
|---|---|
| ✅ A: Bước 2 chỉ API; giao diện (đăng nhập web + trang admin) làm ngay sau | Logic nhập/publish chắc trước khi gắn giao diện; trong lúc đó thao tác bằng curl/Postman (không có Swagger/OpenAPI trong repo) |
| B: API + trang admin mỏng trong Bước 2 | Soạn bằng trình duyệt sớm; nhưng kéo theo màn hình đăng nhập web (chưa có) vào Bước 2 |
| C: admin đầy đủ trong Bước 2 | Phình bước; bạn dùng Excel là chính nên phần soạn từng từ trong giao diện chưa cấp thiết |

Phát hiện khi cân nhắc: bảng 9 bước của HANDOFF §2 không có bước nào cho giao diện web; design Bước 1 và D6 ghi giao diện cấp vai trò ở "Bước 3". Doc ghi thêm bước giao diện vào HANDOFF.

## D10 — Chia bước

| Phương án | Trade-off |
|---|---|
| Hai bước 2a/2b | Mỗi bước nhỏ; nhưng Pipeline chỉ ghi qua thao tác của Content nên nửa đầu chưa dùng được |
| ✅ Một bước, ba mốc merge được (M1 Content lõi, M2 Pipeline, M3 hoàn thiện) | Giữ luồng liền; vẫn có điểm kiểm và merge trung gian; Bước 2 lớn hơn Bước 1 (ước tính, chưa đo) |

## D11 — Phiên bản CEFR-J

Kiểm 12/10/2026: repo `olp-en-cefrj` chỉ có 1.5; nguồn thứ cấp nói 1.6 tồn tại; không vào được `cefr-j.org` từ môi trường phiên. Mặc định dùng 1.5 cho
tới khi chủ dự án xác nhận. Phiên bản lưu trong bản ghi nguồn nên đổi sau không sửa code; các số đo của B2#70 phải đo lại nếu đổi file.

## D12 — Quyền cho Bước 2

Bảng quyền do chủ dự án chốt ở D6 của Bước 1 (`admin` và `editor` cùng có `content.edit`, `content.publish`, `content.import`, `taxonomy.manage`). Phần trợ lý chọn:
bổ sung ánh xạ endpoint ở mục 10 của design: đánh dấu `reviewed`/`rejected`, level biên tập, biến thể → `content.edit`; hoàn tác lô và xem báo cáo job → `content.import`;
upload file gộp cần **cả** `content.import` và `content.edit`; publish nhanh cần **cả** `content.edit` và `content.publish`. Chi phí AI và đối soát thuộc `ai.settings`
(chỉ admin), chủ dự án chốt 12/10/2026 (áp dụng từ Bước 5–6, ghi ở `CLAUDE.md`).

## Đề xuất kỹ thuật duyệt cùng design (không hỏi riêng)

| Chủ đề | Chọn | Phương án bỏ | Lý do |
|---|---|---|---|
| Lưu file upload | Bảng `import_batch_files` (bytea) trong Postgres, xóa sau 30 ngày | Lưu đĩa; nhét vào job Redis | Một nguồn sự thật, worker nào cũng đọc được, không phụ thuộc đĩa chung; file tối đa 10 MB |
| Xuất CSV | Đồng bộ, stream, tối đa 5.000 dòng | Job nền (PR10) | Không ai chờ; ít việc hơn; lệch PR10 |
| Tiến trình worker | Điểm vào riêng `worker.ts`, API chỉ là producer | Worker chạy trong tiến trình API | Hợp đồng thuê và retry vẫn cần tiến trình tách để thử được; tương tự `admin:grant` dùng Nest application context |
| Đối soát lease | Bộ hẹn giờ 30 giây trong worker | Dùng `MaintenanceScheduler` (mỗi giờ) | Lease tính bằng giây; chu kỳ giờ quá thưa |
| Hạn chế ghi của worker cũ | `lease_epoch` kiểm trong mỗi giao dịch dòng | Chỉ dựa khóa của BullMQ | PR12 yêu cầu worker cũ mất quyền ghi; khóa BullMQ không bảo vệ giao dịch DB đang chạy |
| Danh sách giá trị | `text` + bảng tham chiếu/hằng số (loại từ 15 giá trị) | Enum Postgres | Thêm loại từ không cần migration enum |
| Level hiển thị | Cột `display_priority` ở nguồn; level biên tập luôn thắng | Gắn cứng tên "CEFR-J" | Không phụ thuộc chuỗi tên; đổi thứ tự ưu tiên là sửa dữ liệu |
| Ô trống khi cập nhật | Giữ giá trị cũ; ô danh sách có giá trị thì thay cả danh sách | Ô trống xóa giá trị | Tải file thiếu cột không làm mất nội dung |
| Dấu phân cách CSV | Tự phát hiện `,` `;` tab từ dòng tiêu đề | Chỉ `,` | Excel tiếng Việt có thể ghi `;` (ASSUMPTION) |
| Dạng chống công thức | Thêm `'` khi xuất, gỡ khi nhập | Từ chối ô đầu bằng ký tự đó | Xuất rồi nhập lại không đổi nội dung (P22) |
| Chọn sense theo khóa | Loại sense `retired` khỏi khớp theo khóa | Cho khớp cả sense retired | Dòng theo khóa không được vô tình sửa sense đã đóng (PE7 chỉ nói về `sense_id`) |

## Sửa design sau phiên review (12/10/2026)

Phiên review (đọc design đối chiếu code Bước 0–1 và hai file CSV thật) tìm ra sáu điểm, gộp thành 5 nhóm sửa (điểm 4 và 5 là một nhóm); chủ dự án chọn "áp cả 5" vào design (phương án khác: chỉ áp ba nhóm đầu và để
plan xử lý nhóm điểm 4–5; hoặc không sửa, duyệt nguyên bản). Chi tiết sửa nằm ở design, các mục nêu trong ngoặc:

1. Mô hình dữ liệu khung job: `background_jobs` chung và bảng cho job publish (mục 4, 7, 12; xem D14 vòng 2).
2. Tập 9 loại từ chức năng chỉ có trong spec CR10: chép vào design (mục 5); chạy lại cho ra đúng 279 entry (B2#70).
3. `emphasize/emphasize` có biến thể trùng hệt lemma, design chưa có luật: đoạn trùng hệt lemma hoặc trùng đoạn trước thì bỏ (mục 5, B2#13a). Sau luật này
   số 207 entry/215 biến thể của B2#70 khớp khi chạy lại; nếu không bỏ thì ra 208/216.
4. Test phân quyền B2#65: `admin` và `editor` có y hệt 4 quyền content nên cần điểm cắm để thay bảng quyền trong test (mục 4, chỗ sửa code số 1).
5. Bất biến sense: "sense chờ thay thế" định nghĩa theo `replaces_sense_id` khác null **và** `live_revision_id` null, để sense thay nghĩa đã publish không bị coi là chờ (mục 4).
6. Bảng mục 2 của design thêm D13–D20 (trước chỉ có D1–D12).

## Câu hỏi từ phiên review plan (12/10/2026)

**B2#40, "level vẫn được lô khác dùng thì giữ".** `batch_records` chỉ ghi lô **tạo** bản ghi. Lô sau nhập lại đúng level đó thì dòng là
`unchanged` và không để lại dấu vết.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chỉ tính lô tạo: hoàn tác lô 1 xóa level; upload lại file lô 2 tạo lại | Không tốn thêm dữ liệu; hoàn tác kém chính xác hơn trong ca hiếm |
| (b) Ghi cả việc "chạm" (dòng `unchanged`) vào `batch_records` | Hoàn tác chính xác; mỗi lần upload lại 7.799 dòng sinh thêm ~7.800 bản ghi, và lọc trước (D13) phải ghi thêm |

Ai chốt: Chủ dự án (chọn phương án đề xuất).

## D14 — Khung job nền

Bối cảnh: pilot chỉ có một worker và một loại job, nên lease với `lease_epoch` và bộ đối soát nhiều hơn mức cần lúc này.

| Phương án | Trade-off |
|---|---|
| Bản gọn: khóa dòng + phát hiện job treo của BullMQ + đối soát khi Redis mất dữ liệu | Plan ngắn hơn; khi thêm worker thứ hai hoặc loại job thứ hai thì phải thêm lease và sửa lại phần chạy job |
| ✅ Giữ đủ, viết thành khung dùng chung | Tốn thêm việc ở Bước 2; đổi lại thêm loại job (AI soạn nháp, từ điển ngoài, nhập định kỳ, sinh lại ngân hàng câu) hoặc thêm worker không phải refactor. Chủ dự án chọn vì muốn scale sau này không phải viết lại |

**Vòng 2 — mô hình dữ liệu của khung (phiên review design, 12/10/2026).** Khi review, thấy mục 4 của design chỉ có bảng `import_*` mang sẵn cột lease,
còn job publish theo bộ lọc (D20, M3) cần bảng lưu danh sách đã chụp và kết quả từng mục mà doc chưa liệt kê. Trợ lý đưa ba phương án:

| Phương án | Trade-off |
|---|---|
| ✅ Bảng `background_jobs` chung | Một bảng chung giữ trạng thái, lease, `lease_epoch`, `attempts`; mỗi loại job có bảng chi tiết riêng (`import_batches` + file, `publish_jobs` + `publish_job_items`). Thêm loại job sau này chỉ thêm bảng chi tiết. Đúng ý D14. Tốn thêm một bảng và một lớp tham chiếu ở M2. Chủ dự án chọn |
| Giữ lease trong `import_batches` | M2 làm nhanh hơn; ở M3 job publish sao chép phần lease và đối soát sang bảng riêng, tách khung chung sau. Trái ý D14 "không phải refactor": loại job thứ hai sẽ là lần refactor đầu tiên |
| Để plan quyết | Doc giữ "bảng chung hoặc giao diện chung, plan chọn", chỉ bổ sung bảng cho publish job. Rủi ro: plan chọn lệch ý chủ dự án mà chỉ thấy lúc duyệt plan |

## D15, D16 — Giới hạn upload và lọc theo lần upload

- **D15:** bỏ luật `content.upload` (10 lần/giờ). Chỉ nhân sự mới upload được và luật chung `user.write` (30 lần/phút) đã có; luật riêng chỉ làm chậm vòng sửa trong Excel.
- **D16:** danh sách sense và lệnh xuất nhận `batch_id`, trả các sense mà lần upload tạo hoặc tạo revision kèm `revision` mới nhất, để publish cả lô bằng một lệnh.

## D17, D18 — Nguồn level và luật xung đột khi upload lại

- **D17:** file làm việc là bản sao của file CEFR-J, nên sửa ô level hay thêm từ của mình kèm level sẽ ghi dữ liệu mang tên CEFR-J.
  Chọn: với nguồn bên thứ ba, level khác bản ghi đã có của chính nguồn đó (từ lần upload trước) thì loại dòng và chỉ sang level biên tập.
  Bỏ: tin hết ô level (sai nguồn gốc của dữ liệu có giấy phép).
- **D18:** luật chặt (mọi revision mở đều chặn, mọi đổi `gloss_vi` đều chặn) làm hỏng vòng sửa trong Excel trước khi publish. Chọn: chỉ
  bảo vệ revision do sửa tay qua API tạo, và chỉ chặn đổi nghĩa với sense đã publish. Ghi đè revision CSV đã `reviewed` thì báo cảnh báo.

## D20 — Publish số lượng lớn

Bối cảnh: lệnh publish chạy trong request và phải xong trước timeout của proxy (thường 60 giây); chủ dự án hỏi nếu muốn publish cả ~8.000 từ CEFR-J một lần.

| Phương án | Trade-off |
|---|---|
| A: giữ trần 500, gửi nhiều lệnh (giao diện tự chia lô) | Không thêm việc ở Bước 2; thủ công và không có tiến độ chung đến khi có giao diện |
| ✅ B: thêm job publish theo bộ lọc chạy bằng job nền | Publish bao nhiêu cũng được bằng một thao tác, có báo cáo từng mục; thêm khoảng một mốc nhỏ ở M3, đồng thời kiểm chứng khung job dùng chung bằng loại job thứ hai |

Ghi chú: danh sách sense được chụp lúc tạo job (cặp `sense_id` + `revision`) nên thứ được publish là đúng thứ đã sẵn sàng lúc bạn yêu cầu; sửa chen ngang thì mục đó bị từ chối chứ không publish nhầm bản mới.
