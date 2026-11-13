# Review design "Giao diện mới cho toàn bộ web" (09/11/2026)

**Đối tượng:** `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` (gọi tắt "design") và
`docs/superpowers/decisions/2026-11-09-giao-dien-moi-decisions.md` (gọi tắt "record").
**Code đọc trên:** nhánh `docs/giao-dien-moi-design` = `origin/dev` @ `50b632e7` + commit `f364bec7`.
**Cách kiểm:** đọc code `apps/web`, `apps/api`, `packages/design-tokens`, `apps/admin`; đọc tài liệu Next 16.4.3 đi kèm gói
(`apps/web/node_modules/next/dist/docs/**`) và mã nguồn Next đã cài; Figma `JKnyUUtGjpGpfKK4PqBfdY` qua MCP chỉ đọc (`get_metadata`,
`get_variable_defs`); chạy thử hook git với lệnh đẩy tag của design; một trang tài liệu Google (Software App structured data).
Không sửa design, code hay Figma.

## Tóm tắt

1 Critical · 11 Important · 17 Minor.

| # | Mức | Phát hiện (một dòng) | Mục design |
|---|---|---|---|
| C1 | Critical | Bỏ trang Lịch sử luyện tập làm mất luôn tab "Báo lỗi của tôi" (K/82, K/83); Figma có nút "Báo lỗi của tôi" nhưng không màn nào nhận nó | §1, §9 M6, §10.4 |
| I1 | Important | API lịch không đủ dữ liệu cho khung Figma: số theo kết quả (16 / 6), số nhóm, tóm tắt từng phiên luyện, chuỗi ngày trên nút lịch | §10.2 |
| I2 | Important | Ngữ nghĩa các số của lịch còn mở đủ để hai người làm ra hai API khác nhau | §10.2, §10.3 |
| I3 | Important | "Learning gọi service Practice export ra" tạo vòng phụ thuộc module (Practice đã import Learning) | §10.2 |
| I4 | Important | Thay `theme.css` bằng `web.css` ở M1 làm vỡ các màn cũ "chạy tạm": trùng tên khác nghĩa (`accent` vàng thành navy), mất token motion, radius, font | §7.1, §9 M1 |
| I5 | Important | Tách layout `(tabs)` / `(sub)` lệch Figma và làm thanh trên mount lại khi đi từ tab vào trang phụ | §5.4 |
| I6 | Important | `AdsenseLoader` tải lại cả trang khi rời Nhóm, Tra từ: phá FLIP "mở nhóm" và việc giữ khung; design không nhắc | §5.4, §8.2 |
| I7 | Important | Next 16 đã bỏ cột "First Load JS" khỏi `next build`: ngân sách 10% không đo được như viết | §5.7, §13 |
| I8 | Important | Trang chủ Figma có bảng giá, JSON-LD muốn giá thật; giá là setting admin còn landing phải tĩnh. Design không nêu nguồn giá | §11, M8 |
| I9 | Important | Hôm nay, Nhóm trong Figma cần dữ liệu API chưa có ("tiếp theo · từ", "ôn gần nhất", "Lần luyện gần nhất") trong khi §1 nói API không đổi | §1, M3 |
| I10 | Important | Luật phụ thuộc thư mục mâu thuẫn với import đang có; không nói dời file nào đi đâu | §6 |
| I11 | Important | Sai về trang Nguồn dữ liệu (không dựng sẵn, `noindex`) và Điều khoản (`noindex`); kế hoạch sitemap thêm trang `noindex` | §5.2, §11 |
| M1 | Minor | Lệnh đẩy tag ở §4.1 bị hook chặn (đã chạy thử) | §4.1 |
| M2 | Minor | Ca biên "429 theo giới hạn chung" không có thật cho GET | §10.3 |
| M3 | Minor | Problem Details: `type` là `validation-failed`, tham số sai nằm ở `violations` | §10.3 |
| M4 | Minor | Hộp Lịch/Ngày theo URL: chưa chốt `pushState` hay `router.push`, Esc/Quay lại khi mở từ link, "tháng hiện tại" tính ở server | §5.6, §10.4 |
| M5 | Minor | `error.app.tsx` nên gọi `retry()`; `loading.app.tsx` không hiện ở lần tải đầu và một skeleton cho cả nhóm `(sub)` không khớp | §5.5 |
| M6 | Minor | Màu nhóm, màu ngăn: chưa nói hex nằm ở đâu; 7 màu cho 5 nhóm trùng màu với xác suất 85% | §7.3, §7.4 |
| M7 | Minor | Bóng nút lấy số mockup, lệch số Figma ghi trong `app-redesign-plan.md` | §7.2 |
| M8 | Minor | M2 thiếu ô "Nhập lại mật khẩu mới" ở Đặt mật khẩu mới; chưa nói giữ ngoại lệ của `AuthGate` | §9 M2, §5.4 |
| M9 | Minor | Phủ màn: 11 hộp thoại chưa có khung, 2 component Hệ thống chưa map, trạng thái "AI khóa ở Miễn phí" lệch API | §7.5, §9 |
| M10 | Minor | Sinh lại font ảnh OG không chỉ là chạy `pnpm gen:og-fonts` | §5.8 |
| M11 | Minor | SEO: SoftwareApplication không đủ điều kiện rich result; hreflang trang `/en/privacy`…; `themeColor` "navy" lệch thanh trên kính sáng | §11 |
| M12 | Minor | Kiểm thử: phạm vi `a11y.spec.ts`, e2e trên Windows, "cuối mỗi đợt" vs "cùng PR", test ghim Lexend, smoke, admin không có trong "Xong khi" | §13, §14 |
| M13 | Minor | Hiệu năng và truy cập của motion nặng (blur, băng chuyền, kéo thẻ) chưa có tiêu chí đo | §3.3, §8 |
| M14 | Minor | Các tài liệu nguồn lệch nhau ở vài quy tắc mà design chép lại | §3 |
| M15 | Minor | Một số con số, đường dẫn nhỏ không khớp | §1, §5.4, §10.1, §11 |
| M16 | Minor | Record thiếu bảng phương án ở nhiều mục và được viết khi GM14–GM18 còn mở | record |
| M17 | Minor | Truy vấn lịch theo tháng không có index `(user_id, local_date)` trên `learning_log` | §10 |

---

## Critical

### C1. Mất màn "Báo lỗi của tôi" khi bỏ trang Lịch sử luyện tập

**Bằng chứng.**
- Trang Lịch sử hiện có hai tab, `answers` và `reports`: `apps/web/src/features/learner/practice/HistoryPage.tsx:23,27,32,58–60`
  (`/app/practice/history?tab=reports`, K/82, K/83). Tab `reports` (`MyReportsTab.tsx`) là **lối vào duy nhất** tới
  `GET /v1/practice/reports`: danh sách báo lỗi của người học, kết quả xử lý, và dòng hoàn lượt AI (`practice-api.ts:166`
  "`refunded` says what became of the AI credit"). Không màn nào khác import `MyReportsTab` (đã grep `apps/web/src`).
