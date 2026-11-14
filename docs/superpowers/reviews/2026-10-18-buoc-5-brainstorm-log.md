# Bước 5 (Entitlements & Usage) — nhật ký brainstorm (từ 18/10/2026)

Nguồn của decision record Bước 5. Mỗi câu ghi: bối cảnh ngắn, các phương án **đã thật sự đưa ra trong chat**, câu trả lời của chủ
dự án, rồi đề xuất của Claude sau câu trả lời. Ghi dần trong lúc hỏi; decision record viết khi chốt hết.

Nhánh `docs/buoc-5-design`, cắt từ `origin/dev` @ `dc4cbe0` (18/10/2026). Chỉ viết tài liệu, không code.

**Cách hỏi:** luật "chủ dự án trả lời trước, Claude đề xuất sau" (CLAUDE.md), giữ ở Bước 5 theo câu 1.

## Đã đọc trước khi hỏi (18/10/2026)

- Spec Entitlements (ER1–ER17, E1–E23, EE1–EE8, Defense Analysis); system-spec (SR4, SR8, SR11, SR13, SR14); DECISIONS K7, K17,
  K18, K26 và F31–F35; `RESEARCH_AI_QUOTA_MODELS_2026-10-04.md`. Các spec chỉ là khung ban đầu; design doc là tài liệu chính thức.
- Design Bước 4 mục 2, 4, 6, 11–16 và decisions D4, D25, D27; design Bước 3 mục 9, 15 và D23; bảng quyền D6 của design Bước 1.
- Code trên `dev` @ `dc4cbe0`:
  - `apps/api/src/entitlements/entitlements.service.ts`: `check(userId, feature)` luôn trả `{ allowed: true }`; `Feature = 'practice.basic'`.
  - `apps/api/src/learning/learning.constants.ts`: `GROUPS_MAX = 100`, `GROUP_ITEMS_MAX = 2000`, ghi chú "Bước 5 turns them into tier quotas".
  - `apps/api/src/content/content.constants.ts`: `PRIVATE_WORDS_MAX = 1_000`, cùng ghi chú.
  - `apps/api/src/identity/identity.types.ts`: chưa có quyền `entitlements.grant`, `ai.settings` (D6 hẹn ở Bước 5 và 6).
- Landing `apps/web/messages/vi.json`, khối `Plans`: gói Miễn phí "Sử dụng vĩnh viễn" gồm lưu từ kèm câu, flashcard và lịch ôn, "các
  dạng bài tập cơ bản", tự ưu tiên từ hay quên; gói dùng thử 14 ngày, "Không cần nhập thẻ thanh toán". Chưa kiểm bản đang chạy trên web.
- Không thấy report K18 nào của chủ dự án trong repo (tìm `K18` trong `docs/`, 18/10/2026).

## Câu 1 — cách làm việc ở Bước 5

Phương án đưa ra: (a) giữ như Bước 4 (D27): chủ dự án trả lời trước, không có phần lõi tự viết, chỉ review / (b) giữ cách hỏi và có
thêm một phần lõi chủ dự án tự viết (ví dụ phép tính "còn bao nhiêu lượt", luật bật Trial) / (c) bỏ cách hỏi, Claude đề xuất ngay.

**Chủ dự án:** (a).

**Claude sau đó:** đồng ý. Bước 5 chủ yếu là luật và con số (ai được gì, bao nhiêu, khi nào hết), không có một thuật toán lõi như lịch
ôn; chủ dự án duyệt hành vi qua bảng ví dụ như Bước 3 (D14) và Bước 4.

## Câu 2 — phạm vi Bước 5 (đã chốt)

Bối cảnh đưa ra: chỗ kiểm quyền tạm và ba hằng số ở trên; AI chưa có (Bước 6 cổng gọi AI và sổ chi phí, Bước 7 bài AI và bước AI tra
nghĩa), nên phần dính tới AI làm ở Bước 5 chỉ test được bằng bên gọi giả; Deploy dời tới khi app hoàn chỉnh (D3 của Bước 3); thanh toán
thật ngoài V1 (F35), Pro trong V1 chỉ có qua cấp tay; Bước 4 chỉ làm API (D24).

Các phần đưa ra (chọn phần nào làm ở Bước 5, phần nào để sau):

1. Gói Free / Trial / Pro và kiểm quyền thật theo tính năng (thay chỗ kiểm tạm).
2. Trial người học tự bật, 14 ngày, cần email đã xác minh.
3. Cấp tay: staff cấp gói hoặc thêm lượt cho một người học, có lý do và hạn, thu hồi được, xem lại được.
4. Hạn mức theo gói cho số nhóm, số từ mỗi nhóm, số từ riêng (thay ba hằng số).
5. Hạn mức lượt AI và "giữ chỗ" (giữ trước một lượt khi gọi AI; thành công thì trừ hẳn, lỗi thì trả lại). Chưa có bên gọi thật tới Bước 7.
6. Công tắc tắt AI và trần tiền AI mỗi ngày cho cả hệ thống. Cần số tiền từng lần gọi AI (Bước 6).
7. Người học xem gói, số lượt còn lại, ngày hết hạn.
8. Cổng nhận sự kiện thanh toán (mua, gia hạn, hủy; tháng và năm theo K26), chưa nối nhà cung cấp nào.
9. Giao diện: màn admin cấp tay; màn người học xem gói và bật Trial.

**Chủ dự án, vòng 1 (18/10/2026):**
- 1 (gói và kiểm quyền thật), 2 (Trial), 3 (cấp tay), 7 (người học xem gói, lượt còn lại, hạn): **ok, làm ở Bước 5**.
- 4 (hạn mức theo gói cho nhóm, từ mỗi nhóm, từ riêng): chủ dự án hỏi "hạn mức này có thể điều chỉnh trong giao diện admin không".
- 5, 6 (hạn mức lượt AI và giữ chỗ; công tắc tắt AI và trần tiền AI): **chưa hiểu** → Claude giải thích lại bằng ví dụ (vòng 2).
- 8 (cổng sự kiện thanh toán): chủ dự án nhờ research và survey nhà cung cấp, đang nghĩ tới Stripe, VNPay, MoMo… → Claude giao một
  agent chạy nền, ghi vào `docs/preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md`; agent chỉ nêu trade-off, không chọn hộ.
- 9 (giao diện): chủ dự án thêm yêu cầu **hạn mức tùy chỉnh cho từng người dùng**, không cố định theo gói, ví dụ tài khoản cấp để
  test, hoặc cấp cho `editor` để test chức năng phía người học. Chưa trả lời giao diện làm ở Bước 5 hay sau.

**Claude trả lời câu hỏi thực tế ở mục 4 (đã kiểm 18/10):** làm được. API đã có module Settings từ Bước 3 (`/v1/admin/settings`, con
số trong khoảng cho phép, `version`, lịch sử, quyền `settings.manage` chỉ `admin`), Bước 4 thêm 8 cài đặt `practice` vào đó. Nhưng
`apps/admin` **chưa có trang cài đặt nào**: menu chỉ có mục chờ `/ai/settings` (`available: false`, `plannedStep: '5–6'`, `nav.ts`).
Đổi con số của gói thì áp cho mọi người cùng gói; hạn mức riêng một người (ý ở mục 9) là việc khác, thuộc cấp tay (mục 3).

**Claude sau câu trả lời:** đồng ý 1, 2, 3, 7. Đồng ý hạn mức riêng từng người, đặt trong cấp tay (mục 3): mỗi lần cấp có thể là "một gói"
hoặc "con số riêng cho người này", vẫn có lý do, hạn và thu hồi được. Một điểm cần hỏi sau: con số riêng có thể là lượt AI, tức tiền thật,
nên gắn với câu "ai được cấp" (`entitlements.grant` đang gồm cả `editor`).

**Vòng 2 — Claude giải thích lại mục 5, 6 bằng ví dụ** (Pro 100 câu AI/tháng; hai tab cùng giành lượt cuối; trần tiền ví dụ
200.000đ/ngày; công tắc tắt AI). Phương án thời điểm đưa ra cho mỗi mục: làm ở Bước 5 / để tới bước đầu tiên có thứ thật (mục 5: Bước 7;
mục 6: Bước 6) / tách đôi (ví dụ công tắc ở Bước 5, trần tiền ở Bước 6).

**Chủ dự án, vòng 2 (18/10/2026):**
- Hạn mức riêng từng người đặt trong cấp tay ("một gói" hoặc "con số riêng"): **ok**.
- Hai tab giành lượt cuối: "thằng nào xong trước thì trừ thằng đó, kiểm tra usage trước khi trừ". Rồi **ok** cả ba bước giữ chỗ (giữ
  trước khi gọi AI, tab kia bị từ chối; AI xong thì trừ hẳn, lỗi thì trả lại; server sập thì 2 phút sau tự trả lại).
- Mục 6: hỏi "có nghĩa là chọn 1 trong 2 cách này hay sao" (trần tiền và công tắc).
- Hỏi khối lượng công việc của từng bước để chọn thời điểm cho mục 5, 6.
- Mục 8: gửi một tài liệu tham khảo (hướng dẫn billing và quota của một hệ thống khác, file ngoài repo, không chép vào đây). Ý chính:
  nhà cung cấp thanh toán giữ phần tiền, app giữ phần quyền và sổ lượt (`Granted`, `Used`, `Remaining` theo từng chu kỳ lượt); chu kỳ lượt
  tách khỏi chu kỳ thanh toán, neo theo một ngày cố định; **gói năm vẫn mở lượt theo từng tháng**, không cấp cả năm một lần; webhook chỉ
  kích hoạt "đối soát lại" (đọc lại hóa đơn đã trả từ nhà cung cấp rồi tính), không cộng lượt từ payload nên gửi lặp hay sai thứ tự không cấp
  trùng; trừ lượt theo `actionId` ổn định; Trial có sổ riêng (14 ngày, số lượt riêng, hết hạn hoặc hết lượt thì dừng, không chuyển sang gói
  trả phí); hủy add-on có hiệu lực ngay, hạ gói nền có hiệu lực cuối kỳ đã trả; cấp lượt theo tỷ lệ thời gian đã trả khi mua giữa chu kỳ.

**Claude sau vòng 2:** giữ chỗ khác "ai xong trước trừ trước" ở thời điểm kiểm (trước khi gọi AI, nên tab thua không tốn tiền AI); ghi là
chủ dự án chọn giữ chỗ. Trần tiền và công tắc là hai chốt khác nhau, có thể có cả hai. Bảng khối lượng ước lượng (`ASSUMPTION`, theo cỡ
plan Bước 3 = 22 task, Bước 4 = 20 task): phần đã chốt của Bước 5 ~12–15 task; mục 5 ~5–7 (kéo theo phải chốt K18 ở bước làm nó); công tắc
~1; trần tiền ~2–3 (cần sổ chi phí Bước 6, làm ở Bước 5 thì phải có sổ giả); Bước 6 ~12–16; Bước 7 ~15–20. Về tài liệu billing: hợp với
Wordmet ở các ý tách tiền/lượt, gói năm mở lượt theo tháng, chu kỳ lượt cố định, webhook chỉ là tín hiệu để đối soát lại, Trial sổ riêng;
có lẽ chưa cần cấp lượt theo tỷ lệ, đổi tháng↔năm giữa kỳ, giữ "sức chứa" (một gói Pro bán lẻ, chu kỳ bắt đầu từ ngày mua).

**Chủ dự án, vòng 3 (18/10/2026):**
- **Mục 5, mục 6a (công tắc), mục 6b (trần tiền): làm ở Bước 5.**
- Hỏi "chạm trần như thế nào".
- Trial: nhiều app giữ thông tin thanh toán trong lúc trial; không hủy thì tự gia hạn thành Pro khi hết trial, hủy thì dùng hết trial rồi
  thôi. Hỏi thiết kế theo hướng đó được không.
- Các phần billing "có lẽ chưa cần": "thiết kế thêm càng tốt, tăng độ chỉn chu và hoàn thiện cho app".

