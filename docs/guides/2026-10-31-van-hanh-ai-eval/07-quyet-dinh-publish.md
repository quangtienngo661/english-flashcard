# 07. Quyết định publish (checklist in ra được)

[README](README.md) · trước: [06](06-prompt.md) · tiếp: [08 Từng thao tác](08-tung-thao-tac.md)

App không có ngưỡng tuyệt đối, và bạn đã chọn không xây (quyết định 31/10/2026). App chỉ **chặn** khi thiếu bằng chứng và **cảnh báo**
khi tụt so với bản đang chạy. Câu "đủ tốt chưa" là của bạn. Checklist dưới giúp trả lời có hệ thống.

Thao tác: ______________ Ngày: ____/____/______ Nháp: cấu hình ____ lần sửa ____ Phiên bản bộ: ____

## A. Bằng chứng (app kiểm, bạn xác nhận)

- [ ] Có phiên bản đã chốt, và lần chạy dùng **phiên bản mới nhất**.
- [ ] Nháp ở đúng lần sửa hiện tại có lần chạy **xong trọn** (không dừng, không ẩn) trên phiên bản đó. Thiếu → `eval-required`.
- [ ] Bản đang chạy có model → có lần chạy xong trọn của nó trên cùng phiên bản (nút "Chạy bản đang chạy trên phiên bản {version}").
      Thiếu → `baseline-required`. Bản đang chạy chưa có model → không cần ("Bản đang chạy chưa có model: publish này không so với bản nào.").
- [ ] Không lưu nháp, không chốt phiên bản mới từ lúc xem tới lúc bấm. Có thay đổi → `publish-stale`, xem lại.

## B. Ngưỡng đề xuất (khởi điểm, chỉnh sau vòng 1)

Đọc từ dòng "Dev: …" và "Held-out (chỉ số tổng)" của panel lần chạy nháp. Cộng dev + held-out khi ngưỡng tính trên 30.

| Lớp | Ngưỡng đề xuất | Trên 30 ví dụ nghĩa là | Kết quả | Đạt? |
|---|---|---|---|---|
| Khuôn | ≥ 97% | **30/30** (29/30 = 96,7% là trượt). Muốn cho phép 1 lỗi tạm thời thì sửa ngưỡng thành 96% | ___/___ | |
| Luật (cloze, meaning, mcq) | ≥ 90% | ≥ 27/30 trên mẫu số có luật (bỏ qua không tính) | ___/___ | |
| Mong đợi (nếu có) | ≥ 95% | ≥ 29/30 (28/30 = 93,3% là trượt) | ___/___ | |
| Judge, tiêu chí chính (chỉ khi đã "Đã hiệu chỉnh") | Đạt ≥ 85% và "Không đạt nặng" ≤ 1 | ≥ 26/30 đạt, ≤ 1 nặng | ___ / nặng ___ | |
| Held-out | 0 "Không đạt nặng"; tỉ lệ đạt không thấp hơn dev quá ~10 điểm | trên 9 câu, 1 câu = 11 điểm | ___/9 | |
| Đọc tay 10 câu ngẫu nhiên | 0 lỗi nghiêm trọng | | ___ lỗi | |

Ghi chú về ngưỡng:
- File nghiên cứu đề xuất chặt hơn cho luật: **0 lỗi luật** và mọi ca regression vẫn đạt (§7). Chọn một, ghi vào nhật ký.
- Judge chưa "Đã hiệu chỉnh" → không dùng dòng judge làm điều kiện; ghi "chưa tin judge" và dựa vào đọc tay.
- Khoảng tin cậy trên 30 ví dụ rộng cỡ ±14 điểm. Đạt 87% không chắc tốt hơn 83%. Ngưỡng là đường kẻ để bạn dừng lại đọc, không phải
  bằng chứng ([04 §7](04-chay-eval-va-doc-ket-qua.md)).
- "Độ khớp" ≥ 85% có thể đến từ một judge luôn nói "Đạt" khi phần lớn câu tốt. Kiểm thêm: **trong N câu bạn chấm không đạt, judge
  bắt được mấy?** ___/___ ([05 §8](05-judge-va-gan-nhan.md)).
- Panel lần chạy hiện điểm judge tách sẵn: "Judge {tên} bản {n} · {tiêu chí}: dev đạt x/y (nặng a, nhẹ b) · held-out đạt …". Dòng held-out chỉ có số tổng, đủ để đếm `fail_major` của held-out. Từng ví dụ dev có cột "Judge" và "Nhãn".

## C. Held-out

- [ ] Không có lỗi held-out **mới** so với lần chạy trước (xem số đếm trong "So với lần chạy").
- [ ] "Held-out đã bị xem" của phiên bản này: ___ ví dụ. ≥ 2–3 → lên kế hoạch làm mới held-out ([03 §7](03-golden-set.md)).
- [ ] Không có ví dụ held-out nào bạn đã sửa prompt "vì nó".

## D. Đọc tay

- [ ] Chọn ngẫu nhiên 10 ví dụ dev trong "Kết quả từng ví dụ" (chọn số trước khi nhìn câu, để không chọn câu đẹp), đọc như Lan. Ghi lỗi nghiêm trọng: ___.
- [ ] Đọc **mọi** ví dụ ca regression: vẫn đạt?
- [ ] Từ ngoài golden set: nguồn khuyên đọc tay 10–20 câu mới trên từ ngoài bộ (file nghiên cứu §7). Trong app, "Chạy thử" chỉ dùng
      ví dụ dev của bộ hoặc đầu vào của ví dụ mẫu, nên muốn thử từ mới phải thêm chúng thành ví dụ dev (chúng sẽ vào lần chốt sau), hoặc
      để bước này sang sau publish với tài khoản test (mục G).

