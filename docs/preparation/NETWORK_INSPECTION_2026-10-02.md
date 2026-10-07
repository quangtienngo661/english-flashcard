# Quan sát Network của các trang từ điển

Ngày quan sát: 02/10/2026. Mục tiêu: học cách trình duyệt tải nội dung, tìm kiếm, asset và phát âm để tham khảo cho V1. Đây là quan sát một số phiên truy cập công khai; không phải benchmark, khảo sát hạ tầng nội bộ hay spec cho app.

## Kết quả chính và giới hạn

| Trang | Kết quả phiên đã thử | Có thể kết luận |
| --- | --- | --- |
| [Cambridge — technology](https://dictionary.cambridge.org/dictionary/english/technology) | Phiên Chrome tự động và in-app browser đều gặp trang Cloudflare; Chrome nhận 403 sau redirect. | Chỉ thấy request xác minh chống bot. Chưa biết trang từ điển thật fetch nội dung, audio hoặc autocomplete ra sao. |
| [Longman — technology](https://www.ldoceonline.com/dictionary/technology) | Trang tải 200; sau từ chối cookie tùy chọn, phát âm và tìm marketing hoạt động. | Có log HTML, asset, autocomplete, audio và chuỗi điều hướng search. |
| [Wiktionary — technology](https://en.wiktionary.org/wiki/technology) | Trang tải 200; gõ marketing phát sinh request gợi ý tìm kiếm. | Có log HTML, module JS/CSS, API phụ trợ, search và cache header. |
| Merriam-Webster / WordReference | Lần thử nhận 403; Merriam-Webster hiển thị Cloudflare. | Không phân tích các request đó như luồng từ điển thật. |

## Longman: nội dung chính và request khi tương tác

1. `GET /dictionary/technology` trả `text/html` với phần định nghĩa ngay trong HTTP response, không phải đợi một API JSON riêng mới có nội dung. Điều này chứng minh HTML có sẵn nội dung; chưa phân biệt render động, pre-render hay cache ở server.
2. Asset chung gồm `common.css`, `common.js`, jQuery, font, logo và ảnh. Nhiều URL dùng `?version=1.2.93`; header quan sát được là `Cache-Control: max-age=2592000` (30 ngày). HTML được nén gzip. Không thấy `Cache-Control` trong các response HTML và autocomplete đã ghi; không suy ra chúng hoàn toàn không có cache ở mọi tầng.
3. Khi gõ marketing: `GET /autocomplete/english/?q=marketing&contentType=...` trả 200 bằng XHR. Header ghi `text/javascript;charset=UTF-8`; chưa kiểm tra payload nên không gọi nó là API JSON thuần chỉ dựa vào tên query. Lượt thử sau đóng consent ghi một request; lượt trước ghi hai request. Chưa có đủ phép đo để kết luận cách debounce hoặc nguyên nhân request lặp.
4. Khi bấm phát âm UK: `GET /media/english/breProns/technology0205.mp3?version=1.2.93` xuất hiện, type `media`, `audio/mpeg`, status `206`, cache 30 ngày. MP3 này không xuất hiện trong lượt tải trang trước bấm. `206` là response một phần tài nguyên, thường dùng với media/range requests; không phải lỗi. [Giải thích HTTP 206](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/206).
5. Khi gửi search: `/search/english/direct/?q=marketing` → `302` → `/dictionary/english/marketing` → `301` → `/dictionary/marketing` → `200 text/html`. Đây là điều hướng sang document mới; không quan sát thấy thay định nghĩa bằng một fetch JSON riêng trong thao tác này.

Lượt snapshot trước consent ghi 51 request trong cửa sổ quan sát, 16 đến `www.ldoceonline.com`. Các domain khác gồm `cmp.inmobi.com` (consent), `googletagmanager.com`, `google-analytics.com`, `doubleclick.net`, font và script quảng cáo. Số lượng phụ thuộc cookie, vùng truy cập, thời gian chờ và quảng cáo; không dùng con số này làm mục tiêu cho app.

## Wiktionary: module theo tương tác và chính sách cache khác nhau

- HTTP response `/wiki/technology` có sẵn nội dung bài. Không cần gọi từng definition qua API để dựng phần nội dung chính trong lượt quan sát.
- JS/CSS tải qua `/w/load.php?modules=...`. Khi gõ vào tìm kiếm, xuất hiện thêm module typeahead search/Vue và ngôn ngữ. Quan sát này phù hợp với tải thêm module khi dùng tính năng; không chứng minh mọi module của site đều lazy-load. [ResourceLoader chính thức](https://www.mediawiki.org/wiki/ResourceLoader).
- Gợi ý tìm kiếm: `GET /w/rest.php/v1/search/title?q=marketing&limit=10`, type Fetch, `application/json`, 200. Header `Cache-Control: public, max-age=10800` (3 giờ).
- Một API khác `/w/api.php?action=cirrus-config-dump&...` tải cấu hình tìm kiếm, có header `private, must-revalidate, max-age=0`.
- Asset module có version được quan sát với `public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=60` và ETag. Một số module không có version ở URL dùng max-age 300 giây; logo dùng 1 năm. Các resource có chính sách riêng theo khả năng thay đổi, không áp một TTL cho toàn trang. [Ý nghĩa Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control).

Các phép reload đã ghi response nhưng chưa đo đầy đủ memory cache, byte thực tải và cache hit ở edge. Header mô tả chính sách; số response trong log không đồng nghĩa số lần tải toàn bộ file qua mạng. Không suy ra Redis, DB, microservices hoặc topology CDN từ log này.

## Bài học đề xuất cho V1

Đây là lựa chọn để cân nhắc trong spec, chưa phải quyết định được chốt:

| Nhu cầu V1 | Hướng có thể áp dụng |
| --- | --- |
| Catalog từ ổn định | Web Next.js có thể trả nội dung ban đầu trong HTML; Flutter dùng API chung. Chỉ trả nhóm/trang đang xem, không tải toàn bộ A1–C2 lúc mở app. |
| Flashcard trong một nhóm | Lấy một lô nhỏ đủ cho phiên ôn, chuyển thẻ tại client; tránh tạo request lấy nghĩa cho từng lần lật thẻ. |
| Tìm từ | Endpoint gợi ý trả ít kết quả và field cần thiết; cân nhắc debounce/cancel request cũ để kết quả không bị đổi ngược khi gõ nhanh. Không coi debounce là kỹ thuật đã chứng minh ở Longman. |
| Static asset và nội dung public | Dùng URL phiên bản/hash và cache phù hợp. Dữ liệu nhóm/trạng thái cá nhân phải có chính sách riêng theo tài khoản; không dùng public cache chung cho response cá nhân. |
| Phát âm nếu có yêu cầu | Chỉ tải audio khi bấm hoặc chuẩn bị dùng; lưu ý rights/source trước thêm asset vào sản phẩm. Audio chưa tự thành feature V1 vì nghiên cứu này. |
| AI bài tập | Tạo bài khi người dùng bắt đầu luyện; request AI tách khỏi tải danh sách/đổi trạng thái thẻ, để phần ôn vẫn hoạt động nếu AI lỗi. |

## Cách tự theo dõi Cambridge trong trình duyệt của bạn

1. Mở Cambridge bình thường; khi trang từ điển đã truy cập được, mở F12 → Network, bật Preserve log và thêm cột Domain/Initiator.
2. Reload với Disable cache để thấy lượt tải đầu. Xem **All** trước: nội dung có thể nằm trong **Doc**, không chỉ Fetch/XHR.
3. Xóa log; gõ một từ nhưng chưa Enter để nhận diện autocomplete. Xóa log tiếp; gửi search để phân biệt document navigation với API update. Thử phát âm riêng và lọc Media.
4. Với từng request cần học, xem URL/method, Headers, Response, Initiator và Timing. Đọc response để biết dữ liệu thực sự được trả, không đoán từ tên endpoint.
5. Tắt Disable cache và thử lại để xem Size hiển thị memory/disk cache hoặc response revalidation. Ghi riêng hành vi cold/warm; giữ cùng điều kiện cookie/network khi so sánh.

[Hướng dẫn Network chính thức của Chrome](https://developer.chrome.com/docs/devtools/network). Nếu cần phân tích Cambridge đúng phiên của bạn, có thể xuất HAR đã loại dữ liệu nhạy cảm từ DevTools; phần Cambridge hiện vẫn chưa có trace nội dung từ điển thành công.

## Evidence trong workspace

- [Cache, HTML và search Longman/Wiktionary](NETWORK_OBSERVATIONS_2026-10-02.json): Chrome context mới, cold load, reload, gõ marketing; chỉ lưu URL được lọc và header về cache/content.
- [Longman phát âm và search sau consent](LONGMAN_INTERACTIONS_2026-10-02.json): từ chối cookie tùy chọn, bấm phát âm, gõ/gửi marketing. Ghi rõ redirect và response media thực sự xuất hiện.
- Scratch scripts và snapshot bị chặn nằm trong `work/`; không ghi Cookie, Set-Cookie hoặc header xác thực vào các output JSON.