**Claude sau vòng 3:**
- Đồng ý mục 5, 6a, 6b ở Bước 5. Hệ quả: K18 (kiểu hạn mức, một lượt tính thế nào, số lượt Trial/Pro) chốt trong brainstorm này; trần tiền
  cần số tiền mỗi lần gọi AI, nên Bước 5 định nghĩa chỗ để AI Integration báo chi phí, test bằng bên báo giả; Bước 6 nối vào.
- Chạm trần: giải thích bằng ví dụ (tiền đã tiêu hôm nay + tiền đang giữ của các lần đang chạy + ước tính lần này so với trần).
- Trial có thẻ: làm được khi có billing thật (nhà cung cấp quản lý thời gian trial trong subscription); V1 chưa thu tiền nên chưa giữ thẻ
  được, và landing đang hứa "Không cần nhập thẻ thanh toán". Hỏi riêng ở câu về Trial.
- "Thiết kế thêm": đồng ý ghi đủ các case billing ở mức hành vi trong design; code phần nào ở Bước 5 quyết ở mục 8, sau khi có research.
- Kiểm 18/10: `apps/web` mới có landing, privacy, terms, waitlist; chưa có màn người học nào (giao diện Bước 3–4 chưa làm).

**Câu 2, mục 9 — giao diện.** Phương án: (a) chỉ API, giao diện ở đợt giao diện sau / (b) thêm màn admin (cấp tay, hạn mức theo gói,
công tắc và trần tiền AI) / (c) cả màn admin và màn người học (xem gói, bật Trial). **Chủ dự án: (a).** Claude sau đó: đồng ý; khớp D24 của
Bước 4 và ghi chú refactor giao diện admin; staff thao tác qua API, script chạy thử dùng chính các API này.

**Kết quả câu 2:** Bước 5 làm 1 (gói, kiểm quyền thật), 2 (Trial), 3 (cấp tay, gồm hạn mức riêng từng người), 4 (hạn mức theo gói cho
nhóm, từ mỗi nhóm, từ riêng), 5 (lượt AI và giữ chỗ), 6a (công tắc), 6b (trần tiền), 7 (người học xem gói); chỉ API. Mục 8 (cổng thanh
toán) chờ research.

## Câu 3 — mục 8, thanh toán (đã chốt)

Research xong 18/10: `docs/preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md` (agent chạy nền, mỗi ý có URL và nhãn nguồn, không
chọn nhà cung cấp). Claude kiểm lại hai điểm chính cùng ngày: `stripe.com/global` không có Việt Nam (đối chứng: có Singapore); trang xác
minh tài khoản của Paddle ghi "Business verification (not required for individuals or sole traders)".

Phương án đưa ra: (a) chỉ thiết kế cổng sự kiện và các case trong design, không code / (b) code phần chung (hộp nhận sự kiện chuẩn hóa,
chống trùng, chịu sai thứ tự, áp vào quyền Pro cho cả hai kiểu "nhà cung cấp tự gia hạn" và "app tự gia hạn"), test bằng nhà cung cấp giả,
chưa nối bên thật / (c) như (b) và nối thật một nhà cung cấp ở môi trường thử (phải chọn bên nào).

**Chủ dự án (18/10/2026), trả lời dưới phương án (a):** "trước mắt là thiết kế provider trước đi, sau cần thì chỉ cần thêm payment
service cần thiết vào thôi".

**Claude sau đó:** hiểu là dựng sẵn "cổng" thanh toán (một giao diện chung cho mọi nhà cung cấp, cùng hộp nhận sự kiện và phần áp sự kiện
vào quyền Pro), để sau này thêm một nhà cung cấp chỉ là viết thêm một bộ chuyển đổi cho bên đó; tức gần với (b), test bằng nhà cung cấp giả,
chưa nối bên thật. Đồng ý. Ghi là (b) và nói chủ dự án sửa nếu ý là (a) (chỉ viết vào design). Cổng phải chạy được cả hai kiểu gia hạn và
có trạng thái "đang dùng thử" để làm được trial giữ thẻ khi có thanh toán thật.

## Câu 4 — mỗi gói gồm gì (đã chốt, trừ số nhóm và các con số)

Bối cảnh đưa ra: F31 (Free không AI; Trial, Pro có AI; Pro hạn mức cao hơn Trial); D4 Bước 4 (bài điền từ AI thuộc gói trả phí); landing
(Free "Sử dụng vĩnh viễn": lưu từ kèm câu, flashcard và lịch ôn, các dạng bài cơ bản, tự ưu tiên từ hay quên; Trial: câu AI, giải thích và
bản dịch, gồm mọi thứ của Free). Các dòng đưa ra để chủ dự án điền có / không / có giới hạn cho Free, Trial, Pro: học và ôn (nhóm,
flashcard, lịch ôn, nhắc học, thêm nhanh); bài luyện không AI; bài AI (Bước 7); AI tra nghĩa (Bước 7); số nhóm (100); số từ mỗi nhóm
(2.000); số từ riêng (1.000); số câu ngữ cảnh mỗi nghĩa (5, `SENTENCES_PER_SENSE_MAX`); số câu tối đa mỗi phiên luyện (20); số tháng giữ
lịch sử luyện (6). Con số cụ thể hỏi ở câu sau.

**Chủ dự án, vòng 1 (18/10/2026):**

| Dòng | Trả lời |
|---|---|
| Landing đang hứa | "cái này sửa được, không sao" |
| Pro nhiều lượt hơn Trial (F31) | Chưa hiểu cơ chế trial của các app; nhờ research |
| Bài điền từ AI thuộc gói trả phí (D4) | "đúng rồi" |
| Học và ôn (nhóm, flashcard, lịch ôn, nhắc học, thêm nhanh) | Free |
| Bài luyện không AI | "free có giới hạn, muốn nhiều hơn thì lên pro" |
| Bài AI (Bước 7) | Pro |
| Số nhóm (100) | Chưa hiểu hành vi người dùng; bản thân không tạo nhiều nhóm |
| Số từ mỗi nhóm (2.000) | "có vẻ ổn, tránh spam" |
| Số từ riêng (1.000) | Không giới hạn thì hay hơn |
| Số câu ngữ cảnh mỗi nghĩa (5) | Hỏi không giới hạn được không |
| Số câu tối đa mỗi phiên luyện (20) | Giới hạn theo gói; nhờ Claude đề xuất |
| Số tháng giữ lịch sử luyện (6) | Free (như nhau cho mọi gói) |

Claude giao hai agent chạy nền: `docs/preparation/TRIAL_MODELS_RESEARCH_2026-10-18.md` (cách các app chạy trial: có/không giữ thẻ,
nội dung trial, lượt AI trong trial, nhắc trước khi trừ tiền, chống lạm dụng; cơ chế Apple, Google, Stripe, Paddle) và
`docs/preparation/FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md` (các app từ vựng, flashcard giới hạn gói Free ra sao: số bộ thẻ, số thẻ, luyện mỗi
ngày, lịch sử; hành vi người dùng). Cả hai chỉ nêu trade-off, không chọn hộ.

**Claude sau vòng 1 (đề xuất):**
- Đồng ý: học và ôn Free cho mọi gói; bài điền từ AI thuộc gói trả phí; 2.000 từ mỗi nhóm là giới hạn chống spam chung, không theo gói;
  lịch sử 6 tháng như nhau cho mọi gói; sửa landing khi chốt gói.
- Từ riêng và câu ngữ cảnh "không giới hạn": đồng ý không giới hạn **theo gói**, nhưng giữ một trần kỹ thuật cao, admin chỉnh được, để
  chặn script tạo hàng triệu dòng (rate limit `user.write` 30 lần/phút vẫn cho khoảng 43.200 lần ghi mỗi ngày). Con số trần hỏi sau.
- Số câu mỗi phiên: đề xuất **không** dùng làm giới hạn theo gói, vì mở phiên mới là luyện tiếp được; giữ một số tối đa chung (20, admin
  chỉnh) cho độ dài phiên. Giới hạn theo gói của bài luyện không AI nên đặt ở **số câu mỗi ngày** (ngày theo múi giờ người học), kiểm ở chỗ
  kiểm `practice.basic` mà Practice đã gọi khi mở phiên và khi tạo mỗi câu (design Bước 4 mục 12).
- Số nhóm: chờ research hành vi người dùng.
- Bài AI: chủ dự án ghi "Pro"; F31 cho Trial có AI. Hỏi lại sau khi có research trial.

**Câu 4 (tiếp) — giới hạn bài luyện không AI của Free tính theo gì.** Phương án: (a) số câu mỗi ngày / (b) số phiên mỗi ngày / (c) số câu
mỗi phiên / (d) cách khác; kèm câu phụ "Pro không giới hạn hay giới hạn cao hơn".

**Chủ dự án (18/10/2026):** "ok" với đề xuất số câu mỗi phiên là con số chung cho mọi gói (độ dài phiên, admin chỉnh), không theo gói; chọn
**(b) số phiên mỗi ngày**. Câu phụ về Pro chưa trả lời → hỏi cùng các con số.

**Claude sau đó (đề xuất):** đồng ý (b). Luật đếm đề xuất: một phiên **được tính khi câu đầu tiên của nó có kết quả cuối** (đúng/sai), vào
ngày địa phương của lúc đó; mở phiên mà chưa trả lời câu nào (bấm nhầm, đổi cài đặt rồi mở lại, phiên bị đóng vì mở phiên mới) thì không tốn
lượt. Kiểm khi mở phiên: số phiên đã tính hôm nay ≥ giới hạn → từ chối, báo giờ được dùng lại và mời lên Pro. Phiên đã mở thì làm tới hết,
kể cả "Ôn lại thêm" và qua nửa đêm. Số câu tối đa thực tế mỗi ngày của Free = số phiên × số câu tối đa mỗi phiên.

## Câu 5 — staff nào được làm gì (đã chốt)

Bối cảnh đưa ra: bảng quyền D6 (Bước 1) hẹn `entitlements.grant` cho cả `admin` và `editor` (Bước 5), `ai.settings` chỉ `admin` (Bước 6);
`settings.manage` hiện chỉ `admin` (Bước 3, nguyên tắc "editor không đụng chi phí"); ghi chú CLAUDE.md: `editor` cấp được lượt AI là tiêu tiền
thật, trần chi mỗi ngày giới hạn rủi ro; chủ dự án muốn cấp hạn mức riêng cho tài khoản test và cho `editor` để test phía người học. Bảng để
chủ dự án điền `admin` / `editor` / cả hai: cấp gói (Pro có hạn); cấp con số riêng không dính AI; cấp lượt AI; tự cấp cho chính mình; thu hồi;
xem lịch sử cấp; chỉnh con số của từng gói; bật/tắt công tắc AI; chỉnh trần tiền AI mỗi ngày.