## E. Chi phí và thời gian

| | Bản đang chạy | Nháp |
|---|---|---|
| "Chi phí" / 30 = USD mỗi câu | | |
| "Thời gian trung bình" | | |
| Số lỗi tạm thời (timeout…) | | |

- [ ] Thời gian trung bình còn xa "Thời gian chờ mỗi lời gọi" (mặc định 10 giây).
- [ ] Chi phí mỗi câu chấp nhận được với bạn.

## F. Cảnh báo của app và cách xử lý

App so nháp với baseline trên cả dev + held-out. Cảnh báo không chặn; bạn tick "Tôi đã đọc cảnh báo và vẫn publish".

| Cảnh báo | Bật khi | Làm gì |
|---|---|---|
| `rate-drop` | Tỉ lệ khuôn/luật/mong đợi tụt **hơn** 5 điểm % (đúng 5 không bật) | Trên 30 ví dụ, 2 ví dụ là đủ bật. Mở "So với lần chạy", đọc từng ví dụ đổi kết quả. Lỗi thật hay dao động? |
| `judge-rate-drop` | Tỉ lệ đạt của một (bản judge, tiêu chí) chấm cả hai lần tụt hơn 5 điểm | Không xét judge đã hiệu chỉnh. Đọc câu judge đổi ý; tự chấm chúng |
| `dev-regressed` | Có ví dụ dev đạt ở baseline mà trượt ở nháp | Đọc "Ví dụ dev trước đạt, nay trượt". Ca regression trượt → không publish |
| `held-out-failures-up` | Số held-out không đạt của nháp > của baseline | Không xem được nội dung. 1 câu = 11 điểm. Nghĩ tới dao động; chạy lại cả hai bên một lần nữa nếu nghi |

Quy tắc: không bao giờ tick khi chưa đọc các ví dụ đổi kết quả. Ghi lý do tick vào nhật ký.

## G. Sau khi publish

Áp từ lần gọi sau. Cấu hình cũ thành `retired`, là đích "Quay về".

1. **Sinh câu thật**: luyện tập bằng tài khoản test (admin, editor) cho tới khi có ~20–30 câu AI của thao tác này. (Câu AI chỉ có cho tài khoản gói **Trial hoặc Pro** còn lượt AI, khi thao tác có cấu hình đang chạy có model; tài khoản Free nhận câu thường. `pnpm bootstrap seed` cấp Pro cho tài khoản thử `lan.local@example.com`.)
2. **Chấm câu thật** (chỉ cloze, meaning, mcq): "Câu AI thật" → "Chọn câu để chấm": "Judge", "Thao tác", "Cấu hình · model" (chọn
   cấu hình vừa publish), tick "Chỉ tài khoản test (admin, editor)" → đọc dòng ước tính → "Chấm {count} câu". Đọc cột "Lý do", gắn
   nhãn, "Đưa vào bộ ví dụ" cho câu không đạt (vào dev).
3. **Nhịp**: mỗi tuần một lượt nhỏ (nguồn khuyên lấy mẫu đầu ra thật định kỳ và đưa lỗi mới về bộ eval:
   [evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Dữ liệu câu thật chỉ giữ 7 ngày, nên quá một tuần là mất.
4. **Báo lỗi** của người học: xác nhận → "Đưa vào bộ ví dụ".

**Quy tắc rollback đề xuất** (`ASSUMPTION`, bạn quyết): "Quay về cấu hình {number}" khi (a) một báo lỗi xác nhận hoặc câu thật cho thấy
một loại "Không đạt nặng" chưa từng thấy trong eval, hoặc (b) tỉ lệ đạt judge trên câu thật thấp hơn eval từ ~15 điểm trở lên trên ≥ 20
câu. Quay về không cần eval, chỉ lùi **một** bước, nháp giữ nguyên; bấm lần nữa → `no-previous`. Về bản xa hơn: "Tạo nháp từ bản này"
rồi publish. Khẩn cấp: publish một nháp **không model** = tắt AI thao tác này ("Tắt AI của thao tác này? Người học sẽ nhận câu không AI.").

## H. Nhật ký quyết định (chép một khối mỗi lần)

```text
### <thao tác> · <ngày> · cấu hình <n> lần sửa <v> · phiên bản bộ <N>
Model / effort / thinking / max tokens:
Lần chạy nháp: <mã>    Baseline: <mã hoặc "không có">
Khuôn __/__  Luật __/__  Mong đợi __/__  (dev + held-out)
Held-out: __/9, lỗi mới: có/không; đã bị xem: __
Judge <tên> bản <r>: đạt __/__, nặng __; hiệu chỉnh: có/không (khớp __%, __ nhãn); bắt __/__ câu tôi chấm không đạt
Đọc tay 10 câu: lỗi nghiêm trọng __ ; ca regression: đạt/trượt
Chi phí mỗi câu: ____ USD; thời gian TB: ____ s
Cảnh báo: <mã> -> đã đọc ví dụ <…>, kết luận <…>
Quyết định: PUBLISH / SỬA TIẾP / KHÔNG
Lý do (1–3 dòng):
Theo dõi sau publish: <ngày chấm câu thật>, điều kiện rollback:
```
