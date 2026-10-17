# Wordmet Landing Page — UI/UX Optimization Context & Implementation Guide

> **Mục đích tài liệu:** Cung cấp bối cảnh toàn diện, kết quả kiểm toán (audit) thiết kế hiện tại, cùng các giải pháp và chỉ dẫn chi tiết để AI / Developer tiếp nhận và thực thi các cải tiến về **Bố cục (Layout)**, **Phong cách (Style)** và **Tỷ lệ chuyển đổi (UX/CRO)** cho Landing Page Wordmet (`apps/web`).

---

## 1. Tổng quan Dự án & Kiến trúc Kỹ thuật (`apps/web`)

### 1.1. Sản phẩm & Định vị
* **Tên sản phẩm:** Wordmet (`_ _ Wordmet`).
* **Định vị:** Ứng dụng học từ vựng tiếng Anh theo ngữ cảnh thực tế (câu đã đọc, cloze test, spaced repetition, giải thích ngữ cảnh bằng AI).
* **Mục tiêu landing page hiện tại:** Giới thiệu giá trị cốt lõi (*"Lưu từ thì dễ, Dùng được mới khó"*) và thu thập danh sách chờ (Waitlist) trước khi mở phiên bản Beta.

### 1.2. Tech Stack & Ràng buộc cốt lõi
* **Framework:** Next.js `16.3.8` (App Router, Static Prerendering), React 19.
* **Đa ngôn ngữ:** `next-intl` `4.14.9` (hỗ trợ `vi` và `en`, đường dẫn `/[locale]`, key trong `apps/web/messages/{vi,en}.json` phải luôn đồng bộ 100%).
* **Styling:** Tailwind CSS v4 (`apps/web/src/app/globals.css`), bộ token từ Figma `Landing tokens`.
* **Deployment target:** Cloudflare Workers (`@opennextjs/cloudflare` + Cloudflare D1 cho bảng waitlist).
* **Tiêu chuẩn chất lượng:**
  * WCAG 2.1/2.2 AA (độ tương phản màu, vòng focus, aria tags, kích thước touch target ≥ 44px).
  * Hỗ trợ No-JS cơ bản (Form waitlist chạy qua HTML `<form action>`, FAQ dùng native `<details>`).
  * Tuân thủ quy tắc kiểm tra Tailwind raw colors (`scripts/check-tailwind-raw.mjs`).

### 1.3. Bản đồ File quan trọng
```
apps/web/
├── messages/
│   ├── vi.json                     # Bản dịch tiếng Việt
│   └── en.json                     # Bản dịch tiếng Anh (phải khớp 100% key với vi.json)
├── src/
│   ├── app/
│   │   ├── globals.css             # Theme tokens, font variables, utility classes
│   │   └── [locale]/
│   │       ├── layout.tsx          # Root layout đa ngôn ngữ (Header + Main + Footer)
│   │       └── page.tsx            # Trang chủ kết hợp các section
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SiteHeader.tsx      # Header điều hướng + chuyển ngôn ngữ
│   │   │   ├── SiteFooter.tsx      # Footer chân trang
│   │   │   └── Logo.tsx            # Logo Wordmet
│   │   ├── sections/
│   │   │   ├── Hero.tsx            # Hero section (H1, ClozeCarousel, WaitlistForm)
│   │   │   ├── Problem.tsx         # Vấn đề so sánh: Flashcard cũ vs Wordmet
│   │   │   ├── HowItWorks.tsx      # 3 bước: Lưu từ, Luyện câu, Ôn đúng lúc
│   │   │   ├── AiPractice.tsx      # Luyện thêm với AI & minh họa giải thích
│   │   │   ├── Plans.tsx           # Bảng so sánh 2 gói học: Miễn phí & Trải nghiệm AI
│   │   │   ├── Faq.tsx             # Câu hỏi thường gặp (<details>)
│   │   │   └── FinalCta.tsx        # Dải banner kêu gọi hành động cuối trang
│   │   ├── interactive/
│   │   │   ├── WaitlistForm.tsx    # Client form đăng ký waitlist
│   │   │   ├── Flashcard.tsx       # Thẻ lật từ vựng ở section Problem
│   │   │   └── cloze/              # Widget tương tác bài tập điền từ Hero
│   │   └── ui/                     # Button, Chip, Icon, Container, Section, SectionHeading
```

---

## 2. Kết quả Kiểm toán Hiện trạng (Audit Findings)