**Chủ dự án, vòng 1 (18/10/2026):**
- Câu phụ của câu 4: Pro **giới hạn cao hơn**, không phải không giới hạn ("nếu không giới hạn thì xảy ra tình trạng tấn công thì mình sẽ là
  người thiệt").

| Việc | Chủ dự án |
|---|---|
| Cấp gói (ví dụ Pro 30 ngày) | `admin` và `editor`; **`editor` không cấp cho `admin`** ("admin có toàn quyền") |
| Cấp con số riêng không dính AI | Cả hai |
| Cấp lượt AI | `admin` |
| Tự cấp cho chính mình | `admin` |
| Thu hồi một lần cấp | Cả hai |
| Xem lịch sử cấp | Cả hai |
| Chỉnh con số của từng gói | `admin` |
| Bật/tắt công tắc AI | `admin` |
| Chỉnh trần tiền AI mỗi ngày | `admin` |

**Claude sau vòng 1:**
- Đồng ý Pro có giới hạn cao hơn; đồng ý mọi dòng về con số gói, công tắc, trần tiền chỉ `admin` (khớp `settings.manage` và `ai.settings` của
  D6); đồng ý `editor` không tự cấp cho mình.
- **Chỗ vướng:** gói Pro có AI, nên `editor` "cấp gói Pro" là gián tiếp cấp lượt AI, trong khi "cấp lượt AI" chỉ `admin`. Hỏi ở vòng 2.
- Để hỏi sau: `editor` cấp cho `editor` khác được không (hai `editor` cấp chéo cho nhau thì vòng qua luật "không tự cấp"); `editor` thu hồi
  một lần cấp trên tài khoản `admin` được không (theo cùng ý "editor không đụng tới admin").

**Vòng 2 — hỏi:** `editor` cấp gói Pro (có AI) thì xử lý thế nào. Phương án: (a) `editor` cấp được gói nhưng không kèm lượt AI (người nhận
có mọi thứ của Pro trừ AI) / (b) gói có AI chỉ `admin` cấp; `editor` chỉ cấp con số riêng không dính AI / (c) `editor` cấp được Pro có AI nhưng
có giới hạn (ví dụ tối đa số ngày mỗi lần, hoặc tổng lượt AI mỗi tháng từ mọi lần `editor` cấp) / (d) cách khác.

**Chủ dự án, vòng 2 (18/10/2026): (d)** — "cấp riêng AI thì không được, gói thì cứ cấp bình thường thôi bạn, dù mâu thuẫn, nhưng admin vẫn có
thể quản lý lịch sử cấp của editor, nếu có vấn đề gì thì vẫn có thể thu hồi, sự khác nhau là cấp lượt AI sẽ không cố định, không khi cấp gói
thì có". Tức là: `editor` cấp được gói (kể cả Pro, kèm số lượt AI cố định của gói); `editor` **không** cấp được một con số lượt AI tùy ý; `admin`
xem lịch sử cấp của `editor` và thu hồi khi cần.

**Claude sau đó:** đồng ý; số lượt AI của gói bị chặn bởi con số của gói, và trần tiền mỗi ngày giữ ví. Đề xuất thêm: lịch sử cấp lọc được theo
người cấp, để `admin` xem nhanh các lần cấp của từng `editor`; mọi lần cấp đều có lý do và hạn (ER10) — có cho `admin` cấp không thời hạn
không thì hỏi ở câu về cấp tay.

## Câu 6 — `editor` được cấp và thu hồi cho ai (đã chốt)

Bảng để chủ dự án điền có / không: `editor` cấp cho người học thường; cấp cho `editor` khác; thu hồi lần cấp trên tài khoản người học; thu hồi
trên tài khoản `editor` khác; thu hồi trên tài khoản `admin`. (Đã chốt: `editor` không cấp cho `admin`, không tự cấp cho mình.)

**Chủ dự án (18/10/2026):** lọc lịch sử theo người cấp: ok.

| `editor` được… | Chủ dự án |
|---|---|
| Cấp cho người học thường | Có |
| Cấp cho `editor` khác | Không — "bản thân editor cũng sẽ có quyền hạn riêng, nên mình nghĩ không cần phải cấp" |
| Thu hồi trên tài khoản người học | Có |
| Thu hồi trên tài khoản `editor` khác | Không |
| Thu hồi trên tài khoản `admin` | Không |

**Claude sau đó:** đồng ý. Gộp lại: `editor` chỉ cấp và thu hồi trên tài khoản **không có vai trò staff**; `admin` làm được mọi thứ, kể cả cho
chính mình. Edge case cho design: người học đã được `editor` cấp rồi sau đó thành staff → lần cấp vẫn giữ, nhưng `editor` không còn thu hồi
được. Câu "editor cũng sẽ có quyền hạn riêng" mở ra câu 7 (tài khoản staff dùng phía người học với gói nào).

## Câu 7 — tài khoản staff dùng phía người học với gói nào (đã chốt)

Phương án đưa ra: (a) staff tự động có quyền như Pro (hoặc một gói "staff" riêng, không hết hạn) ở phía người học, lượt AI như Pro / (b) staff
như mọi người dùng (Free); `admin` cấp gói hoặc con số khi cần test / (c) staff không giới hạn gì ở phía người học, kể cả AI / (d) cách khác.

**Chủ dự án (18/10/2026): (b)** — staff như mọi người dùng (Free); khi cần test thì `admin` cấp gói hoặc con số riêng.

**Claude sau đó:** đồng ý; một luật cho mọi tài khoản, mọi quyền thêm đều đi qua cấp tay nên có lịch sử; `admin` tự cấp cho mình khi cần test.

## Câu 8 — một lượt AI tính thế nào (đã chốt)

Bối cảnh đưa ra: K17 hoãn đơn vị trừ lượt; ER6 của spec (`ASSUMPTION` cũ, chưa chốt): một câu AI phục vụ thành công là một lượt, một lần AI
tra nghĩa trả kết quả hợp lệ là một lượt, tính ngay cả khi người học bỏ gợi ý; đã chốt: chấm đáp án bằng rule, không tốn lượt (SR4, landing);
không còn ngân hàng câu chung (D3 Bước 4). Bảng để chủ dự án điền "tính 1 lượt / không tính / khác": AI tạo một câu mới thành công; câu AI không
qua kiểm tra nên AI tạo lại lần 2 cho cùng một câu; AI lỗi hoặc quá thời gian, không có câu; làm lại một câu AI đã lưu; AI tra nghĩa trả kết quả
và người học dùng; AI tra nghĩa trả kết quả nhưng người học bỏ; AI dịch bổ sung một câu; câu AI bị báo lỗi và staff xác nhận câu sai.

**Research giới hạn gói Free xong (18/10/2026):** `docs/preparation/FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md`. Claude kiểm lại hai điểm cùng
ngày trên trang gốc: Vocabulary.com "You will be limited to 10 VocabTrainer™ questions per day" cho người không đăng ký; Mochi Cards ghi
"Unlimited cards and decks" cho cả Free và Pro. Dùng cho câu số nhóm và con số phiên luyện của Free (hỏi sau).

**Research trial xong (18/10/2026):** `docs/preparation/TRIAL_MODELS_RESEARCH_2026-10-18.md`. Claude kiểm lại trên trang gốc của Apple:
"Customers can redeem one introductory offer per subscription group" và "Their subscription begins immediately, but they won't be billed until the
offer duration ends". Trang trợ giúp Duolingo không đọc được bằng công cụ của Claude (trang dựng bằng JavaScript), nên mục Duolingo chỉ dựa vào
agent. Điểm cần đưa vào các câu sau: trial giữ thẻ (opt-out) ở web cần nhắc trước khi trừ tiền (Visa; Luật Bảo vệ quyền lợi người tiêu dùng 2023
Điều 42, đọc qua trang tra cứu bên thứ ba); Điều 42 khoản 3 (chấm dứt bất kỳ lúc nào, chỉ trả phần đã dùng) đụng tới câu hủy gói năm của K26,
cần tư vấn pháp lý; trên mobile, store tự quyết ai được trial. Agent ghi: một lần mở PDF của Mastercard làm trình duyệt hiện hộp thoại lưu file,
không lưu gì.

**Chủ dự án, vòng 1 (18/10/2026):**

| Trường hợp | Chủ dự án |
|---|---|
| AI tạo một câu mới thành công | Tính 1 lượt |
| AI lỗi hoặc quá thời gian, không có câu | Không tính |
| Làm lại một câu AI đã lưu | Không tính |
| AI tra nghĩa trả kết quả, người học dùng gợi ý | Tính |
| AI tra nghĩa trả kết quả, người học bỏ gợi ý | Tính |
| AI dịch bổ sung một câu | Tính |
| Câu AI bị báo lỗi, staff xác nhận câu sai | Trả lượt về cho người dùng |
| Câu AI không qua kiểm tra, AI tạo lại lần 2 | Hỏi "là sao" → Claude giải thích (vòng 2) |

**Claude sau vòng 1:** đồng ý cả bảng. Ghi chú cho design: dịch bổ sung giờ hiếm (không còn ngân hàng chung, câu AI sinh kèm bản dịch theo ngôn
ngữ của người học lúc tạo); xảy ra khi người học đổi tiếng mẹ đẻ rồi làm lại một câu đã lưu → làm lại không tính, nhưng phần dịch bổ sung tính 1
lượt. Trả lượt khi staff xác nhận câu sai: đề xuất cộng 1 lượt vào chu kỳ hiện tại của người đó (một dòng "hoàn lượt" có lý do trỏ về báo cáo),
kể cả khi lượt bị trừ ở chu kỳ trước; người đó không còn quyền AI thì không hoàn.

**Vòng 2 — giải thích và hỏi:** tạo lại lần 2 = câu AI viết ra bị luật kiểm tra loại (ví dụ không có đúng một chỗ trống, đáp án không phải dạng
của từ đang học, câu quá dài, thiếu bản dịch), hệ thống tự gọi AI thêm một lần; người học chỉ thấy một câu cuối cùng (hoặc "chưa tạo được"
nếu lần 2 cũng hỏng, khi đó không tính lượt theo vòng 1). Mỗi lần gọi bạn đều trả tiền. Phương án: (a) tính 1 lượt khi cuối cùng có câu, dù
AI phải gọi 1 hay 2 lần / (b) mỗi lần gọi AI tính 1 lượt (có câu sau 2 lần gọi thì tính 2) / (c) cách khác.

**Chủ dự án, vòng 2 (18/10/2026): (a)** — tính 1 lượt khi cuối cùng có câu, dù AI gọi 1 hay 2 lần: "rủi ro chấp nhận để đem lại trải nghiệm tốt
nhất cho người dùng".

**Claude sau đó:** đồng ý. Tiền của lần gọi thứ hai do chủ dự án chịu; được ghi ở sổ chi phí (Bước 6) để theo dõi tỉ lệ phải tạo lại, và nằm
dưới trần tiền mỗi ngày.

## Câu 9 — lượt AI: một kho chung hay mỗi tính năng một kho (đã chốt)

Bối cảnh đưa ra: các tính năng tốn lượt AI: bài AI (điền từ, "câu chứa từ rồi chọn", trắc nghiệm theo câu), AI tra nghĩa, dịch bổ sung; spec cũ
có hai mã quyền `ai.practice` và `ai.lookup` nhưng chưa nói hạn mức chung hay riêng; research: Grammarly một kho lượt AI mỗi tháng (100 so với
2.000), Mochi Cards tách lượt AI và lượt tra từ (20 so với 1.000). Phương án: (a) một kho chung cho mọi tính năng AI / (b) mỗi tính năng một kho
riêng / (c) kho chung nhưng mỗi tính năng có thêm trần riêng bên trong / (d) cách khác.

**Chủ dự án (18/10/2026): (b)** — mỗi tính năng một kho riêng.

**Claude sau đó:** đồng ý; người học thấy rõ hai con số (bài AI, tra nghĩa). Đề xuất: dịch bổ sung trừ vào kho **bài AI**, vì nó phục vụ một câu
luyện (làm lại câu đã lưu sau khi đổi tiếng mẹ đẻ).

## Câu 10 — lượt AI của Pro làm mới thế nào (đã chốt)

Bối cảnh đưa ra: tài liệu billing chủ dự án gửi (chu kỳ lượt neo theo một ngày cố định, gói năm vẫn làm mới mỗi tháng, ngày 31 thì lùi về ngày
cuối tháng); câu mở của K26 (gói năm làm mới theo tháng hay theo năm); SR13 (theo lịch thì ranh giới theo múi giờ người học). Phương án:
(a) mỗi tháng tính từ ngày bắt đầu gói, gói năm cũng làm mới mỗi tháng / (b) mỗi tháng theo lịch (ngày 1, giờ người học), gói năm làm mới mỗi
tháng; tháng đầu mua giữa tháng thì cấp đủ hoặc theo tỷ lệ / (c) gói tháng như (a), gói năm cấp một lần cho cả năm / (d) cách khác. Lượt thừa có
cộng dồn sang chu kỳ sau không: hỏi ở câu sau.

**Chủ dự án (18/10/2026): (a)** — mỗi tháng tính từ ngày bắt đầu gói; gói năm cũng làm mới mỗi tháng (trả lời luôn câu mở thứ nhất của K26).

**Claude sau đó (đề xuất chi tiết):** đồng ý. Mốc là **thời điểm** bắt đầu gói (UTC), không phải ngày theo giờ người học, nên đổi múi giờ không
làm lệch chu kỳ; ngày 29–31 thì tháng thiếu ngày lùi về ngày cuối tháng nhưng mốc không trôi (31/01 → 28/02 → 31/03); đổi tháng ↔ năm giữ
nguyên mốc; gói Pro do cấp tay thì mốc là lúc bắt đầu lần cấp; người học thấy thời điểm làm mới kế tiếp.

## Câu 11 — lượt AI chưa dùng hết có cộng dồn sang chu kỳ sau không (đã chốt)

Bối cảnh đưa ra: tài liệu billing chủ dự án gửi đặt lại "đã dùng" về 0 mỗi chu kỳ, không cộng dồn; giới hạn phiên luyện của Free tính theo
ngày, không cộng dồn. Phương án: (a) không cộng dồn, hết chu kỳ là hết / (b) cộng dồn có trần (ví dụ dồn tối đa một chu kỳ) / (c) cộng dồn
không giới hạn khi còn gói / (d) cách khác.

**Chủ dự án (18/10/2026): (a)** — "không cộng dồn, hết tháng thì reset lại về 0 nếu còn gia hạn, không còn gia hạn thì hủy gói".

**Claude sau đó:** đồng ý; hiểu "reset về 0" là **số đã dùng** về 0, tức người học có lại đủ lượt của gói ở chu kỳ mới. Gói năm làm mới mỗi
tháng trong năm đã trả mà không cần gia hạn; tới hết năm (hoặc hết tháng với gói tháng) mà không gia hạn thì gói kết thúc, về Free. Thanh toán
gia hạn bị lỗi (có thời gian chờ thử lại hay không) hỏi ở câu về các trường hợp thanh toán.

## Câu 12 — Trial: có giữ thẻ không (đã chốt)

Bối cảnh đưa ra: research trial (`TRIAL_MODELS_RESEARCH_2026-10-18.md`): trial giữ thẻ phổ biến (Duolingo Super, Speak, Quizlet, Grammarly,
mọi trial trên store), tỉ lệ lên trả phí cao hơn nhưng ít người bắt đầu hơn (Recurly 2022: 40,1% so với 25,5%); tự trừ tiền thì phải nhắc trước
(Visa ≥ 7 ngày; Luật Bảo vệ quyền lợi người tiêu dùng 2023 Điều 42: ≥ 7 ngày làm việc trước khi hết hạn); trên mobile store tự quyết ai được
trial; V1 chưa thu tiền nên chưa giữ thẻ được; landing hứa "Không cần nhập thẻ" (chủ dự án: sửa được); K7: trial tự bật, cần email đã xác minh,
14 ngày, một lần mỗi tài khoản. Phương án: (a) không cần thẻ, người học tự bật (làm được ngay ở V1) / (b) giữ thẻ, không hủy thì tự lên Pro
(chỉ khi có thanh toán thật) / (c) V1 không thẻ, khi có thanh toán thật thì chuyển sang giữ thẻ / (d) có cả hai cùng lúc (ví dụ web không thẻ,
mobile theo trial của store) / (e) cách khác.

**Chủ dự án (18/10/2026): (b)** — giữ thẻ, không hủy thì tự lên Pro; chỉ làm được khi có thanh toán thật. (Không chọn (c) "V1 không thẻ rồi
chuyển".)

**Claude sau đó:** đồng ý. Hệ quả ghi lại để chủ dự án sửa nếu không đúng ý:
- **Trước khi có thanh toán thật thì không có trial.** Người học muốn dùng AI chỉ có cách được staff cấp gói Pro (cấp tay), đúng như spec cũ cho
  pilot (ER10). V1 không có endpoint "tự bật trial không cần thẻ"; mục 2 của câu 2 đổi nghĩa: Trial là một trạng thái "đang dùng thử" của gói
  đăng ký, do nhà cung cấp thanh toán (Stripe/Paddle, Apple/Google) báo về qua cổng thanh toán; Bước 5 code phần này và test bằng nhà cung cấp giả.
- **Đổi K7** (trial tự kích hoạt, không cần thẻ); landing phải sửa "Dùng thử 14 ngày miễn phí", "Không cần nhập thẻ thanh toán".
- Đề xuất: bắt đầu trial (và mua Pro) cần email đã xác minh, giữ tinh thần K7.
- Phải nhắc trước khi trừ tiền (Visa ≥ 7 ngày; luật Việt Nam ≥ 7 ngày làm việc trước khi hết hạn, theo research); ai gửi nhắc (nhà cung cấp hay
  app) và một trial cho mỗi gì (tài khoản, thẻ, tài khoản store) hỏi ở câu sau.

## Câu 13 — trong trial được gì (đã chốt)

Bối cảnh đưa ra: research không thấy app nào cho trial ít lượt AI hơn bản trả phí (Speak, ELSA cho dùng đủ); Apple có trial 1 hoặc 2 tuần;
chủ dự án ghi "Bài AI: Pro" ở câu 4; Pro làm mới lượt mỗi tháng từ ngày bắt đầu gói (câu 10). Phương án: (a) trial như Pro đầy đủ, cùng số lượt
AI / (b) trial có lượt AI riêng, ít hơn Pro, dùng trong cả thời gian trial, không chuyển sang Pro / (c) trial chỉ có phần không AI của Pro, AI
mở khi đã trả tiền / (d) cách khác. Kèm: độ dài trial giữ 14 ngày (K7) hay đổi.

**Chủ dự án, vòng 1 (19/10/2026):** phân vân giữa (a) trial như Pro đầy đủ và cho ít lượt hơn; nhờ "đo chênh lệch chi phí nếu ít hơn khoảng
tầm 20-30% so với gói pro", "nếu không chênh lệch nhiều thì làm đầy đủ". Câu phụ (độ dài trial) chưa trả lời.

**Claude ước tính (19/10/2026):**
- Giá đọc hôm nay ở `platform.claude.com/docs/en/about-claude/pricing.md` (USD mỗi triệu token, vào / ra): Haiku 5.5 $0,10 / $0,50 (prompt ≤ 100K
  token); Sonnet 5.5 $2 / $10; Opus 5.5 $4 / $20. Tỷ giá 25.860,56 đ/USD (`open.er-api.com`, cập nhật 18/10/2026). Chưa chọn nhà cung cấp AI;
  chưa xem giá OpenAI, Google.
- `ASSUMPTION`: mỗi lượt khoảng 600 token vào và 500 token ra (200 token câu trả lời + khoảng 300 token suy nghĩ của model, vì Haiku 5.5 và
  Sonnet 5.5 bật suy nghĩ mặc định và tính như token ra); 10% số lượt phải gọi lại lần 2 (×1,1); Pro ví dụ 300 lượt bài AI + 100 lượt tra nghĩa
  mỗi tháng = 400 lượt (con số Pro chưa chốt); trial (a) được đủ 400 lượt trong 14 ngày.

| Model | Mỗi lượt | Một người dùng hết 400 lượt | Ít hơn 20% | Ít hơn 30% |
|---|---|---|---|---|
| Haiku 5.5 | ~9 đ | ~3.527 đ | ~2.822 đ (chênh ~705 đ) | ~2.469 đ (chênh ~1.058 đ) |
| Sonnet 5.5 | ~176 đ | ~70.548 đ | ~56.438 đ (chênh ~14.110 đ) | ~49.383 đ (chênh ~21.164 đ) |
| Opus 5.5 | ~353 đ | ~141.095 đ | ~112.876 đ (chênh ~28.219 đ) | ~98.767 đ (chênh ~42.329 đ) |

- Phần chênh chỉ xảy ra với người dùng **hết** số lượt bị giảm; người dùng ít hơn mức đó tốn như nhau ở cả hai cách. Model chọn ở Bước 6 làm chi
  phí đổi khoảng 20 lần (Haiku so với Sonnet), lớn hơn nhiều so với 20–30%.

**Claude sau ước tính:** đề xuất (a) trial đầy đủ; chênh lệch nhỏ với model rẻ, dưới giá một tháng Pro với model tầm trung; số lượt của trial là con
số admin chỉnh được nên hạ được sau mà không sửa code.

**Chủ dự án, vòng 2 (19/10/2026):** (a) — "trước mắt là vậy đi"; trial **7 ngày** (đổi 14 ngày của K7).

**Claude sau đó:** đồng ý. Ghi cho design:
- Số lượt AI của trial là cài đặt riêng, mặc định bằng của Pro, admin chỉnh được ("trước mắt").
- Đề xuất: lượt của trial không chuyển sang Pro; khi trial tự lên Pro (lần trừ tiền đầu), chu kỳ Pro bắt đầu từ lúc đó với đủ lượt, mốc là thời điểm đó.
- Rủi ro cần tư vấn pháp lý: luật Việt Nam (theo research) đòi báo ≥ 7 ngày làm việc trước khi hết hạn, dài hơn chính trial 7 ngày; nếu luật áp cho
  trial thì thông báo phải đi ngay lúc bắt đầu trial (điều khoản và ngày trừ tiền), cộng một lời nhắc trước ngày trừ tiền. Duolingo Super (trial 1
  tuần) nhắc ở ngày 5 (theo research).
- Landing đổi "14 ngày" thành 7 ngày khi sửa câu chữ gói.

## Câu 14 — số nhóm mỗi người: theo gói hay không (đã chốt)

Bối cảnh đưa ra: chủ dự án chưa rõ hành vi người dùng (câu 4); research giới hạn gói Free: Anki, Mochi Cards, Brainscape, RemNote, Knowt không giới
hạn số bộ thẻ ở Free; chỉ app có kho từ sẵn mới giới hạn số từ lưu (MochiVocab Free 30 từ); không có số liệu đo về số bộ thẻ một người tạo; hiện 100
nhóm/người; từ riêng và câu ngữ cảnh đã chọn "không giới hạn theo gói, giữ trần kỹ thuật cao". Phương án: (a) không giới hạn theo gói, chỉ trần kỹ
thuật chung, admin chỉnh / (b) Free có giới hạn, Pro cao hơn / (c) giữ một con số như nhau cho mọi gói / (d) cách khác.

**Chủ dự án (19/10/2026):** "không" — số nhóm không giới hạn theo gói.

**Claude sau đó:** đồng ý; giữ một trần kỹ thuật chung, admin chỉnh, như từ riêng và câu ngữ cảnh. Hệ quả: Free và Pro chỉ khác nhau ở **số phiên
luyện không AI mỗi ngày** và **AI** (bài AI, tra nghĩa); mọi thứ khác như nhau cho mọi gói. Hạ gói (Pro → Free) vì vậy không có chuyện "vượt giới
hạn nhóm hay từ"; chỉ còn số phiên mỗi ngày và quyền AI đổi theo.

## Câu 15 — các con số (vòng 1 đã trả lời)

Bảng đưa ra để chủ dự án điền, hoặc nhờ Claude đề xuất (mọi con số admin chỉnh được, theo câu 5): theo gói — phiên luyện không AI mỗi ngày (Free;
Pro và trial), lượt bài AI mỗi tháng (Pro và trial), lượt AI tra nghĩa mỗi tháng (Pro và trial); trần kỹ thuật chung — số nhóm (hiện 100), số từ riêng
(hiện 1.000), câu ngữ cảnh mỗi nghĩa (hiện 5), số từ mỗi nhóm (2.000, đã giữ), số câu tối đa mỗi phiên (20, cài đặt Bước 4); hệ thống — trần tiền AI
mỗi ngày, mức cảnh báo. Bối cảnh: Vocabulary.com Free 10 câu/ngày; Grammarly 100 so với 2.000 lượt AI/tháng; Mochi Cards 20 so với 1.000 lượt tra từ;
ước tính chi phí ở câu 13.

**Chủ dự án, vòng 1 (19/10/2026):**
- Trần tiền AI mỗi ngày: "cái này mình sẽ tìm cách quy đổi sang credit hoặc quota".
- Cảnh báo: "75%, hoặc không cần cảnh báo".
- Trần kỹ thuật chung: "giữ nguyên".
- Phiên luyện không AI mỗi ngày: "mình chưa rõ". Lượt bài AI và lượt tra nghĩa mỗi tháng: không điền.

**Claude sau vòng 1 (đề xuất; các ô chủ dự án "chưa rõ" hoặc bỏ trống là Claude đề xuất, ghi như vậy trong decision record):**

| Con số | Đề xuất (`ASSUMPTION`, admin chỉnh) | Vì sao |
|---|---|---|
| Phiên luyện không AI mỗi ngày — Free | 3 | 3 × 20 câu = 60 câu/ngày, đủ cho ôn hằng ngày, vẫn có lý do lên Pro; Vocabulary.com cho Free 10 câu/ngày |
| Phiên luyện không AI mỗi ngày — Pro, trial | 30 | Người học thật coi như không chạm; vẫn chặn script (ý "Pro giới hạn cao hơn, không để không giới hạn") |
| Lượt bài AI mỗi tháng — Pro, trial | 300 | Khoảng 10 câu AI mỗi ngày |
| Lượt AI tra nghĩa mỗi tháng — Pro, trial | 100 | Khoảng 3 từ mới mỗi ngày không có trong catalog |
| Trần AI toàn hệ thống mỗi ngày | **Đếm bằng lượt**, mặc định 1.000 lượt/ngày (tính cả lượt đang giữ) | Theo ý "quy đổi sang quota": Bước 5 làm trọn được, không cần giá tiền và sổ chi phí của Bước 6; lệch với tiền thật ở lần gọi lại (~10%) và khi đổi model. Bước 6 có sổ chi phí thì xét thêm trần bằng tiền |
| Cảnh báo | 75%, email cho mọi `admin`, tối đa một lần mỗi ngày | Không có cảnh báo thì admin chỉ biết khi AI đã dừng |
| Số từ riêng | 10.000 (thay 1.000) | Câu 4 chủ dự án muốn "không giới hạn"; 1.000 từ thì người học thêm 5 từ/ngày chạm sau khoảng 200 ngày |
| Câu ngữ cảnh mỗi nghĩa | 20 (thay 5) | Câu 4 chủ dự án hỏi "không giới hạn được không" |
| Số nhóm, số từ mỗi nhóm, số câu mỗi phiên | Giữ 100, 2.000, 20 | Theo "giữ nguyên" |

Chi phí tối đa một người Pro dùng hết 400 lượt mỗi tháng (giá và giả định ở câu 13): khoảng 3.500 đ với Haiku 5.5, khoảng 70.500 đ với Sonnet 5.5; phải xét
lại khi chọn model (Bước 6) và giá Pro. Hỏi chủ dự án duyệt cả bộ.

**Chủ dự án, vòng 2 (19/10/2026):**
- Hai con số lượt AI (300 bài AI, 100 tra nghĩa mỗi tháng): "research lại chỗ này giúp mình xem" → agent chạy nền,
  `docs/preparation/AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md`.
- **Yêu cầu mới — quảng cáo:** app có tính thương mại hóa nên cần ads (nếu có thể) để duy trì kinh phí; Free có ads, trial và Pro không có ads; tần
  suất không nên quá nhiều; nhờ research best practice → agent chạy nền, `docs/preparation/ADS_INTEGRATION_RESEARCH_2026-10-19.md`.
- Các con số còn lại của bảng đề xuất: chưa trả lời → hỏi lại.

**Claude ghi:** "không có ads" là thêm một quyền theo gói (trial, Pro có; Free không). Bước 5 chỉ làm API, nên phần của Bước 5 có lẽ chỉ là trả cờ
"hiện quảng cáo hay không" cho app; gắn ads thật vào web và mobile thuộc đợt giao diện. Hỏi sau khi có research.

**Chủ dự án hỏi (19/10/2026):** các con số này tùy chỉnh được trong giao diện admin đúng không.

**Claude trả lời (sự thật, không phải quyết định):** đều là cài đặt admin chỉnh được (chỉ `admin`, theo câu 5), có khoảng cho phép, version và lịch sử
như các cài đặt của Bước 3–4. Nhưng Bước 5 chỉ làm API (câu 2, mục 9): chỉnh được qua API ngay khi Bước 5 xong; **màn hình** trong `apps/admin` làm
ở đợt giao diện (cùng trang cài đặt chưa có, mục menu chờ `/ai/settings`). Hỏi lại việc duyệt bộ con số.

**Chủ dự án (19/10/2026):** "ok" — duyệt bộ con số làm giá trị mặc định ban đầu (trừ hai con số lượt AI, chờ research): Free 3 phiên/ngày, Pro và
trial 30 phiên/ngày; trần AI toàn hệ thống đếm bằng lượt, 1.000 lượt/ngày (tính cả lượt đang giữ); cảnh báo 75%, email cho mọi `admin`, tối đa một lần
mỗi ngày; 10.000 từ riêng; 20 câu ngữ cảnh mỗi nghĩa; giữ 100 nhóm, 2.000 từ mỗi nhóm, 20 câu mỗi phiên. Mọi số `admin` chỉnh qua API; màn hình ở đợt
giao diện.

## Câu 16 — một người có nhiều nguồn quyền cùng lúc thì tính thế nào (đã chốt)

Bối cảnh đưa ra: nguồn quyền: Free (mặc định), trial và Pro trả tiền (nhà cung cấp báo về), cấp tay "một gói", cấp tay "con số riêng"; spec cũ EE5
(`ASSUMPTION`): trial và cấp tay cộng hạn mức. Ví dụ: người đang trả tiền Pro được cấp thêm "Pro 30 ngày"; người Pro (300 lượt bài AI) được admin cấp
"500 lượt bài AI"; admin muốn hạ hạn mức một người lạm dụng. Phương án: (a) lấy mức cao nhất trong các nguồn đang hiệu lực / (b) cộng dồn (thời gian
Pro nối tiếp, lượt riêng cộng thêm vào lượt của gói) / (c) con số riêng ghi đè, kể cả thấp hơn gói / (d) cách khác.

**Chủ dự án (19/10/2026):** "mình chưa hiểu câu này lắm" → Claude viết lại bằng ví dụ Lan (Pro 300 lượt bài AI, admin cấp "500 lượt"; Pro đã trả tới
30/11, ngày 15/11 được cấp thêm "Pro 30 ngày"): (a) lấy số lớn hơn → 500, Pro tới 15/12 / (b) cộng → 800, Pro tới 30/12 / (c) số staff cấp thay hẳn số
của gói → 500 (cấp 50 thì chỉ còn 50).

**Chủ dự án, vòng 2:** "cái này nên nghiêng về điều chỉnh số lượng quota hoặc credit trong tài khoản, không cần phải làm trước năng cộng hoặc trừ đi bao
nhiêu".

**Claude hiểu và đề xuất (chờ chủ dự án xác nhận):**
- "Con số riêng" = staff **đặt thẳng** con số cho tài khoản (ví dụ "lượt bài AI: 500 mỗi tháng, tới 31/12"), thay cho số của gói trong thời gian đó, cao
  hơn hay thấp hơn đều được (gần (c)); hết hạn thì về số của gói. Không có thao tác "+500" hay "−50".
- Đặt thấp hơn số đã dùng trong tháng → còn 0, không âm (ER9).
- Hoàn lượt khi staff xác nhận câu AI sai (câu 8) làm bằng cách **giảm số đã dùng** đi 1, không phải "cộng lượt", nên vẫn không cần thao tác cộng/trừ.
- Thời hạn gói: là Pro khi còn ít nhất một nguồn đang hiệu lực; không nối tiếp (gần (a)).

**Chủ dự án, vòng 3 (19/10/2026):** "ok" cho ba ý đầu (đặt thẳng con số; thấp hơn số đã dùng thì còn 0; hoàn lượt bằng giảm số đã dùng). Thời hạn: "reset
qua mốc mới, 15/12".

**Claude hỏi lại (vòng 4):** "reset qua mốc mới" là (i) chỉ ngày hết hạn Pro chuyển sang 15/12, chu kỳ lượt AI giữ như cũ, hay (ii) chu kỳ lượt AI cũng
bắt đầu lại từ 15/11 (số đã dùng về 0, mốc mới là ngày 15).

**Research hạn mức AI xong (19/10/2026):** `docs/preparation/AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md`. Claude kiểm lại trên trang gốc cùng ngày:
Grammarly Free 100, Premium 1.000, Pro/Business 2.000 prompt mỗi tháng, làm mới theo ngày tài khoản bắt đầu có AI; RemNote Free 50, Pro 500 lượt chạy AI
mỗi tháng, "Pro with AI" gần như không giới hạn. Ghi chú: đơn giá ~9 đ / ~176 đ mỗi lượt ở câu 13 đã gồm hệ số gọi lại 1,1 (tỷ giá 25.860,56), nên
agent suy ra tỷ giá ~28.400 là do hệ số này. Agent báo: mở PDF thư cổ đông Duolingo làm trình duyệt hiện hộp thoại lưu file (không lưu); bấm "Reject
non-essential" ở banner cookie trang giá ChatGPT.

**Claude đề xuất sau research:** giữ 300 bài AI và 100 tra nghĩa mỗi tháng làm mặc định ban đầu (admin chỉnh): nằm giữa Grammarly Free và RemNote Pro, ngang
mức "vài lượt mỗi ngày" của Speak (3 bài AI/ngày) và Readlang Free (10 lượt/ngày); xét lại khi chọn model (Bước 6) và giá Pro. Hỏi sau câu 16.

**Chủ dự án (19/10/2026):** gửi ảnh trang gói của Corodomo, Quizlet (bản giá Việt Nam) và một app luyện từ tiếng Việt (gói Free/Premium, mã giới thiệu) để
"chỉ tham khảo và phân tích, không chốt quyết định"; "còn về quyết định hiện tại thì tạm thời mình chốt theo hướng bạn đề xuất".

**Ghi lại theo câu đó (tạm chốt theo đề xuất của Claude):**
- Hai con số lượt AI: **300 bài AI và 100 tra nghĩa mỗi tháng** cho Pro và trial (mặc định ban đầu, admin chỉnh).
- Câu 16 vòng 4 ("reset qua mốc mới"): Claude chưa đưa đề xuất trước câu này; theo "chốt theo hướng bạn đề xuất", Claude đề xuất **(i) chỉ dời ngày hết hạn**
  (Pro tới 15/12), chu kỳ lượt AI giữ như cũ; muốn người đó có lại đủ lượt thì staff đặt con số riêng. Decision record ghi đây là đề xuất của Claude, chủ
  dự án tạm chốt; chủ dự án sửa được.

**Phân tích ba trang gói (chỉ tham khảo):**
- Giá: Corodomo Plus 116.000 đ/tháng (khuyến mãi lần đầu, giá gốc 180.000), Pro 263.000 đ; Quizlet Plus 2,99 USD/tháng trả theo năm (35,99 USD/năm), Plus
  Unlimited 3,75 USD; app luyện từ Premium 189.000 đ / 3 tháng, 319.000 đ / 6 tháng, 449.000 đ / 12 tháng (khoảng 37.000–63.000 đ/tháng).
- Đơn vị hạn mức AI: Corodomo tính bằng **giờ** AI mỗi tháng (30 / 100 giờ) và có link "chi tiết cách trừ hạn mức AI"; app luyện từ tính **lượt mỗi ngày**
  (Free 2, Premium 100); Quizlet giới hạn **lượt mỗi tháng** cho cả tính năng không AI (Plus: 3 bài kiểm tra thử, 20 câu chế độ Học mỗi tháng).
- Free có một ít AI để nếm thử (app luyện từ: 2 lần/ngày), khác Wordmet (Free không AI, F31; nếm thử qua trial giữ thẻ).
- "Không quảng cáo" là quyền lợi gói trả phí ở cả Corodomo và Quizlet, khớp hướng ads của chủ dự án.
- Gói trả trước theo 3/6/12 tháng (app luyện từ) hợp với cổng Việt Nam chỉ thu một lần; cổng thanh toán của Bước 5 đã có kiểu "app tự gia hạn" cho trường
  hợp này. Wordmet hiện chốt tháng và năm (K26).
- Từ riêng: app luyện từ Free 500, Premium 5.000; Wordmet chốt 10.000 cho mọi gói.
- Khuyến mãi lần đầu, đồng hồ đếm ngược, mã giới thiệu (5%), giới hạn số thiết bị (Corodomo 4): Wordmet chưa có quyết định nào; mã giảm giá, mã giới thiệu
  cần thêm phần billing, ngoài phạm vi Bước 5 nếu chủ dự án không thêm.
- Chi phí: với giá thị trường khoảng 40.000–120.000 đ/tháng, một người Pro dùng hết 400 lượt tốn ~3.500 đ với model rẻ (Haiku) nhưng ~70.500 đ với model tầm
  trung (Sonnet), có thể ngang giá gói → điểm cần nhớ khi chọn model ở Bước 6.

## Câu 17 — cấp tay: hạn dùng (đã chốt)

Bối cảnh đưa ra: spec cũ ER10 (mọi lần cấp có lý do và hạn, ghi sổ, thu hồi được); câu 5–7 (editor cấp gói và con số không dính AI cho người học; admin cấp
mọi thứ, kể cả cho mình; staff dùng như Free, admin cấp khi cần test). Phương án: (a) mọi lần cấp bắt buộc có ngày hết hạn, ai cấp cũng vậy / (b) admin được
cấp không thời hạn, editor bắt buộc có hạn / (c) như (b) và thêm hạn tối đa cho editor (ví dụ 90 ngày) / (d) cách khác.

**Research quảng cáo xong (19/10/2026):** `docs/preparation/ADS_INTEGRATION_RESEARCH_2026-10-19.md`. Claude kiểm lại cùng ngày: `google_mobile_ads` bản mới
nhất 9.1.0, nhà phát hành `google.dev` (pub.dev); ngưỡng trả tiền AdSense 100 USD với tài khoản USD (support.google.com). Điểm chính cho các câu sau: AdMob
cho mobile, AdSense cho web (trang học nằm sau đăng nhập, AdSense không có hướng dẫn chính thức cho đổi trang không tải lại của Next.js); doanh thu nhỏ (eCPM
interstitial Việt Nam 0,72–1,51 USD năm 2024, nguồn thứ cấp); Nghị định 342/2025 (đọc qua trang thứ ba): quảng cáo che nội dung phải tắt được bằng một chạm,
video chờ tối đa 5 giây; **tuổi tối thiểu chặn các quyết định khác** (trẻ vị thành niên → Google Families, Apple Kids gần như cấm quảng cáo bên thứ ba);
Luật Bảo vệ dữ liệu cá nhân 2025 Điều 28: cần đồng ý trước khi theo dõi hành vi để quảng cáo. Tuổi tối thiểu chưa có trong DB (DB3 của
`docs/superpowers/reviews/2026-10-17-db-schema-business-review.md`).

**Chủ dự án (19/10/2026): (a)** — mọi lần cấp đều có ngày hết hạn, ai cấp cũng vậy.

**Claude sau đó:** đồng ý; khớp ER10. Ghi cho design: tài khoản test cần dùng lâu thì `admin` cấp lại trước khi hết hạn; lịch sử cấp lọc được theo "sắp hết hạn"
để thấy trước (đề xuất).

## Câu 18 — Bước 5 làm gì cho quảng cáo (đã chốt)

Bối cảnh đưa ra: research quảng cáo ở trên; Bước 5 chỉ làm API (câu 2); giao diện web và Flutter chưa có. Phương án: (a) chỉ thêm quyền "không quảng cáo"
(Free hiện, trial và Pro không) và trả cờ trong API xem gói; gắn quảng cáo thật ở đợt giao diện / (b) như (a) và lưu cấu hình tần suất ở server (admin chỉnh)
/ (c) như (b) và có quảng cáo "xem để nhận thưởng" (ví dụ xem một quảng cáo để thêm một phiên luyện), server kiểm xác nhận của AdMob / (d) Bước 5 chưa làm
gì cho quảng cáo. Ghi kèm: tuổi tối thiểu (DB3) phải chốt trước khi bật quảng cáo thật.

**Chủ dự án (19/10/2026): (b)** — quyền "không quảng cáo" theo gói, trả cờ trong API xem gói, và cấu hình tần suất lưu ở server, admin chỉnh.

**Claude sau đó (đề xuất chi tiết):** đồng ý. Cài đặt: công tắc quảng cáo toàn hệ thống (mặc định **tắt** cho tới khi chốt tuổi tối thiểu và có bước hỏi đồng ý);
số quảng cáo toàn màn hình tối đa mỗi ngày (mặc định 3, `ASSUMPTION`); khoảng cách tối thiểu giữa hai lần (mặc định 10 phút, `ASSUMPTION`); quảng cáo chỉ hiện
ở chỗ nghỉ (hết một phiên luyện hoặc một lượt flashcard), không bao giờ giữa câu hỏi. Server không thấy quảng cáo đã hiện bao nhiêu lần, nên **app tự đếm** theo
cấu hình server trả về; mức rủi ro thấp vì tần suất bảo vệ trải nghiệm người học, không phải tiền. Không làm quảng cáo "xem để nhận thưởng".

## Câu 19 — trial: ai gửi lời nhắc, mỗi người một trial tính theo gì (đã chốt)

Bối cảnh đưa ra: research trial (luật Việt Nam ≥ 7 ngày làm việc trước khi hết hạn; Visa nhắc trước lần trừ đầu; Duolingo trial 1 tuần nhắc ngày 5; Apple một
introductory offer mỗi nhóm gói cho mỗi Apple ID, store tự quyết; trên web app tự quyết); Bước 3 đã có hạ tầng gửi email. Bảng để điền: lời nhắc — (a) app tự gửi
email (lúc bắt đầu trial: điều khoản và ngày trừ tiền; và trước ngày trừ tiền) / (b) để nhà cung cấp hoặc store gửi / (c) cả hai; mỗi người một trial — (a) theo
tài khoản / (b) theo thẻ (web) / (c) cả tài khoản và thẻ; trên mobile store tự quyết.

**Chủ dự án (19/10/2026):** lời nhắc — **(c) cả hai, ưu tiên (a)** (app tự gửi email); mỗi người một trial — **(c) theo cả tài khoản lẫn thẻ**.

**Claude sau đó (đề xuất chi tiết):** đồng ý.
- App luôn tự gửi hai email: lúc bắt đầu trial (điều khoản, ngày sẽ trừ tiền, cách hủy) và **2 ngày trước** ngày trừ tiền (ngày 5 của trial 7 ngày, như Duolingo;
  `ASSUMPTION`, admin chỉnh); email của nhà cung cấp hoặc store (nếu có) là thêm. Không đáp ứng được "7 ngày làm việc" trong một trial 7 ngày → email lúc bắt
  đầu là phần báo trước; cần tư vấn pháp lý.
- Kiểm "đã dùng trial" theo thẻ cần nhà cung cấp trả một mã nhận diện thẻ (không phải số thẻ); bên nào không có thì chỉ kiểm theo tài khoản (`ASSUMPTION`, chưa
  kiểm từng nhà cung cấp). Trên mobile store tự quyết.
- Rủi ro mở cho Bước 8 (xóa tài khoản): xóa tài khoản rồi đăng ký lại để lấy trial mới; giữ lại mã nhận diện thẻ sau khi xóa thì chặn được nhưng đó vẫn là dữ liệu
  liên kết được với người dùng, đụng SR11 → ghi vào mục rủi ro của design, chưa hỏi.

## Câu 20 — gia hạn bị lỗi (đang hỏi)

Bối cảnh đưa ra: research thanh toán (Google bật sẵn grace period và account hold; Stripe tự thử thu lại, tối đa 8 lần cấu hình được; Apple báo
`DID_FAIL_TO_RENEW` rồi `GRACE_PERIOD_EXPIRED`; cổng Việt Nam thu một lần nên "gia hạn" là một lần mua mới hoặc lệnh trừ tiền app tự tạo). Phương án: (a) mất Pro
ngay khi gia hạn lỗi / (b) giữ Pro thêm một số ngày (ví dụ 3–7) trong lúc nhà cung cấp thử thu lại, rồi về Free / (c) theo cấu hình của từng nhà cung cấp hoặc store /
(d) cách khác.

**Chủ dự án (19/10/2026):** "mình chưa thử và cũng chưa bao giờ kiểm chứng, thử research cho mình phần này xem sao" → agent chạy nền,
`docs/preparation/SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md` (gia hạn lỗi, hủy và hoàn tiền kèm luật Việt Nam Điều 42, hoàn tiền/chargeback do store,
đổi tháng ↔ năm, đổi giá, mua lại, trường hợp biên của trial). Câu 20 và các câu billing kế tiếp chờ research.

## Câu 21 — "Xong khi" và ai implement (đã chốt)

Bối cảnh đưa ra: Bước 4 D28 ("xong mọi task của plan và test thành công": CI xanh trên PR và script chạy qua API thật trên DB mới) và D29 (các phiên khác
implement, một phiên điều phối). Bước 5 có phần không chạy thật được ở V1 (nhà cung cấp thanh toán, AI) nên script chỉ dùng được nhà cung cấp giả và bên gọi AI
giả. Bảng để điền: "Xong khi" — (a) như Bước 4 / (b) như (a) và thêm chạy tay vài kịch bản (trial → Pro, cấp tay, hết lượt) / (c) cách khác; ai implement —
(a) như Bước 4 / (b) Codex implement, Claude review và chạy test / (c) chính phiên brainstorm này / (d) cách khác.

**Chủ dự án (19/10/2026):** "Xong khi" — **(a) như Bước 4**; ai implement — **(a) như Bước 4**.

**Claude sau đó:** đồng ý. "Xong khi": xong mọi task của plan; CI xanh trên mọi PR; `pnpm smoke:buoc-5` chạy qua API thật trên DB mới, dùng nhà cung cấp thanh toán giả
và bên gọi AI giả; task cuối ghi as-built vào `docs/deliveries/buoc-5.md`. Implement: các phiên khác, một phiên điều phối; plan có mục brief cho phiên điều phối.

**Kiểm 19/10/2026 (sau khi nhánh docs fast-forward lên `origin/dev` @ `9deb8d4`):** Bước 4 đã xong (as-built `docs/deliveries/buoc-4.md`, PR #47–#58). D38 của
Bước 4 **bỏ e2e backend**; "Xong khi" của Bước 4 là CI (lint, typecheck, build, unit, kiểm migration khớp schema) + smoke. Vì vậy "như Bước 4" ở câu 21 nghĩa
là không có e2e backend; các ca chạy đua (hai tab giành lượt cuối) phải được kiểm trong `smoke:buoc-5` bằng request song song. Practice gọi
`entitlements.check(userId, 'practice.basic')` ở `sessions.service.ts` (`assertEntitled`), từ chối bằng 403 `entitlement-required`. Ba giới hạn dùng ở:
`learning/groups/groups.service.ts` (`GROUPS_MAX`), `learning/items/items.service.ts` (`GROUP_ITEMS_MAX`), `content/private/private-words.service.ts`
(`PRIVATE_WORDS_MAX`), `content/sentences/sentences.service.ts` (`SENTENCES_PER_SENSE_MAX`).

**Phần 1 của design (kiến trúc) — trình 19/10/2026, chờ duyệt:** các khối (tính gói hiện tại, sổ lượt, trần AI cả hệ thống và công tắc, cổng thanh toán với
bộ nối giả, email nhắc trial, API); sửa nhỏ ở Practice (báo "phiên đã tính" khi câu đầu có kết quả; khác lời hứa D25 "không sửa Practice"); ba giới hạn
nhóm, từ riêng, câu ngữ cảnh chuyển từ hằng số sang Settings (không qua Entitlements vì như nhau mọi gói). Cách dựng sổ lượt (đề xuất kỹ thuật): (A) đếm dòng
trong sổ mỗi lần kiểm, khóa theo (người, kho) bằng `pg_advisory_xact_lock` như Content / (B) bộ đếm theo chu kỳ + sổ để tra / (C) Redis. Claude đề xuất (A).

**Research vòng đời gói xong (19/10/2026):** `docs/preparation/SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md`. Claude kiểm lại cùng ngày: Apple cho chọn billing
grace period 3, 16 hoặc 28 ngày, áp cho "All Renewals" (kể cả trial chuyển sang trả phí) hoặc "Only Paid to Paid Renewals"; Stripe Smart Retries mặc định khuyên
"8 tries within 2 weeks", hết lượt thử thì hủy, `unpaid`, để `past_due` hoặc tạm dừng tùy cấu hình. Điểm chính: gia hạn lỗi có hai giai đoạn (vẫn dùng Pro, rồi
khóa nhưng chưa hủy); trên mobile store quyết phần lớn; web qua Paddle/Stripe app tự chọn; cổng Việt Nam app tự làm hết. Luật 19/2023/QH15 Điều 42 (đọc qua
caselaw.vn): chấm dứt dịch vụ liên tục bất kỳ lúc nào, chỉ trả phần đã dùng, "trừ trường hợp có thỏa thuận khác" → hai câu cần luật sư (gói năm có phải hoàn
phần chưa dùng; 7 ngày làm việc so với trial 7 ngày). Hoàn tiền/chargeback từ bên ngoài có thể một phần và có thể bị đảo ngược. Câu 20 hỏi lại sau khi duyệt
phần 1.

**Chủ dự án (19/10/2026), về cách dựng sổ lượt:** "mô phỏng mình xem" → Claude dựng mô phỏng bấm được trong chat (Lan còn 1 lượt; hai tab bấm cùng lúc; AI trả
kết quả / AI lỗi / server sập rồi qua 2 phút; sự cố riêng: (B) một đoạn code hoàn lượt chỉ sửa sổ mà quên bộ đếm → hai nơi lệch, (C) Redis mất dữ liệu → bộ
đếm về 0, Lan có lại 300 lượt). Cả ba cách xử lý đúng hai tab giành lượt cuối; khác nhau ở server sập (A tự đúng ngay, B thiếu lượt tới khi job dọn chạy, C
cần thời hạn khóa trong Redis) và ở sự cố riêng.

**Chủ dự án (19/10/2026):** "ok" — **duyệt phần 1** của design và cách (A) cho sổ lượt.

## Câu 20 (hỏi lại theo research) — gia hạn lỗi (đã chốt)

Bối cảnh đưa ra: trên mobile, Apple và Google tự quyết thời gian chờ và lúc khóa, app chỉ làm theo sự kiện; trên web qua Paddle hoặc Stripe thì app tự chọn
(Paddle thử thu tới 30 ngày và khuyên vẫn cho dùng đủ khi `past_due`; Stripe mặc định 8 lần trong 2 tuần); qua cổng Việt Nam thì app tự làm hết. Bảng để điền:
khi app được tự chọn — (a) khóa Pro ngay khi gia hạn lỗi / (b) giữ Pro thêm N ngày rồi khóa (N bao nhiêu) / (c) giữ Pro suốt thời gian nhà cung cấp còn thử thu;
lần trừ tiền đầu sau trial bị lỗi — (a) áp cùng luật / (b) khóa ngay, không có thời gian chờ.

**Chủ dự án hỏi:** "khóa ở đây là làm gì" → Claude giải thích: tạm coi như Free (không AI, 3 phiên/ngày, quảng cáo hiện lại nếu đang bật) nhưng gói chưa hủy, dữ
liệu giữ nguyên, câu AI đã tạo vẫn nộp được; trả được tiền là có Pro lại ngay; khác "hủy" (phải mua lại).

**Chủ dự án (19/10/2026):** gia hạn lỗi — **(b) giữ Pro thêm N ngày rồi khóa** (N chưa nói); lần trừ tiền đầu sau trial lỗi — **(a) áp cùng luật**.

**Claude sau đó (đề xuất):**
- N = **7 ngày** (`ASSUMPTION`, admin chỉnh, khoảng 0–16). Sau N ngày mà nhà cung cấp còn thử thu thì khóa; nhà cung cấp bỏ cuộc thì gói kết thúc, về Free.
- Trong 7 ngày chờ, chu kỳ lượt mới vẫn mở như đã trả tiền (đơn giản cho người học); rủi ro: người không bao giờ trả được dùng tối đa 7 ngày và tối đa một chu kỳ
  lượt; tính cả trial thì thẻ hết tiền được tối đa 14 ngày Pro, bị chặn bởi "một trial mỗi tài khoản và thẻ".
- Trên mobile làm theo sự kiện của store; Apple chỉ cho 3, 16 hoặc 28 ngày (không có 7) → khi lên store chọn số gần nhất, ghi ở mục việc còn mở.

## Câu 22 — người dùng hủy gói: dùng tới đâu, có hoàn tiền không (đã chốt)

Bối cảnh đưa ra: Apple, Google, Paddle mặc định hủy là tắt tự gia hạn, dùng tới hết kỳ đã trả, store tự quyết hoàn tiền trên mobile; Luật 19/2023/QH15 Điều 42
(qua caselaw.vn): chấm dứt bất kỳ lúc nào, chỉ trả phần đã dùng, "trừ trường hợp có thỏa thuận khác" → cần luật sư cho gói năm. Phương án: (a) không hoàn tiền,
dùng tới hết kỳ đã trả, ghi rõ trong điều khoản / (b) gói tháng như (a); gói năm hủy giữa chừng thì hoàn phần các tháng chưa dùng / (c) chưa chốt, chờ luật sư;
design làm được cả (a) và (b).

**Chủ dự án (19/10/2026):** "ok" với đề xuất N = 7 ngày (admin chỉnh 0–16), mở chu kỳ lượt mới trong thời gian chờ, mobile theo store. Câu 22: **(a)** không hoàn
tiền, dùng tới hết kỳ đã trả, ghi rõ trong điều khoản.

**Claude sau đó:** đồng ý. Ghi cho design: hoàn tiền hay chargeback **do store, nhà cung cấp hoặc ngân hàng** khởi xướng vẫn có thể xảy ra (store tự quyết trên
mobile) → nhận sự kiện hoàn tiền thì bỏ Pro của kỳ đó ngay; sự kiện "hủy hoàn tiền" (Apple `REFUND_REVERSED`, Paddle `chargeback_reverse`) thì trả lại Pro. Rủi ro
pháp lý của (a) với Điều 42 ("trừ trường hợp có thỏa thuận khác") ghi ở mục việc còn mở: cần luật sư trước khi bán gói năm.

## Câu 23 — đổi gói tháng ↔ năm (đã chốt)

Bối cảnh đưa ra: Apple: thứ hạng gói trong nhóm quyết định đổi ngay hay đợi kỳ sau; Google: "Charge immediately" hoặc "Charge at next billing date"; Paddle có 5
chế độ tính tiền chênh; cổng Việt Nam app tự làm; chu kỳ lượt giữ nguyên mốc khi đổi (câu 10). Phương án: (a) tháng → năm đổi ngay, nhà cung cấp tính tiền chênh;
năm → tháng đổi khi hết năm / (b) mọi lần đổi có hiệu lực khi hết kỳ hiện tại / (c) mọi lần đổi có hiệu lực ngay / (d) cách khác.

**Chủ dự án (19/10/2026):** chọn **(a)**, rồi nhờ research thêm chiều năm → tháng ("tháng sang năm thì mình biết nó sẽ prorate tháng hiện tại và bù phần thiếu cho năm").

**Claude trả lời (từ `SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md` mục 5 và tra thêm 19/10/2026):**
- Phổ biến nhất là **đợi hết năm**: Apple (hạ cấp hoặc đổi khác thời hạn có hiệu lực ở kỳ gia hạn sau); Google khuyên `DEFERRED` cho hạ cấp; Stripe dùng subscription
  schedule; các trang trợ giúp DeepLearning.AI, Piano Adventures, The Land App (cho hủy lần đổi đang chờ) cũng vậy (đọc qua kết quả tìm kiếm, nhãn Thứ cấp).
- Cách thứ hai: **không cho đổi**, người dùng tắt tự gia hạn rồi mua gói tháng khi năm hết (Higgsfield, Thứ cấp).
- Cách thứ ba: **đổi ngay và tính theo tỷ lệ** (CallHippo; Checkout Page hoàn tiền nếu xin trong 7 ngày đầu; Stripe hạ cấp ngay sinh tín dụng) (Thứ cấp).
- Paddle (đọc lại trang chính thức 19/10): đổi tần suất chỉ cho `prorated_immediately`, `full_immediately`, `do_not_bill`; trang không nói lên lịch đổi ở kỳ sau.
  Suy luận (chưa kiểm): `do_not_bill` đổi giá ngay mà không thu tiền, lần thu kế (cuối năm) theo giá tháng → gần với "đợi hết năm".
- Cổng Việt Nam: không có gói tự gia hạn, người dùng mua gói tháng khi năm hết.

**Claude đề xuất (chờ chủ dự án):** giữ (a); năm → tháng ghi là "đổi đang chờ", có hiệu lực khi hết năm, người dùng hủy được lần đổi đang chờ; trong lúc chờ không đổi gì
(vẫn Pro, chu kỳ lượt giữ mốc cũ).

**Chủ dự án (19/10/2026):** "ok" — (a) tháng → năm đổi ngay (nhà cung cấp tính tiền chênh); năm → tháng là "đổi đang chờ", có hiệu lực khi hết năm, người dùng hủy được
lần đổi đang chờ; trong lúc chờ không đổi gì (vẫn Pro, chu kỳ lượt giữ mốc cũ).

**Hết câu hỏi sản phẩm (19/10/2026).** Chuyển sang trình design từng phần (phần 1 đã duyệt). Phần 2: dữ liệu và luật tính.

**Phần 2 (dữ liệu và luật tính) — trình 19/10/2026, chủ dự án "ok":** 5 loại dữ liệu (lần cấp tay, gói đăng ký, hộp sự kiện thanh toán, lịch sử trial, sổ lượt); luật
tính gói và con số; đề xuất duyệt cùng: nhiều lần đặt con số riêng cho cùng kho → lần mới nhất thắng; chu kỳ AI theo nguồn Pro bắt đầu sớm nhất còn hiệu lực, trial lên
Pro thì chu kỳ bắt đầu lại từ lần trừ tiền đầu; hoàn lượt trừ vào số đã dùng của chu kỳ hiện tại, không xuống dưới 0; trần AI theo ngày giờ Việt Nam, khóa chung cho mọi
lần giữ lượt AI; cảnh báo 75% mỗi ngày một lần; dùng lại `settings.manage`, bỏ `ai.settings` của D6; thêm `entitlements.grant` (admin, editor); email trial, email sắp
hết hạn, email cảnh báo trần không bị hạn mức email nhắc học chặn.

**Phần 3 (API, luồng thanh toán, mã lỗi, kiểm thử) — trình 19/10/2026, chủ dự án "mình duyệt".** Đề xuất duyệt cùng: mua/hủy/đổi gói chưa làm ở Bước 5; lệnh
`pnpm billing:fake-event` thay cho endpoint test; email báo trước 7 ngày khi gói "app tự gia hạn" sắp hết; 403 `quota-exhausted` (không dùng 429); 503 `ai-unavailable`;
409 `grant-not-allowed`; `pnpm entitlements:fake-ai` để smoke kiểm hai lần gọi AI tranh lượt cuối.

**Tham khảo luyentu.com (19/10/2026, đọc bằng Chrome của chủ dự án, chỉ đọc, không bấm mua hay đổi gì; "chỉ tham khảo ý tưởng"):** trang chủ (chuỗi ngày học, tổng từ,
truy cập nhanh, lộ trình theo kỳ thi), Bộ từ vựng (tạo bộ, folder, lộ trình; tab của tôi / cộng đồng / lớp học), Từ vựng (thống kê thuộc/chưa, "Thêm từ với AI", "Thêm nhiều
từ"), Học từ vựng (chọn bộ từ, bộ lọc, thứ tự, số lượng 20 từ; 6 dạng: Flashcard +5 xu, Trắc nghiệm +10, Nối từ với nghĩa +10, Gõ từ vựng +10, Nghe viết +15, Đặc biệt +20;
nút ôn SRS riêng), Cửa hàng (tiêu xu mua ảnh đại diện, hình nền: 3.000 xu, ảnh tự tải lên 20.000 xu), Xếp hạng (theo lượt chơi và streak, bản đồ ngày học, chuỗi chung với bạn,
trò chuyện cộng đồng). Bảng gói (ảnh chủ dự án gửi trước đó): Free AI tạo từ 2 lần/ngày, 500 từ cá nhân; Premium 100 lần/ngày, 5.000 từ, mở khóa lộ trình hơn 50.000 từ. Không
ghi tên người dùng khác. Tab đã đóng.

## Đọc design doc (19/10/2026)

Design doc, decision record và file tham khảo app khác viết xong. Claude nêu 6 điểm thêm khi viết; chủ dự án nhờ "rõ ràng hơn" → Claude viết lại bằng ví dụ. Chủ dự án:
1. Email báo trước mỗi kỳ gia hạn: "thường chỉ thông báo ở trial thôi… thông báo cũng tốt, nhưng cái này sẽ phải cân nhắc" → **D29**: làm sẵn, mặc định tắt.
2. Trial lần hai: "chỉ cho phép trial 1 lần duy nhất, mà nó phải nằm ở hệ thống của mình cho phép hay không chứ" → **D30**: Wordmet quyết, không cho Pro trong trial lặp.
3. 64 KB: chấp nhận được (5 lần thử lại không phản đối).
4. `grant-not-active`: ok. 5. Khoảng cho phép: ok, chỉnh sau được. 6. Mọi tài khoản thành Free sau Bước 5: ok.
Design và decision record sửa theo; thêm B5#28.

## Review độc lập design (19/10/2026)

Chủ dự án: "cho một agent review lại design doc trước khi viết plan". Agent chạy trên nhánh `docs/buoc-5-design-review` (cắt từ `origin/dev` @ `7ede16d`), viết
`docs/superpowers/reviews/2026-10-19-buoc-5-design-review.md`: 25 phát hiện (2 Cao, 13 Trung bình, 10 Thấp), 4 câu cho chủ dự án (Q1–Q4). Claude kiểm lại các điểm
chính: R2 và R1 đúng theo chữ của design mục 9.2, 9.4; R5 đúng (`smoke:buoc-4` mở 20 phiên với một learner, as-built Bước 4); R15 đúng (`learner-content.guard.ts`
trả 403 `profile-incomplete`); khóa `practice.user` có ở `practice-lock.ts`, đường ghi đáp án khóa dòng lần hỏi `FOR UPDATE` (`answers.service.ts`).

**Q1 (R2) — gói tự gia hạn qua cuối kỳ mà chưa có thông báo.** Phương án: (a) vẫn Pro tới khi có thông báo / (b) vẫn Pro thêm một khoảng (ví dụ 7 ngày) rồi khóa
tới khi có thông báo / (c) khóa ngay lúc hết kỳ tới khi có "đã gia hạn" / (d) khác. **Chủ dự án: (b).** Claude sau đó (đề xuất): dùng chung `grace_days` (7) cho khoảng
này; trong khoảng đó job mỗi giờ hỏi lại trạng thái (`fetchState`) nếu bộ nối hỗ trợ; quá khoảng → khóa như `on_hold`; trial quá `trial_ends_at` chưa có thông báo
cũng vậy; `renewed` tới trễ luôn đưa gói về `active` (bỏ chuyện `expired` là đường cụt, R2).

**Q2 (R8) — nhiều nguồn Pro, nguồn bắt đầu sớm hơn hết trước.** Phương án đưa ra: (a) theo mốc của nguồn còn lại (như design) / (b) giữ chu kỳ cũ tới khi hết
mọi nguồn Pro / (c) chu kỳ mới ngay lúc nguồn cũ hết / (d) khác; ví dụ Lan (trả Pro từ 1/11, được cấp "Pro tới 15/12" ngày 15/11, gói trả tiền hết 30/11, đã dùng 300
lượt từ 16/11).

**Chủ dự án:** "nếu cấp gói mới thì gói cũ hủy và gói mới được kích hoạt chứ, sao lại giữ nguyên gói cũ". Claude tách hai trường hợp: (1) gói cũ cũng do staff cấp
→ lần cấp cũ tự thu hồi, lần cấp mới có hiệu lực, chu kỳ bắt đầu lại từ lúc cấp (ghi theo ý chủ dự án); (2) Lan đang trả tiền qua nhà cung cấp → hỏi: (a) không cho
cấp gói khi đang trả tiền, chỉ đặt con số riêng / (b) cho cấp, Wordmet tính theo lần cấp, gói trả tiền vẫn chạy và vẫn trừ tiền / (c) cho cấp và báo nhà cung cấp tạm
dừng gói trả tiền / (d) khác.

**Chủ dự án (trường hợp 2):** "nếu cấp thì reset lại mốc, không hoàn tiền thì đúng hơn, như mình nói là nếu cấp thì hủy gói cũ và dùng gói mới, bản chất là nếu cấp thì
Lan vẫn có thể sử dụng được gói pro, nên hoàn tiền ở đây thì không hợp lý, chỉ trừ khi có sự cố trong gói và thu hồi cấp thì mới hoàn tiền".

**Claude sau đó (đề xuất, chờ chủ dự án):**
- Cấp "một gói" Pro luôn là **gói mới**: lần cấp gói cũ (nếu có) tự thu hồi; **mốc chu kỳ đặt lại = lúc lần cấp có hiệu lực**, số đã dùng của chu kỳ mới bắt đầu từ 0.
- Người nhận đang có gói **trả tiền tự gia hạn**: hệ thống báo nhà cung cấp **tắt tự gia hạn** (hủy cuối kỳ) để không trừ tiền kỳ sau; **không hoàn tiền**. Nếu lần cấp
  hết trước kỳ đã trả thì phần kỳ đã trả còn lại vẫn là Pro (không mất ngày đã trả).
- Staff phải xác nhận rõ khi cấp cho người đang trả tiền (API trả 409 `grant-not-allowed` / `target-has-paid-subscription` nếu thiếu cờ xác nhận).
- Hoàn tiền chỉ khi có sự cố và thu hồi lần cấp: staff làm bằng tay ở trang của nhà cung cấp; app nhận sự kiện `refunded` như mục 9.4.
- Store mobile: chưa kiểm Apple/Google có cho app tắt tự gia hạn thay người dùng không (`ASSUMPTION`: Apple chỉ người dùng tự hủy) → khi không tắt được thì báo staff.
- Luật mốc chung (thay mục 5.5): mốc = lúc bắt đầu của **nguồn Pro bắt đầu muộn nhất** còn hiệu lực ("gói mới kích hoạt"); mua Pro trong lúc đang được cấp cũng đặt lại mốc.

**Chủ dự án (19/10/2026):** "ok" với cả đề xuất trên (cấp Pro = gói mới, thu hồi lần cấp cũ, đặt lại mốc; người đang trả tiền tự gia hạn → tắt tự gia hạn, không
hoàn tiền, phần kỳ đã trả còn lại vẫn Pro; staff phải xác nhận; hoàn tiền khi có sự cố do staff làm bằng tay ở nhà cung cấp; mốc theo nguồn Pro bắt đầu gần nhất).
Riêng chỗ "trên iPhone app có thể không tắt được tự gia hạn thay người dùng (chưa kiểm)": **"cái này sẽ handle sau, lưu vào context giúp mình"** → ghi vào mục
việc còn mở của design (mục 19) và nhật ký này; xử lý khi làm bộ nối Apple/Google.

**Q3 (R12) — editor thu hồi lần cấp có con số lượt AI do admin đặt** (ví dụ admin đặt "lượt bài AI: 0" để chặn một tài khoản lạm dụng). Phương án: (a) được,
như luật hiện tại (mọi lần cấp trên người học) / (b) không, lần cấp có con số lượt AI chỉ admin thu hồi / (c) editor chỉ thu hồi lần cấp do editor tạo / (d) khác.

Chủ dự án "chưa rõ lắm" → Claude viết lại bằng ví dụ (Minh spam AI, admin Hà đặt "lượt bài AI: 0 tới 31/12", editor An bấm thu hồi). **Chủ dự án: (b)** — lần cấp
có con số lượt AI chỉ admin thu hồi (dù 0 hay 500); editor vẫn thu hồi được lần cấp khác. Claude đồng ý: khớp D7 (editor không đụng lượt AI); dùng lại 409
`grant-not-allowed` / `ai-limits-admin-only` cho thu hồi.

**Q4 (R24) — hoàn tiền một phần cho kỳ hiện tại** (store, nhà cung cấp hoặc ngân hàng). Phương án: (a) như hoàn toàn phần: mất Pro ngay / (b) giữ Pro, chỉ ghi lại /
(c) cắt ngắn kỳ theo tỉ lệ tiền hoàn / (d) khác.

Chủ dự án hỏi "bối cảnh này bị gì mà hoàn tiền" → Claude nêu ba tình huống: Apple tự hoàn phần tháng chưa dùng khi nâng tháng → năm; staff chủ động hoàn một phần khi có
sự cố; người dùng khiếu nại store hoặc ngân hàng. **Chủ dự án:** "chỗ này phải qua admin nha bạn" → hoàn tiền chủ động **chỉ admin** làm. Hỏi "store có tự quyết
không?" → Claude trả lời từ research và trang Apple đọc lại 19/10 (`handling-refund-notifications`: khách xin qua Apple Customer Support, reportaproblem.apple.com,
hoặc ngân hàng; App Store xử lý rồi gửi `REFUND`): Apple có; Google trong 48 giờ đầu là Google, sau đó người dùng liên hệ developer; ngân hàng tự quyết chargeback;
web qua Paddle hoặc cổng Việt Nam chủ yếu do admin.

**Chủ dự án (Q4): (a)** — "nếu hoàn tiền thì đồng nghĩa với pro mất, còn nếu trường hợp hủy mà không mất tiền thì giữ cho tới hết kỳ".

**Claude sau đó:** đồng ý; một điểm kỹ thuật: hoàn tiền áp cho **kỳ của giao dịch được hoàn**, không phải cả gói. Khi Apple hoàn phần tháng chưa dùng lúc nâng lên năm,
kỳ hiện tại là kỳ năm vừa trả (giao dịch khác) nên Lan vẫn Pro; hoàn cho kỳ đang dùng thì mất Pro ngay. Admin muốn đền bù mà không cắt Pro thì cấp thêm (ví dụ con số
riêng) thay vì hoàn tiền.

**Danh sách sửa kỹ thuật theo review** (R1–R25 trừ các câu sản phẩm; một dòng mỗi điểm): **chủ dự án "ok" (19/10/2026).** Design cập nhật (mục 0 bảng "Sau review
độc lập"; mục 4, 5.4, 5.5, 6, 7, 8, 9, 10, 12, 13, 14, 15.6, 16, 17, 18, 19, 20); decision record thêm D31–D34.
