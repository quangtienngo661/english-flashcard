# Icon web và admin theo logo mới — as-built (14/11/2026)

Logo mới (chữ "w" nét tròn navy `#041349` + chấm xanh `#1250FC`) thay icon cũ (khối vàng với hai gạch) ở web và admin. Chữ "wordmet." trên header không đổi.

## Nguồn và cách tạo

- Nguồn: PNG 1254×1254 trong suốt do chủ dự án gửi. Màu lấy từ pixel của file: navy `#041349`, xanh `#1250FC`.
- Hình học: vùng có logo là 816×403 px, nên icon vuông có lề trắng. Hai nhóm lề: favicon cắt sát (logo chiếm 90% chiều rộng, nền trắng bo góc 20%) để chữ w và chấm vẫn đọc được ở 16 px; apple-touch và manifest chừa lề rộng hơn (logo chiếm 72%, nền trắng vuông, để hệ điều hành tự bo).
- SVG dựng bằng cách trace (`potrace`) hai màu từ PNG, một path navy và một path xanh. Mọi cỡ PNG render từ SVG đó bằng `sharp`. Không có script trong repo: muốn đổi logo thì tạo lại từ file gốc theo cách trên.

## Web (`apps/web`)

| File | Dùng cho |
|---|---|
| `src/app/icon.svg` | favicon vector, cũng là `logo` trong JSON-LD Organization |
| `src/app/favicon.ico` | 16, 32, 48 px (trình duyệt cũ, thanh tab khi SVG không dùng được) |
| `src/app/apple-icon.png` | 180 px, thay `apple-icon.tsx` (route sinh ảnh động bị bỏ) |
| `public/icon-192.png`, `public/icon-512.png` | icon trong `manifest.webmanifest` |

`src/app/manifest.ts` trỏ tới `/icon.svg`, `/apple-icon.png`, `/icon-192.png`, `/icon-512.png`. Next tự thêm các thẻ `<link rel="icon">` và `apple-touch-icon` từ file quy ước; `layout.tsx` không đổi.

## Admin (`apps/admin`)

`public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png`, khai trong `index.html`. Admin chưa có manifest nên không có icon 192/512.

## Đã kiểm

- `pnpm lint`, `pnpm typecheck` của web và admin qua. Admin build với env giả hợp lệ: `dist/` có đủ ba file icon và ba thẻ `<link>` trong `index.html`.
- `pnpm test` của web: 1162/1163 qua; `order-return.test.tsx` đỏ một lần khi cả bộ chạy cùng lúc (377 s) và qua 14/14 khi chạy riêng. Không liên quan icon (file không đụng tới).
- Dev server trong Docker (`pnpm cf:docker --dev-app`, :3001): `/favicon.ico`, `/icon.svg`, `/apple-icon.png`, `/icon-192.png`, `/icon-512.png`, `/manifest.webmanifest` đều 200 đúng content-type. Trình duyệt tải được cả ba thẻ `<link>`: ico 48×48, svg, apple 180×180.
- Ảnh `web-logo-icons-tab.png`: ghép từ chính các file server trả về (`/icon.svg` ở 32 và 16 px, nền tab sáng và tối, và `apple-icon.png`). Pane trình duyệt không có thanh tab nên đây không phải ảnh chụp thanh tab thật.

## Chưa kiểm

- Thanh tab của Chrome/Safari thật, icon thêm vào màn hình chính trên iPhone và Android: chỉ kiểm được sau khi deploy.
- Build OpenNext/Cloudflare (`pnpm cf:docker --build`) chưa chạy: CI không chạy bước này; `public/` là thư mục mới của web, nên kiểm sau khi deploy rằng `/icon-192.png` trả 200 từ `wordmet.com`.

## Đưa lên production

1. PR này vào `dev` (CI xanh), rồi merge theo yêu cầu của chủ dự án.
2. Web: chỉ lên production qua PR `dev` → `main` (chủ dự án yêu cầu mở). `deploy-web.yml` tự deploy khi push `main` (`WEB_DEPLOY_PAUSED=false`); có thể chạy tay workflow đó.
3. Admin: deploy tay, `deploy/README.md` mục "Admin web (by hand)":
   ```
   cd apps/admin
   VITE_API_BASE_URL=https://admin-api.wordmet.com VITE_TURNSTILE_SITE_KEY=<site key> pnpm build && pnpm exec wrangler deploy
   ```
4. Sau deploy: `curl -I https://wordmet.com/favicon.ico`, `/icon.svg`, `/apple-icon.png`, `/icon-192.png`, `/icon-512.png` đều 200; tương tự `https://admin.wordmet.com/favicon.svg` (xem tên miền admin ở `apps/admin/wrangler.jsonc`).
5. Cache: trình duyệt giữ favicon rất lâu, nên tab cũ vẫn hiện icon vàng tới khi Ctrl+Shift+R hoặc đóng mở lại. iPhone lưu icon lúc thêm vào màn hình chính: xóa rồi thêm lại để thấy icon mới.
6. Rollback web: revert PR rồi deploy lại; admin: `pnpm exec wrangler rollback --name wordmet-admin` (trong `apps/admin`).