### 2.1. Bố cục & Phân cấp Thị giác (Layout & Visual Hierarchy)
1. **Header thiếu CTA:** Hiện tại header chỉ có Logo, 2 link điều hướng (`#how-it-works`, `#faq`) và nút chuyển `VI | EN`. Thiếu một nút hành động trực tiếp (*"Nhận thông báo"* hoặc *"Đăng ký sớm"*) để chuyển đổi người dùng khi họ lướt ở bất kỳ vị trí nào trên trang.
2. **Mobile Hero bị trễ chuyển đổi (Below the fold):** 
   * Trên màn hình điện thoại (390px), thứ tự render là: `Badge ➔ H1 ➔ ClozeCarousel (rất cao) ➔ Mô tả ➔ Form email`.
   * Form email bị đẩy xuống dưới hơn 800px, người dùng điện thoại không nhìn thấy ô đăng ký ngay trong màn hình đầu tiên nếu không cuộn nhiều lượt.
3. **Mất cân đối khối thị giác ở Section "Vấn đề" (Problem):**
   * Cột trái (Flashcard cũ): 1 flashcard lật nằm lọt thỏm giữa khoảng trống lớn.
   * Cột phải (Wordmet): 3 câu văn bản khá dài. Hai cột thiếu sự tương đồng về nhịp điệu và độ đầy đặn.
4. **Section "Cách hoạt động" (How it works) bị đứt gãy luồng đọc:**
   * Thứ tự phần tử trong mỗi card hiện tại: `[UI Demo] ➔ [Huy hiệu số 1, 2, 3] ➔ [Tiêu đề bước] ➔ [Mô tả]`.
   * Huy hiệu số 1, 2, 3 nằm lơ lửng ở giữa giao diện demo và tiêu đề gây khó hiểu về thị giác. Thứ tự đọc tự nhiên của người dùng là: `Số bước/Tiêu đề ➔ Mô tả ➔ Hình ảnh/UI minh họa`.
5. **Section "Gói học" (Plans) thiếu điểm chốt hành động:**
   * Hai card liệt kê tính năng nhưng không hề có nút CTA (*"Bắt đầu miễn phí"* hoặc *"Đăng ký danh sách chờ"*). Người đọc xem xong gói cước không có hành động tiếp theo.

### 2.2. Phong cách, Màu sắc & Độ sâu (Style & Visual Depth)
1. **Thiếu nhịp điệu tương phản giữa các Section (Contrast Rhythm):**
   * Các section chỉ xen kẽ giữa nền kem rất nhạt (`#faf8f5`) và nền trắng (`#ffffff`). Độ tương phản quá thấp khiến toàn bộ trang tạo cảm giác như một dải trắng xám đơn điệu kéo dài, chỉ có duy nhất khối Final CTA cuối trang là có màu xanh đậm `#2f5bea`.
2. **Cảm giác giao diện còn "phẳng" (Flat & Wireframe-like):**
   * Các khối tương tác quan trọng như widget bài tập `ClozeCarousel` ở Hero và card mẫu giải thích AI thiếu chiều sâu thị giác (layered shadows, viền mượt), chưa tạo được cảm giác như một sản phẩm ứng dụng thật đang sống động trên trang.
3. **Thiếu yếu tố Bằng chứng xã hội (Social Proof):**
   * Không có số lượng người đã đăng ký (ví dụ: *"Hơn 300+ người học đã đăng ký"*), không có feedback người dùng thử nghiệm sớm, thiếu cảm giác cộng đồng và độ uy tín (trust signals).

### 2.3. Trải nghiệm Người dùng & Tỷ lệ Chuyển đổi (UX & CRO)
1. **Ma sát lớn ở Form Waitlist:**
   * Form bắt buộc người dùng vừa điền email, vừa phải tự tay tick vào checkbox *"Tôi đồng ý với Chính sách bảo mật"*.
   * Trong giai đoạn thu thập waitlist miễn phí (chưa thanh toán, chưa tạo tài khoản), checkbox bắt buộc làm tăng tỷ lệ bỏ dở (drop-off) từ 15%–25%.
   * Chuẩn ngành: Đặt dòng chú thích nhỏ bên dưới nút: *"Bằng cách đăng ký, bạn đồng ý với [Chính sách bảo mật]"* mà không cần tick thủ công.
2. **Micro-copy ở nút CTA chưa tạo đủ động lực:**
   * Nút *"Nhận thông báo ra mắt"* mang tính thụ động.
   * Cần nâng cấp thành: *"Tham gia danh sách chờ"* hoặc *"Nhận quyền truy cập sớm"* kèm ưu đãi ngầm: *"Tặng 1 tháng trải nghiệm AI Pro khi ra mắt"*.

