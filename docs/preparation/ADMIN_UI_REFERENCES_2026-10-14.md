# Tham khảo giao diện admin (14/10/2026)

Đầu vào cho design Bước 2.5 (`apps/admin`). Số đo lấy bằng `getComputedStyle` / `getBoundingClientRect` trên DOM thật,
trong trình duyệt tích hợp của Claude, viewport 1440×900 (và 390×844 cho mobile), ngày 14/10/2026. Đây là tài liệu
chuẩn bị, không phải quyết định — hướng thiết kế được chốt trong design doc Bước 2.5.

## Trang đã đo

| Nguồn | URL | Vì sao chọn |
|---|---|---|
| shadcn/ui `dashboard-01` | https://ui.shadcn.com/view/new-york-v4/dashboard-01 | Mẫu app shell trên React + Tailwind được dùng rộng rãi; cùng stack với `apps/admin` |
| GitHub (Primer) | https://github.com/vercel/next.js/issues | Sản phẩm lớn, trang danh sách + bộ lọc công khai, không cần đăng nhập |
| Atlassian navigation system | https://atlaskit.atlassian.com/example?groupId=design-system&packageId=navigation-system&exampleId=interactive-layout | Bố cục dùng chung cho Jira/Confluence |
| Stripe Dashboard (trang đăng nhập) | https://dashboard.stripe.com/login | Màn đăng nhập của một dashboard lớn |

Không đo được: Shopify Polaris storybook (trình duyệt từ chối điều hướng; trang `polaris-react` chuyển hướng sang
`shopify.dev`); Tailwind Plus application shells (bắt đăng nhập).

## Số đo

| | shadcn/ui | GitHub | Atlassian | Stripe login |
|---|---|---|---|---|
| Font | Geist | Mona Sans | Atlassian Sans | sohne |
| Cỡ chữ nền UI | 14px (nút, header bảng) | 14px | 14px | — |
| Thanh trên cùng | không có header riêng (tiêu đề trang 16px/500 trong vùng nội dung) | 72px, nền đen | 56px | — |
| Sidebar trái | 288px, viền phải xám nhạt | 256px | 350px (đo cả khung) | — |
| Vùng nội dung | panel trắng bo 14px nằm trên nền | toàn chiều rộng | — | — |
| Hàng bảng | 53px | 88px (danh sách issue 2 dòng) | — | — |
| Nút chính | cao 32px, bo 8px, nền đen | cao 32px, bo 6px, nền xanh lá | — | cao 44px, nền tím |
| Ô nhập | — | lọc cao 30px | — | cao 44px, bo 6px |
| Form đăng nhập | — | — | — | thẻ giữa trang, rộng 412px |

Mobile (shadcn/ui ở 390px): sidebar ẩn, thay bằng nút mở ngăn kéo (drawer) ở đầu trang; các thẻ số liệu xếp thành
một cột.

## Quan sát rút ra

- App nội bộ của các hãng lớn đều dùng chữ nền **14px** và nút/ô nhập **cao ~32px** trên desktop (dày đặc hơn landing
  16px), bo góc nhỏ (**6–8px**).
- Bố cục phổ biến: **sidebar trái 256–288px** + thanh trên cùng mỏng (**56px**) hoặc không có thanh trên.
- Trên mobile, sidebar chuyển thành **drawer** mở bằng nút ở đầu trang.
- Màn đăng nhập: **thẻ giữa trang ~400px**, ô nhập và nút **cao 44px** (vừa ngón tay).

## Token của landing (đọc `apps/web/src/app/globals.css`, 14/10/2026)

Nền `#faf8f5`, mặt `#ffffff`, chữ `#1c1b22`, chữ phụ `#5e5b6b`, viền `#e7e3dc`, chính `#2f5bea`, chính nhạt
`#e8eeff`, thành công `#1f9d55`, nguy hiểm `#d64545`; font Be Vietnam Pro; bo góc `0.5rem`–`1.5rem`.
