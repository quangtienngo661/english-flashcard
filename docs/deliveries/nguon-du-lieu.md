# Trang "Nguồn dữ liệu" công khai — plan tóm tắt (05/11/2026)

Chủ dự án chốt 05/11/2026. Nhánh `feat/data-sources-page`, một PR vào `dev`. Plan chi tiết: bản đã duyệt của chủ dự án (không nằm trong repo).

Vì sao: CEFR-J (bắt trích dẫn), Octanove C1/C2 (CC BY-SA 4.0) và AGID (giữ thông báo bản quyền) bắt ghi nguồn **ở chỗ người dùng thấy được**.
API đã có `GET /v1/sources` công khai nhưng web chưa có trang nào hiện nó, và endpoint trả cả nguồn thử chưa có từ nào.

Quy tắc đã chốt: hệ thống tự quyết nguồn nào hiện, admin không chọn tay. Một nguồn hiện khi có ít nhất một từ người học nhìn thấy được;
nguồn `owner` không bao giờ hiện; nguồn thử chưa publish nghĩa nào thì không hiện. Không nút "ẩn", không migration.

1. API: `GET /v1/sources` chỉ trả nguồn `third_party` đang được dùng cho nội dung người học thấy được; màn admin nhận thêm cờ `shown_to_learners` tính từ cùng một đoạn SQL.
2. Admin: thêm cột "Hiện cho người học" (Có/Không) và một dòng giải thích trên bảng nguồn.
3. Web: trang công khai `/{vi,en}/sources` đọc từ API, và link "Nguồn dữ liệu" ở footer của landing và của app.
4. Tài liệu: file này, một dòng trong `CLAUDE.md`, mục trong `deploy-checklist.md`; kiểm chạy thật trên stack local và ghi output vào as-built.

---

# Trang "Nguồn dữ liệu" công khai — as-built (05/11/2026)

Nhánh `feat/data-sources-page`; commit `feat(api)`, `feat(admin)`, `feat(web)`, rồi `docs` (và một sửa bố cục nhỏ ở web sau lần chạy thật, xem dưới).

## Đã làm

- **API** (`apps/api/src/content/sources/sources.service.ts`): `sourceShownCondition()` là một đoạn SQL (`Prisma.sql`) dùng chung cho `list()` (cột `shown_to_learners`) và `listShown()` (mệnh đề `WHERE` của `GET /v1/sources`), nên hai chỗ không lệch nhau; một test kiểm chuỗi SQL của hai câu chứa cùng đoạn đó. Quy tắc: `kind = 'third_party'` và (có `entry_levels.source_id = ds.id` trên entry `catalog` có sense `open` với `live_revision_id` khác null, **hoặc** là AGID và có `entry_inflections.source = 'library'` trên entry như vậy). `toPublicView` giữ nguyên năm trường. Kiểu mới `AdminSourceView` (chỉ `list()` trả); `create`/`update`/`getSource` không đổi.
- **Admin** (`SourcesPage.tsx`): cột "Hiện cho người học" (Có/Không) và dòng giải thích trên bảng; chuỗi vi/en trong `messages/`. Mock e2e có `shown_to_learners`.
- **Web**: `lib/sources.ts` (`fetchSources`, `null` khi API lỗi hoặc sai hình dạng, `[]` khi API trả rỗng), `components/sections/SourcesList.tsx` (chữ thuần, `white-space: pre-line` cho câu ghi công, link chỉ khi `http(s)`), trang `app/[locale]/(site)/sources/page.tsx` (`force-dynamic`, `noindex` như `terms`, canonical), namespace `Sources` và nhãn footer `sources` trong `messages/{vi,en}.json`, link "Nguồn dữ liệu" ở `SiteFooter.tsx` và `AppFooter.tsx` (thẻ `<a>`). `next.config.ts` và `proxy.ts` không cần đổi: không có danh sách đường dẫn nào, CSP cũ áp cho mọi đường dẫn ngoài `/app`.

## Kiểm tra giả định "`library` là dạng chia lấy từ AGID"

Đọc `inflect.ts`, `inflections.service.ts`, `row-processor.ts`, `inflections-backfill.handler.ts`: mọi dòng `source = 'library'` do `generateInflections` sinh, mà hàm này lấy **mọi dạng AGID** (level 0), chỉ dùng `compromise` cho động từ/danh từ **AGID không có**. Vậy `'library'` gần như luôn là AGID, nhưng không tuyệt đối: một entry chỉ có dạng sinh bởi `compromise` cũng làm AGID hiện. Ruling: chấp nhận (hiện thông báo AGID thừa khi nó không bắt buộc an toàn hơn thiếu; thực tế catalog có hàng nghìn entry dùng AGID). Chi phí nếu sai: AGID hiện sớm hơn cần thiết. Muốn chặt hơn thì phải thêm cột nguồn cho `entry_inflections` (cần migration, ngoài phạm vi).