---

## 3. Các Mục tiêu Cải tiến (Design & UX Goals)

| Tiêu chí | Mục tiêu cụ thể |
| :--- | :--- |
| **Tối ưu CRO** | Giảm ma sát form đăng ký xuống mức tối thiểu (chỉ 1 input email + 1 nút click, disclaimer inline). |
| **Mobile First Fold** | Đảm bảo người dùng mobile nhìn thấy CTA / lối tắt đăng ký ngay ở màn hình đầu tiên (Above the fold). |
| **Thẩm mỹ & Độ sâu** | Tăng chiều sâu (soft layered shadows), tinh chỉnh tương phản nền các section để tạo nhịp điệu đọc hấp dẫn. |
| **Luồng đọc chuẩn xác** | Chuẩn hóa cấu trúc card (How it works: Header ➔ Description ➔ Visual Demo; Plans: Thêm CTA buttons). |
| **Bảo toàn Kỹ thuật** | Giữ vững 100% WCAG AA, Static Prerendering, hỗ trợ No-JS, đồng bộ song ngữ `vi` và `en`. |

---

## 4. Chi tiết Các Hạng mục Triển khai (Action Items)

### 🔹 Hạng mục 1: Thêm CTA vào Header (`SiteHeader.tsx`)
* **Mô tả:** Thêm nút CTA thứ cấp hoặc sơ cấp ở góc phải SiteHeader trên desktop (và dạng compact trên mobile nếu phù hợp).
* **Hành vi:** Nhấp vào nút sẽ cuộn mượt (`scroll-behavior: smooth`) tới form `#waitlist-hero` hoặc `#waitlist-cta`.
* **File liên quan:**
  * `apps/web/src/components/layout/SiteHeader.tsx`
  * `apps/web/messages/vi.json` (thêm key `Nav.cta`)
  * `apps/web/messages/en.json` (thêm key `Nav.cta`)

### 🔹 Hạng mục 2: Tối ưu Bố cục Hero trên Mobile (`Hero.tsx`)
* **Mô tả:** Điều chỉnh thứ tự grid/flex trên mobile để nội dung chuyển đổi không bị chôn sâu.
* **Giải pháp đề xuất:**
  * Giữ layout 2 cột trên desktop (`lg:grid-cols-2`).
  * Trên mobile: Đặt khối Title + Description + Nút tắt hoặc Form lên trước, sau đó mới đến widget `ClozeCarousel`. Hoặc giữ vị trí hiện tại nhưng bổ sung một nút bấm nhỏ "Đăng ký nhận vé sớm ↓" ngay dưới Title trên mobile dẫn thẳng xuống form.
* **File liên quan:**
  * `apps/web/src/components/sections/Hero.tsx`

### 🔹 Hạng mục 3: Giảm Ma sát Form Waitlist (`WaitlistForm.tsx`)
* **Mô tả:** Đơn giản hóa form đăng ký để tối đa hóa tỷ lệ điền form (Conversion Rate).
* **Giải pháp đề xuất:**
  * Bỏ thuộc tính bắt buộc tick checkbox `consent`.
  * Thay thế bằng văn bản consent tĩnh dưới nút Submit: `Bằng cách đăng ký, bạn đồng ý với Chính sách bảo mật của chúng tôi.`
  * Nâng cấp micro-copy của nút:
    * VI: *"Nhận quyền truy cập sớm"* hoặc *"Tham gia danh sách chờ"*
    * EN: *"Get early access"* hoặc *"Join waitlist"*
* **File liên quan:**
  * `apps/web/src/components/interactive/WaitlistForm.tsx`
  * `apps/web/src/features/waitlist/actions.ts` (bỏ điều kiện bắt buộc `missing_consent` nếu chuyển sang inline notice)
  * `apps/web/src/features/waitlist/labels.ts`
  * `apps/web/messages/vi.json` & `en.json`

### 🔹 Hạng mục 4: Cân bằng Trực quan Section "Vấn đề" (`Problem.tsx`)
* **Mô tả:** Làm nổi bật sự tương phản giữa cách học truyền thống kém hiệu quả và phương pháp học ngữ cảnh của Wordmet.
* **Giải pháp đề xuất:**
  * Card Flashcard cũ: Bổ sung thêm nhãn cảnh báo trực quan (ví dụ: icon dấu chấm than hoặc tag `Học vẹt · Khó áp dụng`), cân đối chiều cao với cột phải.
  * Card Wordmet: Sử dụng nền nhẹ nổi bật (soft highlight / subtle border glow), thêm badge `Đề xuất · Học trong ngữ cảnh` để làm bật giải pháp vượt trội.
