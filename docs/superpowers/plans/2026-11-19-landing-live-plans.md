# Landing đọc giá, số phiên và FAQ từ admin mỗi lượt xem: plan

> For agentic workers: Native execution (superpowers:executing-plans). Steps use checkbox (`- [ ]`) syntax.

**Goal:** giá Pro, số phiên luyện mỗi ngày của Free và Pro, và FAQ trên landing đổi theo admin mà không cần deploy lại.

**Architecture:** landing vẫn là trang dựng sẵn với số đọc lúc build (như hiện tại). Sau khi tải, trình duyệt đọc
`GET /v1/public/prices` và `GET /v1/public/faq`; đọc được thì thay giá, số phiên và FAQ. Đọc lỗi thì giữ số lúc build.
JSON-LD giữ số lúc build.

**Tech stack:** NestJS (API), Next 16 App Router trên OpenNext/Cloudflare, Vitest, Playwright.

**Quyết định (chủ dự án chốt 19/11/2026, theo đề xuất):**

| # | Quyết định | Chọn |
|---|---|---|
| Q1 | Ai đọc API | Trình duyệt, sau khi tải trang; trang vẫn dựng sẵn |
| Q2 | API cho số phiên | Thêm `practice_sessions_per_day: { free, pro }` vào `GET /v1/public/prices` (chỉ thêm trường) |
| Q3 | FAQ | Đọc lại cùng lúc với giá |
| Q4 | JSON-LD | Giữ số lúc build |

Giữ nguyên (chủ dự án 19/11/2026): các dòng về AI, khoảng ôn, "Câu 4/20".

## Global constraints

- Additive-only trong `/v1`: không đổi hay bỏ trường cũ của `/v1/public/prices`.
- `/vi` và `/en` vẫn prerender (`pnpm assert:render-mode` phải qua).
- FAQ tiếng Anh vẫn là `LANDING_FAQ_EN` cố định (API chỉ có FAQ tiếng Việt); bản `en` không đọc lại FAQ.
- Không request nào khi build không có API (`NEXT_PUBLIC_API_BASE_URL` trống): landing chỉ dùng số lúc build.
- Không thêm thư viện.

## Review focus

1. API trả giá hoặc FAQ sai hình dạng (thiếu kỳ, giá ≤ 0, FAQ không phải mảng) → giữ số lúc build cho phần đó, không vỡ trang.
2. API chậm hoặc lỗi mạng → không lỗi hiện ra, không chờ chặn trang; e2e không thấy lỗi console mới.
3. FAQ trên API rỗng (admin ẩn hết) → mục FAQ biến mất, như lúc build rỗng.
4. Số phiên 0 hoặc thiếu trong phản hồi cũ (API chưa deploy) → giữ số lúc build.
5. Locale `en`: số phiên và giá đổi theo API, FAQ thì không.

---

### Task 1: API trả số phiên trong `/v1/public/prices`

**Files:** `apps/api/src/settings/public-prices.controller.ts`, `.spec.ts`

- [ ] Test đỏ: `prices()` trả `practice_sessions_per_day: { free: 3, pro: 30 }` với cài đặt mặc định, và `{ free: 5, pro: 40 }`
      khi cài đặt là 5 và 40; `currency` và `prices` không đổi.
- [ ] Code: thêm trường vào `PublicPrices` và phản hồi, lấy từ `freePracticeSessionsPerDay`, `proPracticeSessionsPerDay`.
- [ ] `npx vitest run src/settings`, `npx tsc --noEmit`, `pnpm lint` qua. Commit test, rồi commit code.

### Task 2: dữ liệu landing có số phiên (build và dự phòng)

**Files:** `apps/web/src/site/landing/landing-data.ts`, `landing-data.fallback.ts`, `landing-data.test.ts`,
`apps/web/scripts/read-landing-data.mjs` (+ test của nó)

- [ ] Test đỏ: `parseLandingData` nhận `sessions: { free, pro }` (số nguyên > 0); thiếu hay sai thì dùng `{ free: 3, pro: 30 }` của
      bản dự phòng mà vẫn giữ giá và FAQ đọc được; script build ghi `sessions` từ `practice_sessions_per_day`.
- [ ] Code: `LandingData` thêm `sessions: { free: number; pro: number }`; bản dự phòng `{ free: 3, pro: 30 }`.
- [ ] Commit.

### Task 3: số phiên trong bảng giá là biến

**Files:** `apps/web/messages/vi.json`, `en.json`, `src/site/landing/PricingSection.tsx`, `landing.test.tsx`

- [ ] Test đỏ: với `sessions { free: 5, pro: 40 }` bảng giá hiện "5 phiên luyện mỗi ngày" và "40 phiên luyện mỗi ngày" (và bản en).
- [ ] Code: `freeList[2]`, `proList[0]` thành `{count} phiên luyện mỗi ngày`; `PricingSection` nhận `sessions` và điền bằng `fill`
      với số định dạng theo locale.
- [ ] Commit.

### Task 4: trình duyệt đọc lại sau khi tải

**Files:** mới `apps/web/src/site/landing/use-live-landing-data.ts` (+ test), mới `LandingLive.tsx` (`'use client'`, bọc
`PricingSection` và `FaqSection`), `HomePage.tsx`

- [ ] Test đỏ (hook, `fetch` giả):
  - API trả giá, số phiên, FAQ hợp lệ → dữ liệu đổi sang số API;
  - một trong hai request lỗi hoặc sai hình dạng → phần đó giữ số lúc build;
  - không có `NEXT_PUBLIC_API_BASE_URL` → không gọi `fetch`;
  - locale `en` → không đọc FAQ.
- [ ] Code: hook gọi hai endpoint song song một lần khi mount (`AbortController` khi unmount), kiểm hình dạng bằng
      `parseLandingData` hoặc các hàm kiểm đã có; `LandingLive` render bảng giá và FAQ từ dữ liệu đó.
- [ ] `pnpm lint` (cả `check-tailwind-raw`), `pnpm typecheck`, `pnpm test` qua. Commit.

### Task 5: kiểm thật và đóng

- [ ] `pnpm build` rồi `pnpm assert:render-mode`: `/vi`, `/en` vẫn prerender.
- [ ] `pnpm bootstrap`: đổi giá và số phiên Pro trong admin, tải lại landing; số mới hiện ra mà không build lại. Chụp màn hình.
- [ ] Ghi as-built ngắn vào `docs/deliveries/landing-live-plans.md`. Mở PR vào `dev` bằng `ship-pr`.