- Design §10.4 xóa `HistoryPage.tsx`, chuyển hướng chỉ theo `?date=`; `?tab=reports` bị bỏ. Cả design không có chữ "Báo lỗi của tôi".
- Figma: modal Lịch `102:3278` có instance `166:5236` "Nút chữ: Báo lỗi của tôi" (đếm được 2 instance trên trang App người học).
  `app-redesign-plan.md:217` ghi "'Báo lỗi của tôi' thành liên kết ở chân modal". Không có khung nào cho đích của liên kết.
- §1 của design hứa "giữ nguyên hành vi nghiệp vụ". e2e `m4.spec.ts:286` và `e2e-shots/shots.spec.ts:231` đang mở
  `practice/history?tab=reports`.

**Hệ quả.** Làm theo design thì người học Pro mất chỗ xem báo lỗi và lượt AI được hoàn. Không test nào bắt được vì test cũ bị xóa cùng trang.

**Sửa.** Thêm một quyết định (GM19) cho đích của "Báo lỗi của tôi". Ba hướng: (a) route `/app/practice/reports` trong nhóm trang phụ,
dùng lại `MyReportsTab`, cần khung Figma hoặc theo khung Từ hay sai; (b) một hộp thoại mở từ chân modal Lịch, theo GM15; (c) giữ
`/app/practice/history?tab=reports` thành trang báo lỗi. Cùng lúc: luật chuyển hướng §10.4 thêm ca `?tab=reports`; giữ e2e cho danh sách
báo lỗi; ghi vào §1 "Không đổi".

---

## Important

### I1. API lịch không trả đủ dữ liệu mà khung Figma hiện

**Bằng chứng (Figma, `get_metadata` 09/11/2026):**
- Modal Ngày `103:3820`: "Ôn 22 lượt · lật thẻ và câu ôn", rồi hai khối "16 · Đã biết, lên một ngăn" (chip từ, "+8 từ") và
  "6 · Cần ôn lại, về ngăn 1 ngày"; "Học 10 từ mới · 4 nhóm"; "Luyện tập · 1 phiên · câu 1–20 · 17/20 đúng" kèm chip ✓17 ✗3.
- API §10.2 chỉ có `counts { learned, reviewed, practice_questions }` và `items` phân trang 20 dòng. Muốn có "16 / 6", "4 nhóm" thì web
  phải tải hết mọi trang `items`. "1 phiên · 17/20" phải tải hết mọi trang `GET /v1/practice/history?date=` rồi tự gom theo
  `session_id` (history có `session_id`: `apps/api/src/practice/history/history.service.ts:18–19`).
- Nút lịch nổi (component `95:343`, thuộc tính Ngày, Tháng, **Chuỗi**; `app-redesign-plan.md:215` "nhãn vàng số ngày liên tiếp") hiện
  trên mọi màn. Chuỗi ngày chỉ được API trả kèm lượt học đầu tiên trong ngày (`apps/api/src/learning/reviews/reviews.service.ts:16–18,82`;
  `use-practice-session.ts:59–60`). Không có GET nào trả chuỗi ngày (grep `streak` trong `apps/api/src` ngoài `learning/activity`).

**Sửa.** Bổ sung vào §10.2:
- `GET /v1/me/calendar` trả thêm `streak: { days, studied_today }` (dùng lại `streakAsOf`, `learning/activity/streak.ts`), hoặc một
  endpoint nhẹ riêng cho nút lịch.
- `counts` của ngày tách theo kết quả: `reviewed_known`, `reviewed_again` (đếm theo từ hay theo lượt, xem I2), và `groups` (số nhóm có từ
  học mới).
- Phần luyện tập: hoặc `practice_sessions: [{ session_id, questions, correct, first_position, last_position }]` trong ngày, hoặc ghi
  rõ web tải hết mọi trang history (tối đa 100 dòng một lần) và gom ở trình duyệt.
- Thêm ca biên cho từng trường mới.

### I2. Ngữ nghĩa các số của lịch chưa chốt

Design §10.2 để "cột và điều kiện chính xác (`kind`, `level_before`, `origin`) chốt ở bước code facts của plan". Đây là hợp đồng API
(người học đọc các số này), không phải sự thật code. Những chỗ hai người làm sẽ ra hai kết quả:

1. **Lượt hay từ.** §10.2 ghi `reviewed` là "số lượt ôn", mỗi `item` là "mỗi từ một dòng", ca biên "300 lượt ôn → phân trang 20 dòng,
   `counts` vẫn đúng tổng". Figma ghi "Ôn 22 lượt" nhưng hai khối 16 + 6 lại là từ. Chưa nói `counts.reviewed` đếm lượt hay từ.
2. **Dòng log nào là "ôn".** `learning_log.kind` chỉ có `review`, `item_added`, `item_removed`
   (`reviews.service.ts:72`, `practice-review.service.ts:77`, `recall-answer.service.ts:48`, `items.service.ts:243,259`,
   `groups.service.ts:118`). `origin` là `null` (thẻ), `'practice'` (nút "Cần ôn tập/Đã biết" trong phiên luyện), `'recall'` (phiên Ôn)
   (`learning.prisma:70–72`). Chưa nói `origin='practice'` có tính vào "ôn" không.
3. **"Học" là gì.** Không có `kind` riêng cho học. DC4 (`2026-11-06-dot-cai-thien-c-decisions.md:17`): từ mới học xong vào nấc 1, sau đó
   lật thẻ ở chế độ Học không đổi lịch. Chưa nói lượt lật ở chế độ Học với từ đã học có ghi log `review` không, và nếu có thì tính vào đâu.
   Một từ mới bấm "Cần ôn lại" ngay lần đầu thì có là "học mới" không.
4. **`practice_sessions`.** `practice_sessions` không có `local_date`; chỉ `practice_session_items.local_date` có
   (`practice.prisma:92`). Phiên qua nửa đêm tính vào ngày nào. Phiên Ôn (`kind='recall'`) có tính là "phiên luyện" không.
   Trang history hiện loại phiên recall (`history.service.ts:102–103`, DC30); `practice_questions` có dùng cùng bộ lọc
   (`result in ('correct','wrong')`, `kind='practice'`) không.
5. **`study_days`.** Là số dòng `days` hay số dòng `learning_activity_days.studied = true`. Hai cách lệch nhau khi ngày chỉ có
   `origin='practice'`.