* **File liên quan:**
  * `apps/web/src/components/sections/Problem.tsx`
  * `apps/web/messages/vi.json` & `en.json`

### 🔹 Hạng mục 5: Tái cấu trúc Luồng Đọc Section "Cách hoạt động" (`HowItWorks.tsx`)
* **Mô tả:** Đưa số thứ tự bước và tiêu đề lên phần trên cùng của mỗi card.
* **Giải pháp đề xuất:**
  * Cấu trúc mỗi `StepCard`:
    1. **Top header:** Huy hiệu số bước (`1`, `2`, `3`) đi liền với `h3` Tiêu đề bước.
    2. **Body:** Mô tả ngắn gọn cách thức hoạt động.
    3. **Bottom visual:** Khung UI mô phỏng (form lưu từ, câu điền khuyết, bảng spaced repetition) đặt ở chân card.
* **File liên quan:**
  * `apps/web/src/components/sections/HowItWorks.tsx`

### 🔹 Hạng mục 6: Bổ sung CTA cho Section "Gói học" (`Plans.tsx`)
* **Mô tả:** Bổ sung nút hành động rõ ràng dưới mỗi gói học để người dùng có thể nhấp đăng ký ngay khi đang cân nhắc tính năng.
* **Giải pháp đề xuất:**
  * Thêm nút CTA ở chân mỗi card:
    * Gói Miễn phí: *"Đăng ký gói Miễn phí"* (Anchor link cuộn về form waitlist).
    * Gói Trải nghiệm AI: *"Đăng ký dùng thử AI"* (Anchor link cuộn về form waitlist, có style primary nổi bật).
  * Thêm badge nổi bật cho gói Trải nghiệm AI: `Khuyên dùng` hoặc `Tặng kèm khi ra mắt`.
* **File liên quan:**
  * `apps/web/src/components/sections/Plans.tsx`
  * `apps/web/messages/vi.json` & `en.json`

### 🔹 Hạng mục 7: Nâng cấp Nhịp điệu Màu nền & Chiều sâu Thị giác (`globals.css`)
* **Mô tả:** Tạo chiều sâu và điểm ngắt thị giác khi cuộn qua các section.
* **Giải pháp đề xuất:**
  * Bổ sung token bóng đổ nhiều tầng:
    ```css
    --shadow-feature-card: 0 20px 40px -15px rgba(28, 27, 34, 0.08), 0 0 1px rgba(28, 27, 34, 0.1);
    --shadow-accent-glow: 0 12px 32px -8px rgba(47, 91, 234, 0.18);
    ```
  * Áp dụng đổ bóng mềm mại cho widget `ClozeCarousel` ở Hero và card AI Practice.
  * Tinh chỉnh màu nền xen kẽ: Giữ `#faf8f5` cho Hero và HowItWorks; áp dụng nền trắng `#ffffff` có subtle border cho Problem; áp dụng màu nền `bg-[#f5f7fc]` (tone xanh nhẹ) cho Section AI Practice để tạo điểm nhấn công nghệ.

---

## 5. Quy tắc Kiểm tra & Bàn giao (Verification Checklist)

Bất kỳ AI hoặc kỹ sư nào thực hiện các sửa đổi trên phải kiểm tra qua các bước sau trước khi hoàn tất:

1. **Đồng bộ song ngữ i18n:**
   ```bash
   pnpm --filter web test src/i18n/messages.test.ts
   ```
   *Đảm bảo 100% key ở `vi.json` và `en.json` trùng khớp và không có key rỗng.*
2. **Kiểm tra cú pháp Tailwind & CSS raw:**
   ```bash
   pnpm --filter web lint
   ```
   *Đảm bảo không dùng mã màu viết cứng không qua token trong `globals.css`.*
3. **Kiểm tra Unit & Component Test:**
   ```bash
   pnpm --filter web test
   ```
4. **Kiểm tra Build tĩnh & Prerender manifest:**
   ```bash
   pnpm --filter web build
   pnpm --filter web assert:static
   ```
5. **Kiểm tra Accessibility (WCAG 2.1 AA):**
   * Mọi nút bấm, link mới đều có nhãn đọc rõ ràng (`aria-label` hoặc visible text).
   * Vòng focus (`focus-visible`) không bị mất trên các nút hoặc input mới.
   * Màu chữ trên nền mới đáp ứng tỉ lệ tương phản tối thiểu 4.5:1.
