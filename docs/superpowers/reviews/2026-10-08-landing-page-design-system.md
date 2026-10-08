# Design system audit — token `apps/web` so với Figma (Task 3)

Ngày 08/10/2026. Làm theo skill `design:design-system` (chế độ audit; skill chưa được tải trong phiên nên trợ lý đọc
`SKILL.md` và làm theo). So `apps/web/src/app/globals.css` với Figma
https://www.figma.com/design/NVyO0njIAcOUTAl85a1Xdx (đọc bằng script chỉ đọc).

## Tóm tắt

| Nhóm | Figma | Code | Ghi chú |
|---|---|---|---|
| Màu | 12 biến trong collection `Landing tokens` | 15 token | 12 khớp đúng giá trị. Code thêm `success-strong` #147A3A, `danger-strong` #B42318, `border-strong` #8A8697 (WCAG, spec §6.2) |
| Cỡ chữ | Không có biến (đo được 13–60px) | 13 token rem, 3 token `clamp()` | Lấy từ số đo, spec §6.1 |
| Bo góc | Không có biến (8, 10, 12, 14, 16, 20, 24, 999) | 6 token rem | 10px của Figma gộp vào `control` (12px) |
| Khoảng cách | Không có biến (bội của 2px) | Thang `--spacing` mặc định của Tailwind | Đủ mọi giá trị |
| Bóng | Không có style | 2 token | Theo hai bóng trên Figma |
| Chuyển động | Không có | 4 thời lượng + 1 easing | Theo prototype (0.25–0.45s) |

## Đặt tên

| Vấn đề | Đề xuất |
|---|---|
| Figma đặt tên kiểu camelCase (`color/primarySoft`, `color/onPrimary`, `color/successSoft`); code dùng kebab-case (`primary-soft`) vì Tailwind sinh class từ tên | Giữ kebab-case trong code. Nếu sau này đồng bộ token hai chiều thì đổi tên biến Figma theo code |

## Giá trị viết cứng trên Figma

Trang VI desktop: 267 fill/stroke gắn biến, **4 không gắn** (2 khung `#FFFFFF`, 2 vector icon `#1C1B22`, tức nút ‹ › của
carousel). Không ảnh hưởng code, vì code chỉ dùng token.

## Việc nên làm (đề xuất, chưa làm)

1. Thêm 3 màu `*-strong` vào biến Figma, để mockup khớp code (đã nêu trong spec §12 là việc trên Figma).
2. Nếu muốn Figma là nguồn token, tạo biến cho cỡ chữ, bo góc và khoảng cách theo bảng ở spec §6.1.
3. Gắn biến cho 4 paint đang viết cứng.