6. **Phân trang `items`.** Chưa có thứ tự (theo giờ lần cuối, theo lemma, học trước ôn sau…). Chưa nói `page_token` gắn với
   `(date, kind)` như history đang làm (`encodeBoundToken`, `history.service.ts:130`).
7. **`group_id`.** Một từ có thể ôn ở hai nhóm cùng ngày (`learning_log.group_id` theo từng lượt, `null` khi `origin='practice'`). Chưa
   nói lấy nhóm nào.
8. **Mặc định.** Thiếu `?month=` thì sao. `counts` có đổi theo `?kind=` không. "Một từ" là `item_id` (một nghĩa) hay lemma.

**Sửa.** Viết các định nghĩa vào §10.2 ngay trong design, mỗi định nghĩa một câu và một ca When → Then (theo
`docs/specs/SPEC_WRITING_CONVENTIONS.md`). Bước code facts chỉ còn việc kiểm định nghĩa khớp các chỗ ghi log.

### I3. Vòng phụ thuộc module Learning ↔ Practice

**Bằng chứng.** `PracticeModule` import `LearningModule` (`apps/api/src/practice/practice.module.ts:7,46`); `PracticeModule` không export
gì. Design §10.2: Learning sở hữu hai endpoint, lấy số phiên luyện "qua service Practice export ra". Muốn vậy `LearningModule` phải import
`PracticeModule`: vòng import, NestJS cần `forwardRef` ở cả hai phía. Code đã có mẫu tránh vòng: port do Learning khai báo, Practice cung
cấp (`apps/api/src/learning/private-senses-cleanup.port.ts:5–8`, "Practice supplies this port without Learning importing Practice
(design Bước 4 R2)"; export ở `learning/index.ts`).

**Sửa.** Chọn một trong hai và ghi vào design: (a) Learning khai báo port `PRACTICE_DAY_COUNTS` (đếm câu, phiên theo `local_date` của một
người), Practice cung cấp, giống `PRIVATE_SENSES_CLEANUP`; (b) đặt controller lịch ở Practice, gọi `LearningService` (chiều phụ thuộc đã
có). Ghi lý do chọn.

### I4. Đổi token ở M1 làm vỡ các màn cũ "chạy tạm"

**Bằng chứng.**
- `apps/web/src/app/globals.css:2–6` import `theme.css`, `dark.css`, `island.css`. Code web dùng tên token cũ khắp nơi: `bg-canvas`,
  `bg-navy`, `text-on-navy`, `shadow-ledge`, `rounded-control`, `bg-primary-soft` (ví dụ `AppShell.tsx:42,79,118`). `globals.css`
  dùng `var(--color-primary-deep)`, `--ease-enter`, `--transition-duration-base` (`globals.css:64–79`). `pastel-island` (island.css)
  dùng ở `GroupCard.tsx:68`, `TopicSuggestions.tsx:40`, `SourceCard.tsx:45`, `QuickAddBox.tsx:20`, `LookupPage.tsx:72`.
- Trùng tên khác nghĩa: hiện `accent` = vàng `#ffd84a`, `primary` = `#2445d6`, `ink` = `#0f1a3d`
  (`packages/design-tokens/README.md`, bảng Colours). Figma mới: `color/accent` = navy `#1e3a8a`, `color/mark` = vàng, `color/ink` =
  `#1b2444` (đã đọc bằng `get_variable_defs` trên `117:4425`).
- §7.1 bỏ `theme.css`, `dark.css`, `island.css` khỏi `globals.css` ngay M1, nhưng §9 M1 lại nói "các màn cũ chạy tạm trong khung mới",
  và §7.1 lại nói `dark.css`, `island.css` "không còn ai dùng sau M8 thì xóa ở M9". Ba câu không cùng đúng được.
- `packages/design-tokens/package.json` có trường `exports` chỉ liệt kê bốn file hiện có. Thêm `web.css` mà không thêm vào `exports` thì
  `@import '@wordmet/design-tokens/web.css'` và `createRequire(...).resolve(...)` trong `tokens.test.ts:6–9` báo
  `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- §9 M9 và §14 "xóa token cũ không dùng" không nói rõ là không đụng `theme.css`. Admin vẫn import nó
  (`apps/admin/src/styles/globals.css:2`) và có test riêng đọc nó (`apps/admin/src/styles/tokens.test.ts:8`).

**Sửa.** Ghi một chiến lược chuyển tiếp trong §7.1. Đề xuất: M1 giữ import `theme.css`, `dark.css`, `island.css`; `web.css` khai báo
token mới với tiền tố riêng hoặc tên không trùng (ví dụ `--color-wm-accent`, hoặc đổi `accent` cũ ở web thành `highlight`/`mark` trước);
màn nào đã làm lại thì chỉ dùng token mới; M8 bỏ import cũ khi `grep` không còn class cũ (thêm một test kiểm điều đó). Ghi rõ: không xóa
gì trong `theme.css`; thêm `./web.css`, `./web-dark.css` vào `exports`.

### I5. Chia layout `(tabs)` / `(sub)` không khớp Figma và không giữ được khung

**Bằng chứng (Figma).**
- Mọi khung điện thoại không phải phiên đều có cùng `Thanh trên app/Mobile` và `Thanh tab dưới`: 36 instance mỗi loại. Có cả các trang
  phụ: Một nhóm `84:3749`, Từ tồn đọng `97:3239`, Chủ đề `98:3297`, Trang một từ `118:4714`, Từ hay sai `119:4482`, Cài đặt `120:4559`,
  Xóa tài khoản `121:4634`, Đơn hàng `123:4690`.
- Component `54:503` (thanh trên điện thoại) chỉ có logo, nút tìm, avatar; không có nút quay lại. Nút "Quay lại" nằm trong nội dung trang
  (`84:3762`, `121:4417`, `97:3251`, `122:4367`).
- Thanh trên máy tính `54:502` có biến thể `Tab=Không` (`149:4381`) cho trang phụ; thanh tab dưới cũng có `Tab=Không` (`149:4350`).
- Nút "+" nổi chỉ có ở Hôm nay (`117:4712`), không có ở Nhóm `82:3368`, Tra từ `85:3667`, Luyện tập `99:3391`.

Design §5.4: `(tabs)` có "thanh trên, tab dưới (điện thoại), nút lịch nổi, nút + nổi"; `(sub)` có "thanh trên, nút quay lại ở điện
thoại, nút lịch nổi", tức không có thanh tab dưới. Hai layout khác nhau thì đi Nhóm → Một nhóm sẽ unmount `(tabs)/layout` và mount
`(sub)/layout`: thanh trên và ô tìm của nó mất trạng thái. Đây đúng là điều §5.4 muốn tránh ("mỗi lần chuyển trang khung vẽ lại và mất
trạng thái").

**Sửa.** Gộp `(tabs)` và `(sub)` thành một nhóm (ví dụ `(chrome)`). Layout đặt thanh trên, thanh tab dưới, nút lịch nổi một lần; tab
đang sáng (hoặc `Không`) suy ra từ `useSelectedLayoutSegment()` hoặc `usePathname()`. Nút quay lại và nút "+" để trang tự khai báo.
Sửa bảng When → Then của §5.4 theo cấu trúc mới.

### I6. `AdsenseLoader` tải lại cả trang, design không tính tới

**Bằng chứng.** `apps/web/src/features/learner/ads/AdsenseLoader.tsx:4–5,30–33`: script AdSense chỉ được ở `/app/groups` và
`/app/lookup`; đã tải mà rời hai trang đó thì `hardReplace(window.location.href)`, tức tải lại cả document. Loader nằm trong
`(member)/layout.app.tsx:18`, design giữ nó ở đó (§5.4).

**Hệ quả.** Với người học Free được xem quảng cáo (khi build có `NEXT_PUBLIC_ADSENSE_CLIENT`):
- Mở nhóm từ băng chuyền (`/app/groups` → `/app/group`) tải lại trang. Hiệu ứng "mở nhóm" FLIP 380ms (motion §3, design §8.2) không chạy được.
- Mọi lần rời Nhóm hoặc Tra từ đều mất khung, mất trạng thái React Query, mất chữ đang gõ; lần tải lại còn qua spinner của
  `RequireSession` (xem M5).

**Sửa.** Thêm vào §5.4 và §8.2 một dòng When → Then cho người học có quảng cáo. Ví dụ: "Lan (Free, có quảng cáo) mở nhóm từ băng chuyền →
trang tải lại, không có FLIP; nhóm mở bằng hiệu ứng vào trang thường". Nếu muốn giữ FLIP thì cần quyết định lại DB38 với chủ dự án; đừng
âm thầm đổi chỗ đặt script.

### I7. "First Load JS" không còn trong output của `next build`

**Bằng chứng.** `apps/web/node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:1003`: "Next.js 16 removes the `size`
and `First Load JS` metrics from the `next build` output." Next 16.4.3 đã cài chỉ ghi `.next/diagnostics/route-bundle-stats.json` (trường
`firstLoadUncompressedJsBytes`), và **chỉ với Turbopack** (`next/dist/build/index.js:2922–2923`,
`next/dist/build/route-bundle-stats.js:20,148–152`). File này không có trong tài liệu.

Design §5.7 ("cột First Load JS của next build… không route nào nặng hơn bản cũ quá 10%") và §13 dựa vào cột đó.

**Sửa.** Đổi thước đo: một script đọc `.next/diagnostics/route-bundle-stats.json` của bản cũ (build ở tag `archive/giao-dien-cu-2026-11`)
và bản mới, so từng route `/vi/app/**`, fail khi quá 10%. Ghi rằng file này là chi tiết nội bộ của Next. Hoặc dùng Lighthouse "Total
JavaScript" trên vài màn. Chạy được trong CI thì "Xong khi" có thứ fail.

### I8. Giá trên trang chủ và trong JSON-LD chưa có nguồn

**Bằng chứng.**
- Figma Trang chủ (`5:13`, `9:108`) có bảng giá: "79.000 ₫", "199.000 ₫", "599.000 ₫", "≈ 49.900 ₫ mỗi tháng", "Giá mua lẻ từng tháng".
  Landing hiện không có giá: `apps/web/src/components/landing/Plans.tsx:31` "Two plans, no prices".
- Giá là setting admin, đổi không cần deploy: `pro_price_1m_vnd`, `pro_price_3m_vnd`, `pro_price_12m_vnd`
  (`apps/api/src/settings/settings.definitions.ts:45,140–142`). App đọc giá từ API ("Giá vừa đổi, xem lại trước khi mua",
  `messages/vi.json:1590`).
- Landing phải dựng sẵn: `scripts/assert-render-mode.mjs:1–13` (LP2) chạy trong CI.
- §11 muốn JSON-LD "giá lấy cùng nguồn với bảng giá trang chủ", nhưng design không nói bảng giá trang chủ lấy từ đâu.

**Hệ quả.** Ghi cứng giá vào `messages` thì landing lệch giá thanh toán khi admin đổi giá. Đọc API mỗi request thì landing hết tĩnh và CI
fail. Đọc API lúc build thì giá cũ cho tới lần deploy sau.

**Sửa.** Thêm một quyết định cho chủ dự án, kèm trade-off. Các hướng: (a) đọc giá lúc build, ghi rõ phải deploy lại khi đổi giá (thêm vào
`deploy-checklist.md`); (b) landing tĩnh, chỉ bảng giá là island client đọc `GET` giá công khai (cần endpoint công khai và CSP
`connect-src`); (c) ISR/revalidate trên OpenNext (cần cache R2/KV, như phương án đã bỏ ở GM11). JSON-LD theo cùng nguồn đó.

### I9. Hôm nay và Nhóm trong Figma cần dữ liệu API chưa có

**Bằng chứng (Figma).** Băng chuyền Nhóm `82:3213`: "tiếp theo · prevalent", "ôn gần nhất · take for granted" trên từng thẻ nhóm.
Hôm nay `117:4425`: các thẻ nhóm có "tiếp theo · commute"; khối "Lần luyện gần nhất · thứ bảy, 07/11 · 20 câu · Đề 12 · Writing · 14/20
đúng · Sai: deteriorate, allocate, viable, scrutiny" và nút "Luyện lại từ sai →".

**Bằng chứng (code).** `GroupSummary` chỉ có `id, name, version, total, today, cells, backlog, available`
(`apps/web/src/features/learner/groups/groups-api.ts:12–22`). Không có endpoint "phiên luyện gần nhất". Controller phiên chỉ có
`POST /`, `GET current`, `next`, `prepare`, `continue`, `finish` (`practice/sessions/sessions.controller.ts:44–87`). History item không
có tên nhóm của phiên. `app-redesign-plan.md:147` tự ghi khối "Lần luyện gần nhất" là "đề xuất mới". Dòng 187 ghi N4 "cần API trả vài
thẻ đầu của mỗi nhóm".

Design §1: "Không đổi: … API ngoài phần lịch học". §3.1: "chữ trong Figma hứa điều API không làm thì sửa chữ, không sửa API". Áp quy tắc
đó thì băng chuyền mất dòng "tiếp theo" và Hôm nay mất một khối. Đây là quyết định sản phẩm, không nên để người code tự chốt trong rulings.

**Sửa.** Thêm vào §9 M3 một bảng "dữ liệu màn cần → API có chưa". Với mỗi chỗ thiếu, đưa chủ dự án chọn: thêm trường (ví dụ
`next_lemma`, `last_reviewed_lemma` trong `GET /v1/groups`; `GET /v1/practice/sessions/last`), suy ra ở web từ API sẵn có (history +
groups), hoặc bỏ khỏi giao diện. Nếu thêm API thì sửa câu "Không đổi" ở §1.

### I10. Luật phụ thuộc §6 mâu thuẫn với import đang có

**Bằng chứng.**
- `site/` "không được import `app-shell/`", nhưng landing cần theme: `app/[locale]/(site)/layout.tsx:3–4` import
  `@/app-shell/theme/ThemeProvider`, `THEME_SCRIPT`. `lib/legal.ts:2` và `lib/sources.ts:1` import `@/app-shell/config`, mà `site/` và
  `ui/` lại được import `lib/`.
- `ui/` "không được import `features/`", nhưng `app-ui/PronunciationLine.tsx:3` import `@/features/learner/word/pronunciation`, và
  `SpeakButton` ở §7.5 dùng lại logic này.
- `app-chrome/` chỉ được import `ui/`, `app-shell/`, `lib/`, nhưng thanh trên cần mở Thêm từ và phím `/`: `TopBar.tsx:7`,
  `AppShell.tsx:7` import `features/learner/add-word/add-word-context`; `SearchStrip.tsx:8` import `features/learner/lookup/lookup-api`.
  Nút lịch (`app-chrome/CalendarButton`) cũng phải mở hộp Lịch nằm ở feature.
- `app-ui/speech.ts`, `audio-player.ts` bị xóa cùng `app-ui/` ở M8; §7.5 không nói chúng đi đâu.

**Sửa.** Thêm vào §6 một bảng "dời gì đi đâu": theme, config lên `lib/` (hoặc cho `site/` import `app-shell/theme` và `app-shell/config`);
`add-word-context`, trạng thái hộp Lịch lên `app-shell/` (hoặc một thư mục `app-state/`); `pronunciation.ts`, `speech.ts`,
`audio-player.ts` vào `lib/`. Ghi rõ bảng là whitelist hay blacklist, vì `no-restricted-imports` chỉ chặn được theo danh sách cấm. Thêm
một test lint có fixture vi phạm để luật có "răng".

### I11. Sai về trang Nguồn dữ liệu và Điều khoản; sitemap thêm trang `noindex`

**Bằng chứng.**
- `app/[locale]/(site)/sources/page.tsx:9–10,16,22`: `force-dynamic`, đọc `GET /v1/sources` mỗi request (`lib/sources.ts:13–29`, đợi
  tối đa 2,5 giây), `robots: { index: false }`. Design §5.2 xếp trang này vào "Dựng sẵn lúc build… Như hiện nay".
- `terms/page.tsx:12,18`: `force-dynamic`, `robots: { index: false }`, không có `description`. Design §11 ghi "hiện Chính sách và Điều
  khoản chỉ có description khi chưa đăng bản nào". Thực tế chỉ Chính sách (`privacy/page.tsx:21`) làm vậy.
- §11 muốn thêm `privacy`, `terms`, `sources` vào sitemap. Hai trang đang `noindex`: đưa trang `noindex` vào sitemap là tự mâu thuẫn
  (Search Console báo "Submitted URL marked 'noindex'"). Design không nói bỏ `noindex`.

**Sửa.** §5.2: đưa Nguồn dữ liệu sang dòng "server render mỗi lần mở" cùng Chính sách, Điều khoản. §11: thêm một quyết định "bỏ hay giữ
`noindex` ở Điều khoản và Nguồn dữ liệu"; sitemap chỉ liệt kê trang được index. Sửa câu về `description`. Thêm test pin danh sách
sitemap theo `NEXT_PUBLIC_INDEXABLE` (đã có mẫu ở `lib/landing-locale.test.ts:31–32`).

---

## Minor

### M1. Lệnh đẩy tag ở §4.1 bị hook chặn

Đã chạy hook (`~/.claude/hooks/enforce-git-conventions.py`) với đúng lệnh của design:
`git push origin archive/giao-dien-cu-2026-11` → exit 2: "push: tên nhánh `archive/giao-dien-cu-2026-11` không đúng `<type>/<short-slug>`".
Hook chỉ bỏ qua ref bắt đầu bằng `refs/tags/` (dòng 342). `git push origin refs/tags/archive/giao-dien-cu-2026-11` → exit 0.
**Sửa:** đổi lệnh ở §4.1 thành dạng `refs/tags/…`. `BRANCH_RE` ở dòng 58 thì design trích đúng.

### M2. Ca biên "Gọi quá nhanh → 429 theo giới hạn chung" không có thật

SR14 (`docs/specs/system-spec.md:83`) chỉ áp cho "mọi endpoint ghi". `RateLimitGuard` chỉ chạy khi handler có `@RateLimit`
(`common/rate-limit/rate-limit.guard.ts:18–19`), và không `@Get` nào có `@RateLimit` (grep controller). Không có rule cho lượt đọc
(`common/config/app-config.ts:6–27`). **Sửa:** bỏ dòng này, hoặc thêm rule `user.read` cùng ca biên có con số.

### M3. Problem Details cho tham số sai

Lỗi kiểm tham số có `type: validation-failed` và tham số sai nằm ở `violations`
(`common/problem-details/problem-details.filter.ts:77,88`; `day-range.ts:18–20`). Câu "`type` chỉ ra tham số nào sai" (§10.3) sai.
**Sửa:** "400 `validation-failed`, `violations` nêu `month` / `date`". Thêm ca: tháng hợp lệ nhưng quá xa (`0001-01`) thì sao; nên đặt giới
hạn như `REPORT_RANGE_MAX_DAYS`.

### M4. Hộp Lịch/Ngày theo tham số URL còn mở vài chỗ

- `router.push('?ngay=…')` trên route render theo request (`connection()`) sẽ gọi RSC tới Worker mỗi lần đổi ngày. Next cho dùng
  `window.history.pushState` và `useSearchParams` tự theo (`docs/01-app/01-getting-started/04-linking-and-navigating.md:344–348`).
  Design không chốt cách nào.
- "Có cả `?lich=` và `?ngay=` → Quay lại về hộp Lịch": mở từ link trực tiếp thì mục trước trong lịch sử là trang khác, không phải hộp Lịch.
  Cần nói Esc, "‹ Lịch tháng 11" và nút Back của trình duyệt làm gì (`replaceState` hay `history.back()`).
- §10.4: trang server tính "tháng hiện tại" theo giờ Worker (UTC), lệch tháng với người học UTC+7 trong 7 giờ đầu tháng. Nên chuyển tới
  `?lich` không giá trị và để web tự tính tháng theo `me.timezone`. Trang chuyển hướng phải giữ locale, và thêm ca `?tab=reports` (C1).
- `useSearchParams` trong layout chạy được vì `/app` render theo request (`docs/.../use-search-params.md:180–188`). Vẫn nên bọc
  `Suspense` để build không vỡ nếu sau này bỏ `connection()`.

### M5. `loading` và `error` theo nhóm route

- Next 16.3+ đưa `retry()` thành cách khuyên dùng; `reset()` chỉ dùng khi không muốn tải lại
  (`docs/01-app/03-api-reference/03-file-conventions/error.md:117–157,331`). Design ghi "nút Thử lại gọi `reset()`".
- `RequireSession` trả `FullScreenSpinner` cho tới khi phiên có trả lời (`app-shell/RequireSession.tsx:54–55`). Mọi lần tải cứng (mọi lần
  mở app, mọi `hardReplace`) người học thấy spinner, không thấy khung hay skeleton. `loading.app.tsx` chỉ hiện khi chuyển trang mềm. Một
  skeleton "theo màn đầu nhóm" cho cả `(sub)` (Một nhóm, Cài đặt, Gói học…) sẽ sai hình ở hầu hết trang.
- `loading.app.tsx`, `error.app.tsx` với `pageExtensions` riêng: chạy được. App loader của Next tìm mọi file đặc biệt (layout, loading,
  error, not-found…) theo danh sách đuôi (`next/dist/build/webpack/loaders/next-app-loader/index.js:91–99,638–640`).

**Sửa:** đổi `reset()` thành `retry()`; cho `RequireSession` vẽ skeleton hình khung thay spinner; skeleton theo từng route, hoặc một
skeleton trung tính.

### M6. Màu nhóm, màu ngăn

- Bảy hex của màu nhóm và sáu màu hạng của ngăn chưa có chỗ khai báo. Luật "màu chỉ khai báo trong package" chỉ được kiểm ở `globals.css`
  (`tokens.test.ts:114–117`, UBC1). `check-tailwind-raw.mjs` cấm `style=` và giá trị tùy ý nếu không có `// raw-ok`
  (`scripts/check-tailwind-raw.mjs:1–2,15–17`). Bảng hex trong `lib/*.ts` cộng `style` sẽ lách cả hai luật. Component "Chip ngăn"
  `54:656` không gắn biến màu nào (`get_variable_defs` chỉ trả text style).
- Xác suất trùng: 7 màu, chỉ số băm ngẫu nhiên. 3 nhóm trùng ít nhất một cặp với xác suất 39%; 5 nhóm (ví dụ Lan) 85%
  (1 − 7·6·5·4·3/7⁵). GM5 có nói "có thể trùng" nhưng không có con số; chủ dự án nên thấy con số này.
- Tương phản trên trắng đã đo: `#d99a17` 2,45, `#e5603f` 3,46, `#149384` 3,79, `#4a9637` 3,68, `#2a86d1` 3,87, `#d2427a` 4,37,
  `#7a55d3` 5,16. Trên nền tối `#171b2a`: `#7a55d3` 3,32, `#64708c` 3,46.

**Sửa:** khai báo `--color-group-0…6`, `--color-stage-*` (sáng, tối) trong `web.css`, `web-dark.css`; `groupColorIndex` chỉ trả chỉ số;
thêm cặp tương phản vào LP12. Nêu xác suất trùng trong GM5. Nếu muốn ít trùng hơn, đưa thêm phương án "gán theo thứ tự tạo nhóm" kèm
trade-off (cần `created_at` trong `GroupSummary`).

### M7. Bóng nút: mockup hay Figma

§7.2 lấy `--shadow-btn` = `0 6px 14px -8px rgb(30 58 138 / .55)` từ `vong-15-polish-9-trang.html:17` và nói các bóng "khớp style Shadow/Card,
Row, Pop trong Figma". Ba bóng đó khớp (đã đọc: Card `#1B24440F 0 1 2` + `#1B244433 0 10 28 -14`…). Nhưng `app-redesign-plan.md:492`
ghi nút navy trong Figma là "30 58 138, 34%, y 10, blur 28, spread -10", tức `0 10px 28px -10px rgb(30 58 138 / .34)`. Component "Nút"
`3:12` mang effect style `Shadow/Soft` (`#1B24440D 0 1 2` + `#1B244438 0 14 34 -14`), không có trong bảng token. §3.1 nói Figma thắng.
**Sửa:** chốt một nguồn cho bóng nút, ghi R-số trong rulings, thêm `Shadow/Soft` vào bảng nếu dùng.

### M8. Đăng nhập và tài khoản

- Figma thêm "Nhập lại mật khẩu mới" ở Đặt mật khẩu mới (`153:705`, `153:728`; `docs/audit/2026-11-09-figma-audit.md:31`). §9 M2 chỉ ghi
  ô nhập lại ở Đăng ký; §13 cũng chỉ nói "ô nhập lại mật khẩu".
- `AuthGate` để người đã đăng nhập mở được quên mật khẩu, đặt lại mật khẩu (Google-only đặt mật khẩu lần đầu, B8-2:
  `features/learner/auth/AuthGate.tsx:12–13,31`; e2e `b8-set-password.spec.ts`). Layout `(auth)` mới phải giữ điều này.
- `(auth)/layout` cần biết đang ở trang nào để chọn khung hai cột (Đăng nhập `35:308`, Đăng ký `35:405`) hay card giữa. Layout server
  không nhận pathname: cần hai nhóm con (`(auth)/(split)`, `(auth)/(card)`) hoặc client component đọc `usePathname`.

### M9. Phủ màn

Mọi khung trên ba trang Figma đều có trong §9 (đã đối chiếu 10 + 18 + 73 khung; ID và tên khớp). Còn thiếu:
- 11 hộp thoại có trong code nhưng chưa có khung (`app-redesign-plan.md:261`: Tạo/Đổi tên/Xóa nhóm, Bỏ từ khỏi nhóm, Bỏ N từ khỏi việc
  học, Sửa từ, Xóa từ, Câu đã gặp, Báo lỗi câu này, Phiên đang dở, Hủy gói; code: `GroupDialogs.tsx`, `MyWordDialogs.tsx`,
  `SavedSentencesDialog.tsx`, `ReportDialog.tsx`, `CurrentSessionCard.tsx`, `SubscriptionRows.tsx`, `SettingsPage.tsx`). Design không
  xếp chúng vào đợt nào và không nói dựng theo quy tắc nào (GM15 chỉ nói chuyển động).
- Component Hệ thống chưa map ở §7.5: "Lựa chọn" `3:51` (Thường, Đúng, Sai: ô đáp án của Phiên luyện), "Thẻ từ" `3:28`.
- Overlay 7, khung trạng thái `131:4522`, có trạng thái "AI khóa ở gói Miễn phí". Nhưng Free đã có 15 lượt câu AI từ đợt A M3
  (`docs/deliveries/cloze-own-then-ai.md:58–60`). §9 M5 không nhắc chỗ lệch đã biết này.
- Từ tồn đọng, Chủ đề trên điện thoại ẩn nút lịch nổi để không chồng thanh nổi (`app-redesign-plan.md:432`). §9 M6 ghi "nút lịch nổi trên
  mọi màn app (trừ overlay)".

### M10. Sinh lại font ảnh OG

`scripts/gen-og-fonts.mjs:3–6` đọc cứng `assets/fonts/Lexend-*.ttf`; `og-fonts.test.ts` kiểm `lexendRegular`, `lexendExtraBold`;
`opengraph-image.tsx:34` dùng `fontFamily: 'Lexend'`. `next/og` cần TTF tĩnh (comment trong test). Cần thêm TTF tĩnh Noto Sans (có
tiếng Việt) và Bricolage ExtraBold vào `assets/fonts/` cùng giấy phép OFL, sửa script và test. File nhúng hiện là 274 KB. Noto Sans có
tiếng Việt lớn hơn nhiều; nên ghi cỡ Worker trước và sau (mục Worker của `deploy-checklist.md:164–173`).

### M11. SEO

- Rich result SoftwareApplication bắt buộc có `aggregateRating` hoặc `review` (Google, "Software App structured data", đọc 09/11/2026).
  Wordmet không có. Rich Results Test sẽ báo không đủ điều kiện; §13 và §14 "điểm Rich Results đã ghi" cần đổi thành "markup hợp lệ" (Schema
  Markup Validator) và không được bịa đánh giá.
- `/en/privacy`, `/en/terms`, `/en/sources` vẫn được phục vụ; chỉ trang chủ `/en` chuyển hướng (`lib/landing-locale.ts:7–11`). Bảng ca
  biên §11 ("`/en` vẫn chuyển sang `/vi`") không nói hreflang và canonical của các trang này. `alternates` của trang đè hết `alternates`
  của layout, nên trang pháp lý hiện không có hreflang.
- `viewport.themeColor` "theo navy mới": thanh trên mới là kính sáng trên `color/bg` (biến của `54:503`: `--bg`, `Glass/Header`). Thanh
  địa chỉ navy trên một thanh trên sáng sẽ lệch. Nên dùng `#f6f7fa` / `#0f1220`, sửa cả `manifest.ts:9–10`.

### M12. Kiểm thử và "Xong khi"

- `e2e/a11y.spec.ts:8` chỉ quét `/vi`, `/vi/privacy`, `/vi/terms`, `/vi/sources`. Axe cho app nằm trong từng spec app qua
  `support/axe.ts`. Bảng §13 ghi `a11y.spec.ts` cho "mọi màn mới".
- `pnpm test:e2e` chạy `cf:build` của OpenNext (`playwright.config.ts:19`). Trên máy Windows của chủ dự án phải qua `pnpm cf:docker`
  (CLAUDE.md, mục Landing).
- §13 "sửa journey cuối mỗi đợt" lệch §15 "sửa trong cùng PR với màn" và §14 "CI xanh trên PR". Chọn "cùng PR".
- Test sẽ đỏ ngay ở M1 vì đổi font, màu: `e2e/chrome.spec.ts:4–13` ghim H1 là Lexend; LP12 trong `tokens.test.ts`. Nên liệt kê để plan có
  task.
- `smoke:giao-dien-moi` là script trong `apps/api/package.json` (các smoke khác ở đó), cần DB và `JOB_QUEUE_PREFIX` riêng, và tôn trọng
  giới hạn 5 lần đăng ký mỗi IP mỗi giờ. Smoke chỉ kiểm được ngày hôm nay; ca đổi múi giờ, qua nửa đêm, từ đã xóa chỉ có hàm thuần kiểm, còn
  truy vấn SQL thì không có test nào (không còn backend e2e, D38). Nên ghi rõ đó là khoảng trống chấp nhận.
- §12 "khóa không còn dùng thì xóa" không có gì kiểm. LP3 chỉ kiểm hai file có cùng khóa (`src/i18n/messages.test.ts:34`).
- "Xong khi" không có `assert:render-mode` (CI đang chạy, `ci.yml:108`) và không có lint, typecheck, test, build của `apps/admin`, dù đợt
  này sửa `packages/design-tokens`.

### M13. Hiệu năng và truy cập của motion

- Kính mờ `blur(24px) saturate(1.6)` trên mọi màn, nhiều lớp `filter: blur()` ở băng chuyền và chồng thẻ, lưới chấm phủ nền. Lighthouse
  chỉ đo trang chủ và một trang pháp lý (§13). Nên đo FPS hoặc INP của Ôn và Nhóm trên điện thoại tầm thấp (CPU giả lập chậm 4×).
- JetBrains Mono `preload: false` mà dùng cho nhãn trên gần như mọi màn app (58 khung, theo audit Figma). Dễ nhảy chữ khi font tới.
- Chưa có yêu cầu truy cập riêng: băng chuyền quay vòng (role, thông báo nhóm đang chọn, thẻ mờ phải `inert` hoặc `aria-hidden`); kéo
  thẻ cần cách làm không kéo (WCAG 2.2 SC 2.5.7, nút Đã biết / Cần ôn lại đã có, nên ghi rõ); phím `L`, `F` phải bỏ qua khi đang gõ trong ô
  nhập (ô gõ đáp án ở Phiên luyện).

### M14. Tài liệu nguồn lệch nhau ở chỗ design chép lại

- Thời lượng: `ui-best-practices.md:79` "Vào trang, vào phần: 600–900 ms" so với motion §1 "vào 300–340ms" (design §8.1 theo motion).
- Bo tròn hẳn: `ui-best-practices.md:34` chỉ công tắc, nút chia đoạn, ảnh đại diện; `app-redesign-plan.md:486` "nút tăng giảm số câu và
  huy hiệu vẫn tròn".
- Bóng thanh trên: motion §6 "bóng navy dưới thanh"; Figma ẩn lớp "Bóng dưới" ở thanh máy tính (`108:311` hidden) nhưng vẫn hiện ở thanh
  điện thoại (`108:315`).
- `app-redesign-plan.md:5` vẫn ghi "màu nhấn `#2445d6`".
- Khoảng cách: bậc "4, 8, 12, 16, 24, 32, 56, 80, 120" (§3.3) so với lượt unslop "đưa về lưới 4 px" (`app-redesign-plan.md:466,485`); card
  đăng nhập trong Figma có lề 25 và 41.
- Chữ đọc: §3.3 "16 px trở lên, line-height 160–170%"; Figma dùng nhiều `Body/Small` 14 px, 150%. Bricolage dùng cả 700
  (`Display/Card title`) và 800 (GM18 chỉ nhắc 800).

**Sửa:** thêm vào §3.1 một bảng "chỗ lệch đã biết → lấy bên nào", hoặc sửa các tài liệu nguồn trong cùng PR design.

### M15. Con số và đường dẫn nhỏ

- §1 "khoảng 80 khung và 7 overlay": trang App người học có 73 khung tính cả 16 khung overlay (không tính hai section thử font và mẫu nút).
- §5.4 "14 màn tự vẽ `<AppShell>`": có 14 màn feature, cộng `AuthGate` và hai page `complete-profile`, `welcome`, thành 17 chỗ gọi.
- §11 `app/layout.app.tsx:9`: đường dẫn đúng là `app/[locale]/app/layout.app.tsx:9`.
- §10.1 "`/v1/practice/history?date=` đã lọc phiên luyện theo ngày": endpoint lọc **câu trả lời** theo `local_date`, chỉ của phiên
  `kind='practice'` (`history.service.ts:102–104`).
- §7.2 bộ "Wordmet số đo": thiếu `radius/sm` = 6 (đọc được ở `131:3890`).
- §9 M4 "khóa `save`": có ba khóa `save`; khóa cần đổi là `App.addWord.save` (`messages/vi.json:933`).

### M16. Decision record

Theo `~/.claude/rules/decision-records.md`, record có "bảng mọi phương án đã đưa ra kèm trade-off" và được viết "sau khi chốt câu hỏi cuối
cùng". GM7, GM8–GM10, GM12 và GM13 không có bảng phương án (GM13 có hai vòng nhưng không có bảng "có bóng / không bóng"). GM14–GM18 còn
chờ, nên record đang được viết trước khi chốt hết. Luật dự án "chủ dự án trả lời trước": GM8–GM10, GM12 do Claude đề xuất trước. Record
có ghi chủ dự án yêu cầu "theo best practice", nên nói rõ đó là chủ dự án chọn để Claude đề xuất trước (D27 Bước 4). **Sửa:** thêm bảng
phương án cho các mục trên; cập nhật record sau khi GM14–GM18 (và GM19 cho C1, quyết định I8, I9) được chốt.

### M17. Index cho truy vấn tháng

`learning_log` chỉ có index `(user_id, group_id, local_date)` và `(user_id, item_id)` (`learning.prisma:76–77`). Truy vấn "một người,
một khoảng `local_date`, mọi nhóm" chỉ dùng được phần `user_id` của index đầu, rồi lọc toàn bộ log của người đó. `practice_session_items`
đã có `(user_id, local_date)` (`practice.prisma:111`). **Sửa:** thêm migration index `(user_id, local_date)` cho `learning_log`, hoặc ghi
lý do không cần (khối lượng mỗi người nhỏ).

---

## Những gì đã kiểm và đúng

- Token trong bộ nhớ (`session-store.ts:76`), cookie refresh `httpOnly, secure, sameSite strict, path /v1/auth`, không `Domain`
  (`session-transport.ts:13–15`), `credentials: 'include'` (`client.ts:20`).
- `connection()` và `robots` ở `app/[locale]/app/layout.app.tsx:9,13`; `pageExtensions` theo D21 (`next.config.ts:29`,
  `lib/learner-app-flag.ts:14–17`); Lexend ở `app/[locale]/layout.tsx:12`; `messages={null}` (`layout.tsx:44`); `AppIntl` chỉ gửi `App`.
- `lib/legal.ts` đợi 2,5 giây, không cache; JSON-LD `price: '0'`, `priceCurrency: 'USD'`; `robots.ts` chặn `/*/app`; sitemap chỉ `/vi`.
- `GroupCard.tsx:27` bốn nền xoay vòng; `react-aria-components` 1.22.1; `--ease-out-strong` (`globals.css:155`); quy tắc giảm chuyển động
  cuối `globals.css` (0.01ms); `use-reduced-motion.ts` trả `true` ở server; bảng lệch motion §8.3 khớp motion §9.
- `learning.prisma:50–79`, `81–91`; `history.controller.ts:8–35`; `ci.yml:5–6` `on: pull_request` không lọc nhánh đích; regex nhánh ở
  hook dòng 58; `scripts/check-tailwind-raw.mjs` chạy trong `pnpm lint`.
- `next/font` 16.4.3 (`font-data.json`): Noto Sans (`wght`, `wdth`), Bricolage Grotesque (`opsz`, `wdth`, `wght`, 200–800), JetBrains
  Mono (`wght`), cả ba có `vietnamese`. Lưu ý: mặc định `next/font` chỉ tải trục `wght`. Muốn `opsz`, `wdth` của Bricolage phải khai
  `axes`, file sẽ nặng hơn; design nên nói có dùng hay không.
- Route group dùng lại đoạn `practice/` ở nhiều nhóm hợp lệ, miễn đường dẫn cuối khác nhau
  (`docs/01-app/03-api-reference/03-file-conventions/route-groups.md:31`).
- ID khung Figma ở §9 và mọi ID component ở §7.5 khớp file (10 khung công khai, 18 khung đăng nhập, 73 khung app; component đối chiếu
  với `get_metadata` của trang Hệ thống `2:2`). Biến màu Light ở §7.2 và ba bóng Card, Row, Pop khớp Figma.

## Chưa kiểm được và vì sao

- **Cột Dark của §7.2 và bản Dark của bảy màu nhóm:** `get_variable_defs` chỉ trả giá trị của mode đang áp (Light). Đọc mode Dark cần
  `use_figma` (công cụ ghi), không dùng trong review chỉ đọc.
- **Hex bảy màu nhóm, sáu màu ngăn, bóng nút chính trong Figma:** là fill hoặc effect tự đặt, không phải biến. `get_metadata` không có màu;
  `get_design_context` cần skill riêng và trả code lớn, không chạy.
- **Số 19 biến của bộ "Wordmet số đo":** chỉ thấy các biến được dùng trên khung đã đọc (`radius/md`, `button`, `modal`, `pill`, `sm`).
- **Build thật** của cấu trúc route mới, `loading.app.tsx` / `error.app.tsx`, `next/dynamic` trên OpenNext Cloudflare, cỡ Worker: không
  build (cần `cf:docker`, ngoài phạm vi review). Kết luận về các file đặc biệt dựa trên mã `next-app-loader` đã cài, không phải một lần chạy.
- **`route-bundle-stats.json`** có thật được ghi ở build của dự án hay không phụ thuộc bundler mà `next build` và `opennextjs-cloudflare
  build` dùng; chưa chạy.
- **Trang "Motion" và "Ghi chú" của Figma:** không đọc.
- **Hành vi thật của Turnstile `interaction-only`:** ngoài phạm vi, design để chờ chủ dự án.