## Kiểm tra chạy thật (stack Docker riêng `wordmet-sources`, cổng 3200/5373/3201, dựng từ cây làm việc này)

Stack riêng (không đụng stack `english-learning` và `wordmet-review` đang chạy). `pnpm bootstrap`, rồi `pnpm bootstrap seed` (303 nghĩa publish từ `learner-sample.csv`, nguồn "Wordmet learner sample"):

```
== trước seed (DB trống; AGID có sẵn từ migration nhưng chưa có entry nào)
GET /v1/sources -> {"items":[]}
== sau seed
GET /v1/sources -> ["Wordmet learner sample","AGID"]           (không có "owner")
   (183 dòng entry_inflections source=library, 324 reviewed; 303/303 sense open và có live revision)
== bước 2: tạo nguồn "Test 05/11" (POST /v1/admin/content/sources -> 201), chưa có từ nào
GET /v1/sources -> ["Wordmet learner sample","AGID"]           (không có "Test 05/11")
GET /v1/admin/content/sources -> owner: false, Wordmet learner sample: true, AGID: true, Test 05/11: false
== bước 3a: unpublish cả 303 nghĩa (4 lô x POST /v1/admin/content/senses/unpublish, đều 200)
GET /v1/sources -> []                                          (nguồn mẫu và AGID đều biến mất)
GET /v1/admin/content/sources -> cả bốn: false
== bước 3b: publish lại 303 nghĩa (4 lô, outcome "published")
GET /v1/sources -> ["Wordmet learner sample","AGID"]           (hiện lại)
GET /v1/admin/content/sources -> owner false, mẫu true, AGID true, Test 05/11 false
```

Ở admin (đăng nhập thật bằng tài khoản seed): bảng có cột "Shown to learners" với No/Yes/Yes/No cho owner / mẫu / AGID / Test 05/11.
Web: `http://localhost:3201/vi/sources` và `/en/sources` hiện đúng tiêu đề, đoạn giới thiệu, từng nguồn (phiên bản, giấy phép, câu ghi công, link "Trang gốc" cho AGID). Đăng nhập app rồi bấm "Nguồn dữ liệu" ở footer app → `/vi/sources`; footer landing có cùng link (ảnh bên dưới). Ảnh: [`nguon-du-lieu/sources-vi.png`](nguon-du-lieu/sources-vi.png), [`sources-en.png`](nguon-du-lieu/sources-en.png), [`sources-vi-mobile.png`](nguon-du-lieu/sources-vi-mobile.png).

Lần chạy thật bắt được một lỗi bố cục mà test không bắt: giấy phép của AGID là cả một đoạn, và chữ "Giấy phép" bị bóp thành hai dòng cạnh đoạn đó. Đã sửa thành nhãn rồi giá trị chạy liền (`SourcesList.tsx`), chụp lại ảnh sau khi sửa.

## Kết quả lệnh

- `apps/api`: `pnpm exec tsc --noEmit` sạch; `pnpm lint` chỉ còn hai warning có sẵn (`mail-dispatcher.service.ts`, `account-deletion.service.ts`), không thuộc thay đổi này; `pnpm test`: 331 file, 4673 test pass.
- `apps/admin`: `pnpm lint`, `pnpm typecheck` sạch; `pnpm test`: 1389 pass, 2 fail (`ReportsPage.test.tsx`, `AiConfigsPage.test.tsx`) lúc máy đang bận build Docker; chạy riêng hai file đó: 61/61 pass (lỗi do tải, không liên quan thay đổi).
- `apps/web`: `pnpm lint`, `pnpm typecheck` sạch; `pnpm test`: 90 file, 905 test pass (trước sửa bố cục); sau sửa chạy lại `src/components/sections` và `src/lib/sources.test.ts`: 23 pass. E2E trong container `pnpm cf:docker`: 365 pass, 33 skipped, 0 fail (có a11y `/vi/sources` sáng/tối, footer → trang nguồn vi/en không API, `/en/sources` trả 200 không redirect).
- Chưa chạy: e2e admin (`pnpm test:e2e`, mock API) và `admin-e2e-real`; chỉ đổi mock và thêm một assertion ở `e2e/sources.spec.ts`, để CI chạy.

## Không làm (theo plan)

Nút ẩn, chọn nguồn bằng tay, migration; màn nguồn trong Cài đặt của app; đổi API tạo/sửa/xóa nguồn. **Không sửa văn bản pháp lý:** câu trỏ từ Điều khoản sang trang nguồn là việc của chủ dự án, ở bản nháp `docs/preparation/legal-drafts/` trên nhánh `docs/web-launch-research`.
