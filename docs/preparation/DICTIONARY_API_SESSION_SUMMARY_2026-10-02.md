# Tổng hợp session nghiên cứu các trang từ điển

Ngày tổng hợp: 02/10/2026. Trạng thái: **phân tích bằng chứng và hướng đề xuất, chưa chọn provider hoặc kiến trúc**.
Sau bản tổng hợp, người dùng chọn **hybrid cho nguồn từ vựng** (catalog DB +
nguồn ngoài); provider và thiết kế cụ thể còn mở. Xem trạng thái ở [context](PROJECT_CONTEXT.md).

Session được người dùng yêu cầu đọc: [Business Analysis (Working) (2)](codex://threads/01a0f4ef-e954-78a2-b323-e521ba4776c9). Đã truy cập bằng `read_thread`, đọc các lượt qua ba trang pagination đến `hasMore=false` (21 lượt). Phần nghiên cứu Network nằm ở hai lượt cuối; đã đối chiếu [báo cáo Network](NETWORK_INSPECTION_2026-10-02.md), [log HTML/cache/search](NETWORK_OBSERVATIONS_2026-10-02.json) và [log tương tác Longman](LONGMAN_INTERACTIONS_2026-10-02.json). Không nhắn tin hay thao tác trong session đó. Các lựa chọn product cũ trong thread không ghi đè context mới nhất của workspace.

## 1. Session này thực sự nghiên cứu điều gì?

Yêu cầu trong session là xem **Network của website** để học cách các trang từ điển tải dữ liệu. Công việc đã làm gồm mở một trang từ, gõ tìm kiếm, gửi tìm kiếm, thử phát âm và đọc cache header. Đây là quan sát cách trình duyệt giao tiếp với website, không phải cuộc so sánh hợp đồng API thương mại của các hãng.

Với người mới: HTML là tài liệu chứa nội dung để trình duyệt dựng trang; JSON là dạng dữ liệu thường dùng khi ứng dụng gọi API. Một trang có thể nhận ngay định nghĩa trong HTML và chỉ gọi thêm API nhỏ khi gõ tìm kiếm. Vì vậy, nếu chỉ lọc Fetch/XHR, ta có thể bỏ qua nơi nội dung chính đã được tải.

**Thấy một endpoint trong Network không tự chứng minh endpoint đó được hãng cung cấp cho app bên ngoài dùng hoặc cho phép sao chép nội dung vào DB.** Endpoint của website, API có tài liệu cho nhà phát triển và giấy phép dùng dữ liệu là ba chuyện cần kiểm tra riêng.

## 2. Kết quả đã quan sát

| Trang | Kết quả | Điều đã thấy | Giới hạn |
| --- | --- | --- | --- |
| Cambridge | Cloudflare/403 trong các phiên thử | Luồng xác minh chống bot | Chưa quan sát được trang từ điển thật, nội dung/API/audio/search của nó. |
| Longman | Trang tải thành công; thử search và audio sau khi từ chối cookie tùy chọn | Nội dung định nghĩa trong HTML; autocomplete XHR; search chuyển trang; MP3 sau bấm nghe | Chưa nghiên cứu API thương mại, schema nội dung đầy đủ hoặc quyền tái sử dụng. |
| Wiktionary | Trang tải thành công; gõ tìm kiếm có request gợi ý | Nội dung trong HTML; module JS/CSS; search JSON; cache khác nhau theo resource | Không dùng một trang mẫu để kết luận độ phủ từ, level, chủ đề hoặc chất lượng tất cả ngôn ngữ. |
| Merriam-Webster | 403/Cloudflare ở lượt thử | Request của phiên bị chặn | Chưa có luồng từ điển thật để phân tích. |
| WordReference | 403 ở lượt thử | Phiên không tải được nội dung cần quan sát | Không kết luận site/API ngừng hoạt động hoặc thiếu tính năng. |

### Longman

- Mở từ: `GET /dictionary/technology`, response HTML có phần định nghĩa.
- Gõ tìm: `/autocomplete/english/?q=marketing&contentType=...`, XHR 200. Header là `text/javascript;charset=UTF-8`; payload chưa được kiểm tra nên không gọi đây là JSON thuần chỉ từ tên query parameter.
- Gửi tìm: `/search/english/direct/?q=marketing` → 302 → `/dictionary/english/marketing` → 301 → `/dictionary/marketing` → HTML 200. Các mã redirect hướng trình duyệt tới trang đích; thao tác này tải document mới.
- Bấm nghe: MP3 của từ technology xuất hiện với status 206. MP3 này chưa xuất hiện ở lượt tải trang trước khi bấm. Đây là quan sát lazy loading audio cho thao tác này, không phải xác nhận mọi media trên site cùng hành vi.
- Nhiều CSS/JS/font/ảnh/MP3 có URL version và cache 30 ngày. HTML và autocomplete trong log không có `Cache-Control` được ghi; không thể kết luận không có cache ở tất cả các tầng.
- Có consent, quảng cáo và analytics ngoài request nội dung. Tổng request thay đổi theo điều kiện phiên; không lấy số request làm tiêu chuẩn kiến trúc cho app mình.

### Wiktionary

- Trang `/wiki/technology` đã chứa nội dung trong HTML.
- Module JS/CSS đi qua `/w/load.php`; thao tác tìm kiếm tải thêm một số module.
- `GET /w/rest.php/v1/search/title?q=marketing&limit=10` trả JSON 200; header public cache 3 giờ. **Đây là gợi ý tìm theo tiêu đề, không phải response dictionary chứa mọi definition/translation cần cho app.**
- Request cấu hình tìm kiếm `/w/api.php?action=cirrus-config-dump&...` có policy cache khác. Asset module có version, ETag và thời hạn riêng theo loại.

Header cache mô tả chính sách mong muốn; log hiện tại chưa đo đầy đủ byte thực tải, hit ratio ở cache hay năng lực chịu tải. Không suy ra họ dùng Redis, DB nào, SSR framework nào, bao nhiêu server hoặc microservices. HTML có nội dung chỉ chứng minh nội dung đã có trong response; chưa phân biệt render động, pre-render hoặc cache phía server.

## 3. Những câu hỏi về nguồn dữ liệu mà session chưa trả lời

| Cần biết cho app | Bằng chứng của session |
| --- | --- |
| Có danh sách A1–C2 và mức level ở entry hay từng nghĩa? | Chưa kiểm tra. |
| Có topic technology/marketing/business… và mức độ phủ? | Chưa kiểm tra; từ dùng thử không chứng minh hệ thống có taxonomy topic. |
| Có nghĩa Việt hoặc nhiều ngôn ngữ theo cùng sense ID? | Chưa kiểm tra API/payload/schema đầy đủ. |
| Có ID nghĩa ổn định, source revision và attribution? | Chưa nghiên cứu ở mức tích hợp dữ liệu. |
| Giá, quota thử nghiệm, quota commercial, SLA? | Không có trong phần Network research. Không suy đoán giá từ việc mở website miễn phí. |
| Cho dùng thương mại, lưu lâu dài, sửa, cache, dùng với AI/RAG? | Không có bằng chứng hợp đồng/license trong phần research này. |

Workspace có [research nguồn dữ liệu riêng ngày 01/10](VOCABULARY_DATA_RESEARCH_2026-10-01.md), gồm CEFR-J, Wiktionary/Kaikki và dictionary API. Đó là evidence khác, không ghi rằng session Network vừa xác nhận lại license/giá của các nguồn này. Trước tích hợp thật, phải rà điều khoản đúng nguồn, đúng sản phẩm và phiên bản hợp đồng hiện dùng. Phân tích hiện tại không thực hiện vòng research giá/license mới.

## 4. Bài học có thể áp dụng, giải thích qua app của mình

Các ý dưới đây là **đề xuất**, chưa trở thành spec:

1. **Lấy dữ liệu theo thao tác cần làm.** Khi người học mở nhóm 20 từ, app có thể lấy một lô đủ cho phiên ôn, rồi lật thẻ tại máy người dùng. Không cần request mới cho mỗi lần lật; cũng không tải toàn bộ catalog A1–C2 vào lúc mở app. Lô lớn hơn giảm request nhưng tăng payload, bộ nhớ và nguy cơ dữ liệu cũ; kích thước sẽ chọn theo trải nghiệm và đo đạc.
2. **Tìm kiếm gợi ý là một nhu cầu riêng.** Nó chỉ cần ít kết quả, không cần toàn bộ chi tiết mọi từ. Khi người dùng gõ nhanh, app cần tránh để response của truy vấn cũ ghi đè truy vấn mới. Debounce/cancel là option của app, chưa phải kỹ thuật đã chứng minh Longman dùng qua log này.
3. **Catalog và tiến độ có tốc độ thay đổi khác nhau.** Catalog public có thể cache theo version/ngôn ngữ; trạng thái "đã biết" của từng tài khoản cần policy riêng. Bấm cập nhật tiến độ phải cho người dùng thấy trạng thái phù hợp; public cache không được trộn dữ liệu riêng giữa các tài khoản.
4. **Web và mobile có thể nhận cùng nội dung bằng cách khác nhau.** Next.js có thể trả trang ban đầu chứa nội dung, Flutter nhận dữ liệu qua API; cả hai vẫn dùng model/contract của app. Quan sát Longman không bắt buộc chọn một framework render cụ thể cho Next.js.
5. **Ôn từ và AI nên có đường lỗi riêng.** AI lỗi không nên làm hỏng việc xem catalog/ôn flashcard. Điều này gắn với core loop hiện có; không tự quyết định phải dùng queue hay RAG.
6. **Audio là bài học tải tài nguyên theo nhu cầu.** Không thêm phát âm/audio vào V1 chỉ vì thấy website lớn có nó. Nếu sau này cần, content rights, source, cache và xử lý lỗi sẽ là decision riêng.

## 5. Fetch ngoài, catalog DB hoặc hybrid: trade-off

Phần này là phân tích áp dụng cho app từ các yêu cầu đã có, **không phải kết luận đã kiểm chứng về backend của Longman/Wiktionary**.

| Option | Ví dụ dễ hình dung | Lợi ích | Chi phí, failure và đổi nguồn |
| --- | --- | --- | --- |
| Fetch trực tiếp từ API được phép | Mỗi lần người dùng mở từ, backend gọi hãng rồi trả dữ liệu | Ít pipeline import ban đầu; nội dung do provider cập nhật | User chịu latency/outage/quota của provider; tìm theo level/topic có thể thiếu; cần adapter, timeout và policy fallback. Đổi provider phải map IDs/nghĩa để giữ tiến độ, không chỉ đổi URL. Cache vẫn cần quyền trong hợp đồng. |
| Catalog phục vụ từ DB app | Import nội dung được phép hoặc tự biên soạn/duyệt trước; app đọc DB | Chủ động level/topic/language/quality và ID; ôn tập không phụ thuộc một request ngoài | Tốn công import, review, updates/provenance và vận hành DB; dữ liệu có thể cũ hoặc import sai. Import phải lặp an toàn, publish có kiểm tra, có cách quay lại bản đúng. Quyền lưu dữ liệu là điều kiện. |
| Hybrid | Tập từ học đã duyệt nằm trong DB; nguồn ngoài hỗ trợ bổ sung/tra cứu khi thực sự cần | Giữ core loop ổn định và mở đường nội dung mới | Vận hành hai đường dữ liệu, quy tắc freshness/rights rõ; cùng chữ chưa chắc cùng nghĩa. Không tự đưa kết quả ngoài chưa duyệt vào catalog hoặc chuyển progress theo fuzzy match. |

Hướng đáng cân nhắc cho V1 là catalog do app kiểm soát cho nhóm từ học và tiến độ, còn provider nằm sau lớp mapping. Lý do là app cần quản lý theo level/chủ đề và giữ kết quả học khi thay nguồn. Tính hợp lệ của dữ liệu, thời gian biên tập và ngân sách cần được so sánh. **Sau bản tổng hợp, người dùng đã chọn hướng nguồn hybrid**; lớp mapping và thiết kế cụ thể vẫn là đề xuất.

## 6. Điều cần giữ trong proposal hiện tại

- Giữ mô hình entry → sense → nội dung theo language như **một option**. Không coi response của một hãng hoặc một trang mẫu là DB schema bắt buộc của app.
- Giữ source/provider IDs là tham chiếu ngoài, ID nội bộ phục vụ group/progress là identity do app quản lý. Cần policy mapping nghĩa trước khi đổi nguồn; không mặc định hai provider có cùng hệ nghĩa.
- Giữ provenance/license gắn với nội dung cụ thể. Một endpoint xem được trong browser không là quyền import/cache/AI.
- Giữ level/topic là metadata phải có nguồn hoặc biên tập; Network trace không giải quyết khoảng trống A1–C2 và taxonomy.
- Không ghi "Longman autocomplete trả JSON" khi chưa đọc payload; không ghi "các site dùng Redis/microservices" từ cache header; không ghi "Cambridge đã được phân tích thành công".
- Không ghi cache TTL 30 ngày/3 giờ là best practice bắt buộc của app. Đây là giá trị quan sát, cần chọn TTL theo freshness/quyền và dữ liệu riêng/public.

**Decision này cần Defense Analysis trước khi chốt spec.** Khi chọn đường nguồn dữ liệu, các hint gần nhất là: nếu hãng không trả lời thì buổi ôn có dùng được không; nhập lại cùng batch có tạo trùng không; hãng đổi nghĩa hoặc ngừng hợp đồng thì tiến độ cũ bám dữ liệu nào?

Spec tiếp theo phải làm rõ ID/invariants, batch import và duplicate, lỗi/partial publish, deadline/retry/quota, owner/private cache, freshness/observability, content revision và rollback/mapping. Đây là checkpoint cho decision sau, không tuyên bố thiết kế đã accepted hay đòi hỏi thêm approval cho việc tổng hợp được giao.

## 7. Nguồn và bước tiếp theo

Evidence trực tiếp: session được đọc, [NETWORK_INSPECTION_2026-10-02.md](NETWORK_INSPECTION_2026-10-02.md), [NETWORK_OBSERVATIONS_2026-10-02.json](NETWORK_OBSERVATIONS_2026-10-02.json), [LONGMAN_INTERACTIONS_2026-10-02.json](LONGMAN_INTERACTIONS_2026-10-02.json).

Tài liệu primary đã được session dùng để diễn giải: [Chrome DevTools Network](https://developer.chrome.com/docs/devtools/network), [MediaWiki ResourceLoader](https://www.mediawiki.org/wiki/ResourceLoader). Các trang đã truy cập: [Longman technology](https://www.ldoceonline.com/dictionary/technology), [Wiktionary technology](https://en.wiktionary.org/wiki/technology), [Cambridge technology](https://dictionary.cambridge.org/dictionary/english/technology).

Bước phù hợp tiếp theo là dùng các bài học này để giải thích/request-design cho V1 và lập so sánh nguồn dữ liệu hợp lệ riêng khi cần. Chưa có code, import, capacity test, kết quả chất lượng nội dung mới hoặc provider được chọn từ bản tổng hợp này.
