# Build, sign và upload app Flutter lên App Store và Google Play từ Windows 11, không có Mac (tháng 10/2026)

Ghi chú nghiên cứu, viết ngày 20/10/2026. Mọi trang giá và trang yêu cầu kỹ thuật đều được mở lại trong phiên này (20/10/2026).
Nguồn có từ trước 2025 được ghi **(có thể đã cũ, trước 2025)**. Nguồn bên thứ ba hoặc blog cá nhân được ghi **(bên thứ ba)** hoặc
**(kinh nghiệm cá nhân)**. Những chỗ tôi tự suy ra, không có nguồn ghi thẳng, nằm trong mục "Inferences" hoặc được gắn `ASSUMPTION`.

Bối cảnh: app Flutter (chưa viết) gọi NestJS REST API sẵn có; repo là pnpm monorepo trên GitHub, đã dùng GitHub Actions cho API/web;
một developer ở Việt Nam, ngân sách thấp, thanh toán bằng thẻ quốc tế.

---

## Câu 1: Build iOS khi không có Mac. Có những cách nào, giới hạn thật của từng cách, cách nào làm trọn quy trình mà không chạm vào Mac, và chạy/debug trên iPhone hoặc simulator thế nào

### Takeaway
Codemagic là cách duy nhất trong danh sách có tài liệu chính thức nói rõ là tạo được certificate và provisioning profile, build và đẩy
lên TestFlight/App Store **mà không cần Mac**, và gói free của tài khoản cá nhân có 500 phút Mac mini M2 mỗi tháng. GitHub Actions
macOS runner cũng làm được (bản thân runner là một máy Mac), nhưng phải tự ghép phần signing. Xcode Cloud cần mở Xcode trên Mac để
tạo workflow lần đầu. Thuê Mac theo giờ hoặc tháng, hoặc mua Mac mini cũ, thì thực chất vẫn là dùng Mac. Muốn debug Flutter trên
iPhone hay iOS Simulator thì vẫn cần Mac. Không có Mac, chỉ còn cách cài bản build qua TestFlight lên iPhone thật, hoặc dùng simulator
từ xa của Codemagic.

### Cited Findings

**Codemagic (giá xem ngày 20/10/2026)**
- Gói Free: $0/tháng, 1 thành viên, máy mặc định Mac mini M2, 1 build song song, **500 phút macOS M2 miễn phí mỗi tháng** ("refilled monthly, then standard rates apply"), build timeout 120 phút, cache 3 GB, lưu lịch sử 30 ngày; Linux/Windows không có phút miễn phí — [Codemagic pricing](https://codemagic.io/pricing/)
- Pay-as-you-go (không hợp đồng tối thiểu): Mac mini M2 **$0,095/phút**, Mac mini M4 **$0,114/phút**, Linux/Windows **$0,045/phút**; thêm build song song $49/tháng mỗi luồng (tối đa 3); "Mobile app preview" $0,095/phút — [Codemagic pricing](https://codemagic.io/pricing/)
- Gói trả cố định theo năm: M2 $3.990/năm, M4 $5.400/năm, Mac Studio M4 Max $9.000/năm, không giới hạn phút; Enterprise từ $12.000/năm. Giá chưa gồm thuế — [Codemagic pricing](https://codemagic.io/pricing/)
- Tài khoản cá nhân: "Single-user plan with unlimited applications", 500 phút M2 miễn phí/tháng, tối đa 1 build song song, chỉ có community support — [Codemagic pricing](https://codemagic.io/pricing/)
- Automatic code signing: Codemagic dùng một App Store Connect API key (khuyên quyền `App Manager`) để "automatically select or generate a matching certificate", và tạo certificate cùng profile "without requiring a Mac" — [Codemagic docs: iOS code signing (Flutter workflow editor)](https://docs.codemagic.io/flutter-code-signing/ios-code-signing/)
- Image macOS mặc định của Codemagic hôm nay: macOS 26.5.1, **Xcode 26.6** ("Xcode 26.6.x (default)"); có thêm image "Xcode 27.2.x (edge)"; máy Mac mini M2 (8 core/12 GB) và M4 (10 core/16 GB) — [Codemagic docs: Xcode 26.6 image](https://docs.codemagic.io/specs-macos/xcode-26-6/)
- Remote access: bật "Enable SSH/VNC access" lúc khởi động từng build bằng tay; máy Mac dùng VNC để có giao diện; máy còn truy cập được "10 minutes after the build finishes running"; phiên kéo dài tới khi build bị hủy hoặc hết thời gian build tối đa (mặc định 60 phút) — [Codemagic docs: remote access](https://docs.codemagic.io/troubleshooting/accessing-builder-machine-via-ssh/). Một bài blog cũ của Codemagic nói là 20 phút sau build, mâu thuẫn với docs hiện tại — [Codemagic blog: VNC](https://blog.codemagic.io/codemagic-new-features-vnc/) **(có thể đã cũ, trước 2025)**
- App Preview (iOS Simulator/Android emulator chạy trong trình duyệt): **chỉ dành cho teams**; team pay-as-you-go có một ít thời lượng dùng thử, sau đó $0,095/phút; mỗi phiên tối đa 20 phút, mặc định 1 phiên cùng lúc; build iOS cho simulator bằng `flutter build ios --simulator` — [Codemagic docs: App Preview](https://docs.codemagic.io/yaml-distributing/app-preview/)
- Codemagic có hướng dẫn build và phát hành app iOS bằng Flutter từ Windows/Linux; bài này cũng nói vẫn cần một thiết bị iOS để smoke test, và debug trên simulator hay thiết bị thật vẫn cần Mac — [Codemagic blog: iOS without Mac](https://blog.codemagic.io/how-to-build-and-distribute-ios-apps-without-mac-with-flutter-codemagic/) **(có thể đã cũ, trước 2025)**; [DEV mirror](https://dev.to/codemagicio/how-to-develop-and-distribute-ios-apps-without-mac-with-flutter-codemagic-4eaa) **(có thể đã cũ, trước 2025)**
- Kinh nghiệm được kể lại: build đầu tiên có thể lỗi khi project iOS chưa từng được build (chưa có Podfile); cách xử lý của người viết là vào máy build qua remote access để tạo file rồi push lên repo — [Codemagic blog / DEV](https://dev.to/codemagicio/how-to-develop-and-distribute-ios-apps-without-mac-with-flutter-codemagic-4eaa) **(kinh nghiệm cá nhân, có thể đã cũ)**
- Monorepo: key `working_directory` đặt thư mục app, mọi script chạy trong thư mục đó; `when.changeset.includes/excludes` lọc build theo thư mục thay đổi; build đầu tiên sau khi thêm hoặc sửa `changeset` luôn chạy — [Codemagic docs: monorepo apps](https://docs.codemagic.io/partials/monorepo-apps); [Codemagic docs: conditional run](https://docs.codemagic.io/partials/yaml-conditional-run); [Codemagic help: changeset](https://help.codemagic.io/articles/4568272148-why-is-my-when-changeset-condition-not-skipping-builds-after-a-push)

**GitHub Actions macOS runners (giá xem ngày 20/10/2026)**
- Giá runner chuẩn: macOS 3 hoặc 4 core (M1 hoặc Intel) **$0,062/phút**; Linux 2-core x64 $0,006/phút; Linux 1-core $0,002/phút; Windows 2-core $0,010/phút. Runner macOS lớn: 12-core x64 $0,077/phút, 5-core M2 Pro $0,102/phút. Phút lẻ được làm tròn lên thành 1 phút. Runner lớn chỉ dành cho organization dùng gói Team/Enterprise Cloud, không dùng phút miễn phí được — [GitHub docs: Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)
- Phút miễn phí mỗi tháng cho repo private: GitHub Free 2.000 phút, Pro 3.000, Team 3.000, Enterprise Cloud 50.000; runner chuẩn **miễn phí cho repo public** — [GitHub docs: GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- Hệ số nhân phút macOS: docs chính thức hiện tại **không còn nói** tới hệ số nhân (chỉ ghi giá theo phút) — [GitHub docs: about billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions). Các nguồn bên thứ ba vẫn ghi macOS ×10 (2.000 phút Free ≈ 200 phút macOS) — [cicdcalculator](https://cicdcalculator.com/github-actions-free-tier) **(bên thứ ba)**; [DEV](https://dev.to/ace2932/your-github-actions-bill-is-mostly-macos-minutes-heres-how-to-tell-56fk) **(bên thứ ba)**
- Giá runner hosted giảm "up to 39%" từ 01/01/2026; khoản phí $0,002/phút cho self-hosted runner (dự kiến từ 01/03/2026) đã bị **hoãn**: "We're postponing the announced billing change for self-hosted GitHub Actions" — [GitHub changelog 16/12/2025](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/); [GitHub resources: 2026 pricing changes](https://github.com/resources/insights/2026-pricing-changes-for-github-actions)
- Image hiện có: `macos-latest` trỏ tới **macOS 26** (arm64); có `macos-26`, `macos-15`; `macos-14` đã deprecated — [actions/runner-images](https://github.com/actions/runner-images)

**Bitrise (giá xem ngày 20/10/2026)**
- Hobby: miễn phí, không cần thẻ, **300 credits/tháng**, 1 app private, timeout 90 phút, chỉ có community support. Starter từ $89/tháng (trả theo năm) hoặc $99/tháng; Pro từ $200/tháng (trả theo năm) hoặc $218; thử 30 ngày — [Bitrise pricing](https://bitrise.io/pricing)
- Mâu thuẫn trên chính trang giá: bảng máy ghi macOS M4 Medium / M2 Pro Medium "$0.0072" ở cột "Cost per minute", nhưng một đoạn khác nói "one credit represents one minute of build time on our standard Linux compute option, or 30 seconds on our standard MacOS option", tức 300 credits ≈ 150 phút macOS chuẩn — [Bitrise pricing](https://bitrise.io/pricing). Con số $0,0072/phút thấp hơn Codemagic hơn 10 lần, nên có thể là lỗi khi đọc trang. Cần mở trang bằng trình duyệt để xác nhận.

**Xcode Cloud**
- Gói Apple Developer Program có sẵn **25 compute hours/tháng**; mua thêm: 100 giờ $49,99/tháng, 250 giờ $99,99, 1.000 giờ $399,99, 10.000 giờ $3.999,99 — [Apple: Xcode Cloud](https://developer.apple.com/xcode-cloud/)
- Cách bắt đầu: "configure a workflow in Xcode"; trên web App Store Connect "you can also edit your workflows and launch builds directly from the web" — [Apple: Xcode Cloud](https://developer.apple.com/xcode-cloud/)
- Flutter docs: tạo workflow bằng **Product > Xcode Cloud > Create Workflow** trong Xcode; cần thêm script `ios/ci_scripts/ci_post_clone.sh` để clone Flutter stable, chạy `flutter precache --ios`, `flutter pub get` và `pod install` — [Flutter docs: Continuous delivery](https://docs.flutter.dev/deployment/cd)

**Thuê Mac trên cloud**
- Scaleway (Paris, EUR, chưa gồm thuế): Mac mini M1 8 GB **€75/tháng hoặc €0,11/giờ**; M2 16 GB €115/tháng (€0,17/giờ); M2 Pro €139; M4 16 GB/256 GB **€149/tháng (€0,22/giờ)**; M4 Pro 64 GB €335. Trang giá không nhắc thời gian thuê tối thiểu — [Scaleway Apple silicon pricing](https://www.scaleway.com/en/pricing/apple-silicon/)
- AWS EC2 Mac: "Billing for EC2 Mac instances is per second with a 24-hour minimum allocation period" (thuê dạng Dedicated Host); có các loại mac2 (M1), mac2-m2, mac2-m2pro, mac-m4, mac-m4pro; trang không ghi giá theo giờ — [AWS EC2 Mac](https://aws.amazon.com/ec2/instance-types/mac/)
- Giá AWS theo giờ: M1 $0,6498/giờ lúc ra mắt — [AWS News Blog](https://aws.amazon.com/blogs/aws/use-amazon-ec2-m1-mac-instances-to-build-test-macos-ios-ipados-tvos-and-watchos-apps/) **(có thể đã cũ, 2020)**; mac2-m2.metal "starting at $0.878 per hour" — [Vantage](https://instances.vantage.sh/aws/ec2/mac2-m2.metal) **(bên thứ ba, không ghi region)**
- MacinCloud: trang chính thức trả về 404/403 khi tôi mở trong phiên này. Một trang của đối thủ cạnh tranh (06/2026) ghi: pay-as-you-go khoảng $1/giờ, managed server khoảng $25–29/tháng, dedicated M2 $99/tháng, M4 $124,99/tháng — [Green Mini vs MacinCloud](https://www.greenmini.nl/compare/macincloud-alternative/) **(bên thứ ba, đối thủ cạnh tranh, chưa kiểm được)**. Bài cũ: $1/giờ (trả trước $30), managed từ $20/tháng có giới hạn số giờ mỗi ngày — [gamefromscratch](https://gamefromscratch.com/pay-as-you-go-macintosh-development-a-macincloud-com-review/) **(có thể đã cũ, 2015)**

**Mua Mac mini cũ**
- Giá M1 (2020) đã qua sử dụng hoặc tân trang ở nước ngoài: thấp nhất khoảng €239 (RefurbMe Tây Ban Nha, dữ liệu 06/08/2026), £399 (Amazon Renewed Anh), khoảng $469 (Mỹ, 07/2026) — [RefurbMe](https://www.refurb.me/es/stats/mac-mini/mac-mini-m1-finales-2020) **(bên thứ ba)**; [refurb.me](https://www.refurb.me/blog/mac-mini) **(bên thứ ba)**. Không tìm được giá VND: bài của Hoàng Hà Mobile (19/06/2026) khen M1 cũ "giá tốt nhất" nhưng không ghi giá — [Hoàng Hà Mobile](https://hoanghamobile.com/tin-tuc/mac-mini-cu/)
- Yêu cầu macOS của Xcode: Xcode 26.4.1–26.6 cần **macOS Tahoe 26.2** trở lên; Xcode 27/27.1/27.2 RC cần **macOS Tahoe 26.6** trở lên — [Apple: Xcode system requirements](https://developer.apple.com/xcode/system-requirements/)
- macOS 27 "Golden Gate" bỏ hỗ trợ Mac Intel; Mac mini Apple silicon (2020 trở đi, tức có M1) vẫn được hỗ trợ — [iClarified](https://www.iclarified.com/101131/macos-27-golden-gate-supported-devices-full-list-of-compatible-macs) **(bên thứ ba)**; [MacTrast](https://www.mactrast.com/2026/05/psa-apples-upcoming-macos-27-update-will-put-an-end-to-support-for-intel-based-macs/) **(bên thứ ba)**

**Chạy và debug trên iPhone hoặc simulator khi không có Mac**
- Flutter docs: "Xcode is required to build and release your app. You must use a device running macOS to follow this guide" — [Flutter docs: Build and release an iOS app](https://docs.flutter.dev/deployment/ios). Trang cài đặt iOS mặc định có Mac: chạy app trên thiết bị thật hoặc Simulator đều qua Xcode, cắm iPhone "to the USB port on your Mac" — [Flutter docs: iOS setup](https://docs.flutter.dev/platform-integration/ios/setup)
- TestFlight: sau khi upload, "You should receive an email within 30 minutes..." rồi thêm build vào nhóm Internal Testing — [Flutter docs: iOS deployment](https://docs.flutter.dev/deployment/ios)
- App Review guideline 2.1(a): "Make sure your app has been tested on-device for bugs and stability before you submit it, and include demo account info (and turn on your back-end service!) if your app includes a login" — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- xtool: công cụ mã nguồn mở thay Xcode, build một SwiftPM package thành app iOS, ký và cài lên máy thật từ Linux/WSL — [xtool GitHub](https://github.com/xtool-org/xtool). OSNews cho rằng việc dùng Xcode.xip trên máy không phải của Apple có thể vi phạm license agreement — [OSNews](https://www.osnews.com/story/142331/xtool-cross-platform-xcode-replacement-for-linux-windows-and-macos/) **(ý kiến bên thứ ba)**. Công cụ này dành cho Swift, không dành cho Flutter.

### Inferences
- **Cách nào làm trọn quy trình mà không chạm vào Mac:**
  - Codemagic: **có**, đã có tài liệu chính thức (signing tự động, build, publish).
  - GitHub Actions macOS: **có**, nhưng phải tự ghép phần signing (xem Câu 2).
  - Bitrise: có thể có, nhưng tôi chưa kiểm phần signing của Bitrise trong phiên này.
  - Xcode Cloud: **không**, vì phải mở Xcode để tạo workflow lần đầu (có thể mượn máy qua VNC của Codemagic hoặc thuê Mac để làm bước này, nhưng chưa kiểm).
  - Thuê Mac hoặc mua Mac: bản chất là có Mac.
- **Chi phí cho dự án nhỏ:** 500 phút M2 miễn phí của Codemagic đủ cho khoảng 25–50 lần build iOS mỗi tháng, nếu mỗi lần build 10–20 phút (`ASSUMPTION`: thời gian build chưa đo, cần đo ở lần build đầu). GitHub Actions với repo private chỉ có khoảng 200 phút macOS nếu đúng là nhân 10 (chưa xác minh), sau đó $0,062/phút. Nếu repo public thì runner chuẩn miễn phí.
- **Thuê Mac theo tháng** (Scaleway M1 €75, M4 €149) đắt hơn nhiều so với dùng gói miễn phí Codemagic, chỉ đáng khi cần Xcode GUI thường xuyên để debug. AWS tính tối thiểu 24 giờ cho mỗi lần thuê, nên với M1 ít nhất khoảng $15,6 một lần (dựa trên giá năm 2020) và không hợp với kiểu dùng thỉnh thoảng.
- **Mua Mac mini M1 cũ** (khoảng €239–421 ở châu Âu) hòa vốn so với Scaleway M1 sau khoảng 3–6 tháng. M1 vẫn chạy được macOS 26/27 nên dùng được Xcode 27. Rủi ro là Apple có thể bỏ hỗ trợ M1 ở một bản macOS sau này.
- **Debug trên iPhone:** không có Mac thì gần như không debug trực tiếp được (hot reload, breakpoint). Cách thực tế: phát triển và debug chủ yếu trên Android (emulator hoặc máy thật) và Windows; kiểm iOS bằng bản TestFlight cài trên một iPhone thật. Guideline 2.1 yêu cầu đã test trên thiết bị, nên nên có ít nhất một chiếc iPhone, mua cũ cũng được. Lỗi riêng của iOS (quyền truy cập, push notification, platform channel) sẽ tốn thời gian sửa hơn nếu không có Mac; khi gặp thì dùng VNC của Codemagic hoặc thuê Mac theo giờ.
- **Codemagic App Preview** (simulator trong trình duyệt) không dùng được với tài khoản cá nhân miễn phí, vì chỉ dành cho teams.

### Gaps
- Chưa xác minh hệ số nhân phút macOS của GitHub vì docs chính thức không còn ghi; con số ×10 chỉ có ở nguồn bên thứ ba.
- Hai con số trên trang giá Bitrise mâu thuẫn nhau ($0,0072/phút và "1 credit = 30 giây macOS"); cách Bitrise tự tạo certificate chưa được kiểm.
- Trang chính thức MacinCloud trả về 404/403 nên không lấy được giá chính thức.
- Không tìm được giá Mac mini M1 cũ bằng VND ở Việt Nam.
- Chưa kiểm remote access (SSH/VNC) của Codemagic có dùng được ở gói Free cá nhân không, và thời gian ngồi trong máy có bị trừ vào phút build không.
- Chưa có nguồn chính thức nói rõ Xcode Cloud có tạo được workflow đầu tiên chỉ từ web hay không (trang Apple chỉ nói "edit" và "launch").
- Chưa đo thời gian build một app Flutter iOS thật trên Codemagic M2.

---

## Câu 2: Signing iOS. Distribution certificate, provisioning profile, App Store Connect API key; fastlane match hay Codemagic automatic signing; những gì phải giữ bí mật

### Takeaway
Để lên TestFlight hoặc App Store cần ba thứ: một Apple Distribution certificate (kèm private key), một provisioning profile loại App
Store gắn với bundle ID, và một App Store Connect API key (`.p8` + Key ID + Issuer ID) để tự động hóa. Với người không có Mac, Codemagic
automatic signing là đường ngắn nhất: chỉ cần API key, Codemagic tự tạo hoặc chọn certificate và profile. fastlane match là cách tự
làm (lưu certificate đã mã hóa trong một git repo private, dùng trên runner macOS), hợp với GitHub Actions nhưng nhiều bước hơn. Phải
giữ bí mật: file `.p8` của API key (chỉ tải về được một lần), private key hoặc `.p12` của certificate cùng mật khẩu, và
`MATCH_PASSWORD` nếu dùng match.

### Cited Findings
- App Store Connect API key: người tạo key cho cả team phải là **Account Holder hoặc Admin**; khi tạo key thì chọn quyền truy cập ("Under Access, select the role permissions"), và "Team API keys are applied across all apps, so app access can't be limited for an API key"; "API keys are private and can only be downloaded once. After downloading, store it securely. Revoke a key immediately if it becomes lost or compromised"; key đã revoke thì "can't be reinstated" — [App Store Connect Help: App Store Connect API](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api)
- Codemagic khuyên dùng một API key riêng có quyền `App Manager`, nhập Issuer ID, Key ID và file private key vào phần tích hợp Developer Portal — [Codemagic docs: signing iOS (yaml)](https://docs.codemagic.io/yaml-code-signing/signing-ios/); [Codemagic docs: iOS code signing](https://docs.codemagic.io/flutter-code-signing/ios-code-signing/)
- Khai báo signing trong `codemagic.yaml`:
  ```yaml
  environment:
    ios_signing:
      distribution_type: app_store # or: ad_hoc | development | enterprise
      bundle_identifier: com.example.id
  ```
  sau đó chạy `xcode-project use-profiles` trước khi build; muốn build chỉ dành cho tester nội bộ trên TestFlight thì dùng `--custom-export-options='{"testFlightInternalTestingOnly": true}'` — [Codemagic docs: signing iOS (yaml)](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- "Apple limits the number of `Apple Distribution` certificates to 3." Codemagic không lấy lại được certificate mà nó không tạo ra, vì không có private key của certificate đó. Cũng có thể upload `.p12`/`.pem` (kèm mật khẩu) và `.mobileprovision` lên phần "Code signing identities" — [Codemagic docs: signing iOS (yaml)](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- Một file `.cer` không có private key: "saving the certificate with the `.cer` extension will not include your private key"; signing thủ công cần `.p12` — [Codemagic docs: iOS code signing](https://docs.codemagic.io/flutter-code-signing/ios-code-signing/)
- Codemagic CLI `app-store-connect fetch-signing-files BUNDLE_ID --create`: tạo certificate hoặc profile nếu chưa có; `--certificate-key` (hoặc biến môi trường `CERTIFICATE_PRIVATE_KEY`) là "Private key used to generate the certificate"; `--type` có giá trị `IOS_APP_STORE` — [codemagic cli-tools docs](https://github.com/codemagic-ci-cd/cli-tools/blob/master/docs/app-store-connect/fetch-signing-files.md)
- fastlane match: lưu "certificates with their private keys" và profiles trong kho chung; kho có thể là git (mã hóa bằng OpenSSL, giải mã bằng `MATCH_PASSWORD`), Google Cloud Storage hoặc S3; "We recommend to always use `readonly` mode when running _fastlane_ on CI systems"; xác thực bằng `api_key`/`api_key_path`; certificate và key được cài vào Keychain, nền tảng hỗ trợ ghi "ios, mac" — [fastlane docs: match](https://docs.fastlane.tools/actions/match/)
- Flutter CD docs khuyên dùng fastlane match để đồng bộ certificate giữa các máy, và khuyên đưa `FASTLANE_PASSWORD` vào biến môi trường đã mã hóa: "Since cloud instances are ephemeral and untrusted, you won't be leaving your credentials... on the server" — [Flutter docs: Continuous delivery](https://docs.flutter.dev/deployment/cd)
- Với project dùng `codemagic.yaml`, bước khởi tạo keychain và thêm certificate vào keychain "not required as those are automatically fetched during the build process" — [Codemagic docs: signing iOS (yaml)](https://docs.codemagic.io/yaml-code-signing/signing-ios/)

### Inferences
- **So sánh hai cách:**
  - Codemagic automatic signing: ít việc nhất, không cần OpenSSL hay Keychain; đổi lại bị gắn chặt với Codemagic.
  - fastlane match trên GitHub Actions macOS: tự quản lý được, không phụ thuộc nhà cung cấp; đổi lại phải lập thêm một repo private, đặt `MATCH_PASSWORD`, và lần đầu phải chạy match ở chế độ tạo mới trên một máy macOS (runner cũng tính).
- **Dùng cả hai cùng lúc dễ hỏng:** Apple chỉ cho tối đa 3 Distribution certificate, và Codemagic không dùng lại được certificate do người khác tạo. Nếu sau này đổi từ Codemagic sang GitHub Actions, nên xuất certificate kèm private key (biến `CERTIFICATE_PRIVATE_KEY`) để đem theo, thay vì tạo certificate mới mỗi lần.
- **Phải giữ bí mật:**
  - file `.p8` + Key ID + Issuer ID của API key;
  - private key của Distribution certificate (`CERTIFICATE_PRIVATE_KEY` hoặc `.p12` cùng mật khẩu);
  - `MATCH_PASSWORD` và quyền truy cập repo match (nếu dùng match);
  - Apple ID password hoặc app-specific password (nên tránh hẳn, chỉ dùng API key).
  Provisioning profile không chứa private key nên mức nhạy cảm thấp hơn. Đây là suy luận, chưa có nguồn ghi thẳng.
- **Tài khoản Apple:** Account Holder (chính developer) là người tạo API key. Vì key áp dụng cho mọi app trong team, nên chỉ cấp quyền App Manager chứ không cấp Admin.

### Gaps
- Trang Apple "Creating API Keys for App Store Connect API" không hiển thị nội dung khi mở bằng công cụ, nên phần giải thích Issuer ID và Key ID chưa được trích từ nguồn Apple.
- Chưa kiểm fastlane match có chạy được trên Windows hoặc Linux để *tạo* certificate không; docs chỉ ngầm cho thấy cần Keychain của macOS.
- Chưa kiểm Codemagic CLI chạy được trên Windows không (docs không ghi hệ điều hành hỗ trợ).

---

## Câu 3: Android. Upload key và Play App Signing, build AAB, flavors dev/staging/prod, quy tắc versionCode/versionName, R8 và `--split-debug-info`

### Takeaway
Toàn bộ phần Android làm được trên Windows hoặc trên runner Linux. Dùng Play App Signing (Google giữ app signing key, developer giữ upload
key; mất upload key thì xin reset được). Build bằng `flutter build appbundle`. Số version lấy từ `version: x.y.z+N` trong `pubspec.yaml`:
`N` thành versionCode, và mỗi lần upload phải có số build mới. R8 bật sẵn khi build release. Obfuscate Dart bằng `--obfuscate
--split-debug-info=<dir>`, và giữ file symbols của mọi bản đã phát hành. Flavors trên Android dễ làm; flavors trên iOS phải sửa scheme
trong Xcode, nên người không có Mac nên đổi API URL bằng `--dart-define` thay vì dùng flavor native. Tài khoản Play cá nhân mới phải chạy
closed test với 12 tester trong 14 ngày rồi mới được lên production.

### Cited Findings
- Tạo upload keystore trên Windows (PowerShell):
  ```powershell
  keytool -genkey -v -keystore $env:USERPROFILE\upload-keystore.jks `
          -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 `
          -alias upload
  ```
  "keep the `keystore` file private; don't check it into public source control!"; với `key.properties` cũng vậy: "Keep the `key.properties` file private"; trên Windows, đường dẫn `storeFile` phải dùng hai dấu gạch ngược `\\` — [Flutter docs: Build and release an Android app](https://docs.flutter.dev/deployment/android)
- "Android uses two signing keys: *upload* and *app signing*"; developer upload bản build ký bằng upload key, người dùng nhận APK ký bằng app signing key; "Flutter now signs all release builds" — [Flutter docs: Android deployment](https://docs.flutter.dev/deployment/android)
- Play App Signing: "Google manages and protects your app's signing key"; app mới "will be automatically enrolled in quantum-ready, hybrid signing with Google-generated keys"; upload key phải là RSA từ 2048 bit; app signing key do Google tạo là RSA 4096; mất upload key thì "you are not locked out of your app" và xin reset bằng cách gửi certificate PEM mới: `keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem`; nên dùng upload key khác app signing key — [Play Console Help: Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)
- Ký lai hậu lượng tử (PQC hybrid signing, APK Signature Scheme v3.2, Android 17+): người dùng Play App Signing chỉ cần chờ Google cung cấp tùy chọn nâng cấp — [Flutter docs: Android deployment](https://docs.flutter.dev/deployment/android)
- Build: `flutter build appbundle` sinh ra `build/app/outputs/bundle/release/app.aab`, mặc định gồm armeabi-v7a, arm64-v8a, x86-64 — [Flutter docs: Android deployment](https://docs.flutter.dev/deployment/android)
- Version: `version: 1.0.0+1` trong `pubspec.yaml`; `--build-name` thành `versionName`, `--build-number` thành `versionCode`; khi build APK tách theo ABI thì framework "adds `ABI_VERSION * 1000` to the version code"; "Once you upload your app to the Play Store, you cannot change the Application ID" — [Flutter docs: Android deployment](https://docs.flutter.dev/deployment/android). Trên iOS: build-name thành `CFBundleShortVersionString`, build-number thành `CFBundleVersion`, "Each upload requires a unique build number" — [Flutter docs: iOS deployment](https://docs.flutter.dev/deployment/ios)
- R8: "[R8] is enabled by default when you build a release APK or AAB". Trang tự mâu thuẫn: một chỗ nói tắt bằng `--no-shrink`, chỗ khác nói "The `--[no-]shrink` flag has no effect. Code shrinking is always enabled in release builds" — [Flutter docs: Android deployment](https://docs.flutter.dev/deployment/android)
- Obfuscate: `flutter build <target> --obfuscate --split-debug-info=/<symbols-directory>`; hỗ trợ `apk`, `appbundle`, `ipa`, `ios`…; "backup the SYMBOLS file"; giải mã stack trace bằng `flutter symbolize -i <stack-trace-file> -d <symbols-file>`; code so sánh theo tên (ví dụ `runtimeType.toString()`) sẽ hỏng; tên enum không bị obfuscate; "It is a **poor security practice** to store secrets in an app" — [Flutter docs: Obfuscate Dart code](https://docs.flutter.dev/deployment/obfuscate)
- Flavors Android: khai `flavorDimensions` và `productFlavors` (ví dụ `staging` với `applicationIdSuffix = ".staging"`, `production`), chạy `flutter build appbundle --flavor staging`; trong Dart đọc hằng `appFlavor` từ `package:flutter/services.dart` để chọn `apiUrl` — [Flutter docs: flavors (Android)](https://docs.flutter.dev/deployment/flavors)
- Flavors iOS: "If you want to create Flutter flavors for an iOS app, you'll need to do so in Xcode... set up something called a scheme and attach custom configurations to it" (Product > Scheme > New Scheme, thêm cấu hình `Debug-staging`/`Release-staging`…, scheme phải ở chế độ shared) — [Flutter docs: flavors (iOS)](https://docs.flutter.dev/deployment/flavors-ios)
- Flutter CD docs gợi ý truyền giá trị lúc build bằng `--dart-define MY_VAR=MY_VALUE` — [Flutter docs: Continuous delivery](https://docs.flutter.dev/deployment/cd)
- Mặc định của Flutter trên nhánh stable hiện tại: `compileSdkVersion = 36`, `targetSdkVersion = 36`, `minSdkVersion = 24`, `ndkVersion = "28.2.13676358"` — [flutter/flutter FlutterExtension.kt (stable)](https://raw.githubusercontent.com/flutter/flutter/stable/packages/flutter_tools/gradle/src/main/kotlin/FlutterExtension.kt)
- Tài khoản Play: phí đăng ký **US$25 một lần**, có thể bị yêu cầu giấy tờ tùy thân và thẻ tín dụng đứng tên mình, không nhận thẻ trả trước — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) (nội dung đọc qua bản tóm tắt của kết quả tìm kiếm)
- Tài khoản Play cá nhân tạo sau ngày 13/11/2023: "At least 12 testers must be opted in to your closed test" và "must have been opted in continuously for the preceding 14 days" rồi mới bấm "Apply for production" — [Play Console Help: testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

### Inferences
- **Flavors với người không có Mac:** chỉ cần một flavor native, còn API URL đổi bằng `--dart-define` (ví dụ `--dart-define=API_BASE_URL=https://staging…`). Cách này tránh phải sửa scheme Xcode mà không có Mac. Đổi lại: các bản dev, staging, prod dùng chung bundle ID và application ID, nên không cài song song được trên cùng một máy. Nếu cần cài song song, Android vẫn làm được bằng `applicationIdSuffix`; iOS thì phải sửa Xcode (qua VNC của Codemagic hoặc thuê Mac). Phiên này chưa kiểm `--dart-define-from-file`.
- **Bí mật phía Android:** file `.jks`, mật khẩu store và key, alias, và file JSON của service account Play. Trên CI thì lưu keystore dạng base64 trong secret (Flutter CD docs làm như vậy: `echo "$PLAY_STORE_UPLOAD_KEY" | base64 --decode > ...`). Nên giữ thêm một bản sao offline của upload key, vì xin reset upload key thì mất thời gian.
- **versionCode:** dùng chung một số build cho cả iOS và Android (lấy từ số lần chạy CI hoặc tự tăng) để luôn tăng và không trùng.
- **Lịch:** quy định 12 tester trong 14 ngày nghĩa là bản production Android đầu tiên sớm nhất cũng sau khoảng 2 tuần kể từ lúc có đủ 12 tester. Nên tìm tester sớm.

### Gaps
- Phiên này chưa kiểm giá trị versionCode tối đa mà Play chấp nhận, và quy định versionCode phải tăng mỗi lần upload (`ASSUMPTION`: mỗi lần upload phải có versionCode lớn hơn trước).
- Bản bên thứ ba nói số tester đã giảm từ 20 xuống 12 vào 12/2024; tôi chưa kiểm được.
- Phí $25 được đọc qua bản tóm tắt của kết quả tìm kiếm, chưa mở trực tiếp trang.

---

## Câu 4: Yêu cầu về toolchain năm 2026 ảnh hưởng tới việc store chấp nhận app (Xcode / iOS SDK, target API, NDK, 16 KB page size) và bản Flutter stable nào đáp ứng

### Takeaway
Apple: từ 28/04/2026, mọi bản upload phải build bằng **Xcode 26 trở lên với iOS 26 SDK**; từ 09/09/2026, app phải target iOS 13 trở lên.
Google Play: từ 31/08/2026, app mới và bản cập nhật phải **target API 36 (Android 16)** (được xin gia hạn tới 01/11/2026); từ
01/02/2027, bản cập nhật target API 35 trở lên mà không hỗ trợ **16 KB page size** sẽ không phát hành được. Flutter stable mới nhất là
**3.47.7 (08/10/2026)**, mặc định target/compile SDK 36, NDK r28.2 (r28 trở lên căn 16 KB sẵn) và hỗ trợ iOS tới 27, nên đáp ứng được
các yêu cầu trên. Cần kiểm thật bản AAB đầu tiên bằng công cụ của Google.

### Cited Findings
- "Since April 28, 2026: Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26, iPadOS 26, tvOS 26, visionOS 26, or watchOS 26" — [Apple: Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)
- "Since September 9, 2026: iOS and iPadOS apps uploaded to App Store Connect must target iOS 13 or later"; age rating mới: phải trả lời bộ câu hỏi age rating mới trước ngày 31/01/2026; privacy manifest bắt buộc từ 01/05/2024 (phải khai lý do dùng một số API, kể cả trong SDK bên thứ ba); app chưa khai trader status bị gỡ khỏi App Store EU từ 17/02/2025 — [Apple: Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)
- Đã có Xcode 27 (27, 27.1, 27.2 RC) với iOS 27 SDK, cần macOS Tahoe 26.6 trở lên; Xcode 26.6 có iOS 26.5 SDK, cần macOS Tahoe 26.2 trở lên — [Apple: Xcode system requirements](https://developer.apple.com/xcode/system-requirements/)
- Play: "starting August 31, 2026... New apps and app updates must target Android 16 (API level 36) or higher"; "you'll be able to request an extension to November 1, 2026"; app đang có phải target API 35 trở lên để người dùng mới trên Android mới vẫn tìm thấy; trang cập nhật ngày 16/10/2026 — [Android Developers: target API requirements](https://developer.android.com/google/play/requirements/target-sdk)
- 16 KB: "all apps targeting Android 15 (API level 35) and higher must support 16 KB memory page sizes on 64-bit devices... Starting February 1, 2027, if your app updates don't support 16 KB memory page sizes, you won't be able to release these updates"; NDK r28 trở lên "compile 16 KB-aligned by default"; nên dùng AGP 8.5.1 trở lên; cách kiểm: `zipalign -c -P 16 -v 4 APK_NAME.apk`, `bundletool dump config --bundle=<my .aab> | grep alignment` phải ra `PAGE_ALIGNMENT_16K`, `check_elf_alignment.sh`, `adb shell getconf PAGE_SIZE` = `16384` trên emulator 16 KB — [Android Developers: 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
- Mâu thuẫn về hạn 16 KB: blog bên thứ ba nhắc các mốc 01/11/2025 và gia hạn tới 31/05/2026 — [Medium](https://medium.com/top-rail/you-have-until-may-31-2026-heres-how-to-fix-16kb-page-size-issue-on-flutter-apps-f2dbf6c2a6a3) **(bên thứ ba)**. Trang chính thức của Google hôm nay ghi 01/02/2027 cho bản cập nhật.
- Các bản Flutter stable mới nhất: **3.47.7 (08/10/2026, Dart 3.13.5)**, 3.47.6 (01/10/2026), 3.47.0 (12/08/2026) — [Flutter releases JSON](https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json). Trang release notes liệt kê 3.47.0, 3.44.0, 3.41.0, 3.38.0… (trang cập nhật 12/08/2026) — [Flutter release notes](https://docs.flutter.dev/release/release-notes)
- Flutter 3.47: template chuyển sang **AGP 9** với built-in Kotlin ("[AGP 9] Update templates to AGP 9+ and to Built-in Kotlin"); thêm Android 17 vào embedding; nâng phiên bản macOS tối thiểu để hỗ trợ Xcode 27; bỏ kiểm tra availability cho iOS 14 và 15; có thêm các thay đổi về SwiftPM — [Flutter 3.47.0 release notes](https://docs.flutter.dev/release/release-notes/release-notes-3.47.0)
- Nền tảng Flutter hỗ trợ: Android API "24 to 37" (CI test 24–36); iOS "15 to 27" (CI test 18 và 26); iOS 14 trở xuống không còn hỗ trợ — [Flutter docs: supported platforms](https://docs.flutter.dev/reference/supported-platforms). Mâu thuẫn: trang iOS deployment vẫn ghi "Flutter supports iOS 13 and later" — [Flutter docs: iOS deployment](https://docs.flutter.dev/deployment/ios)
- Mặc định Gradle của Flutter (nhánh stable): target/compile SDK 36, min SDK 24, NDK `28.2.13676358` — [FlutterExtension.kt](https://raw.githubusercontent.com/flutter/flutter/stable/packages/flutter_tools/gradle/src/main/kotlin/FlutterExtension.kt)
- Codemagic dùng Xcode 26.6 làm mặc định, có Xcode 27.2 ở image edge — [Codemagic docs](https://docs.codemagic.io/specs-macos/xcode-26-6/). GitHub `macos-latest` đang là macOS 26 — [actions/runner-images](https://github.com/actions/runner-images)

### Inferences
- **Flutter 3.47.x (bản mới nhất 3.47.7) đáp ứng:** Play target API 36 (mặc định là 36); 16 KB (NDK r28.2 căn sẵn với code native của plugin; AGP 9 cao hơn mức 8.5.1); Apple Xcode 26 / iOS 26 SDK (Flutter CI test với iOS 26, các máy CI mặc định có Xcode 26.6). Đặt iOS deployment target 15 là an toàn, vì cao hơn mức iOS 13 Apple yêu cầu và khớp bảng hỗ trợ mới của Flutter.
- **Hai mốc sắp tới cần theo dõi:**
  - Apple thường nâng yêu cầu SDK vào khoảng tháng 4 mỗi năm (tháng 4/2024 lên Xcode 15, tháng 4/2026 lên Xcode 26), nên có thể khoảng tháng 4/2027 sẽ phải build bằng Xcode 27 (`ASSUMPTION`: Apple chưa công bố).
  - Play: khoảng tháng 8/2027 có thể phải target API 37 (`ASSUMPTION`).
  Dùng CI trên cloud thì đổi phiên bản Xcode chỉ là đổi một dòng cấu hình.
- **16 KB:** các file `.so` của engine (`libflutter.so`) do Flutter build sẵn, và plugin bên thứ ba có thể kèm thư viện native riêng. Vì vậy nên chạy `bundletool dump config` và `zipalign -c -P 16` trên AAB đầu tiên, thay vì chỉ tin vào mặc định.

### Gaps
- Chưa có release note chính thức của Flutter nêu rõ từ bản nào engine căn 16 KB (một blog bên thứ ba nói 3.37, chưa kiểm được).
- Trang release notes 3.47.0 dài, tôi chỉ đọc được khoảng 100k ký tự đầu, nên có thể còn thay đổi về Android/iOS chưa ghi lại.
- Không tìm thấy trang Flutter ghi phiên bản Xcode tối thiểu; trang setup chỉ nói "install... the latest version of Xcode".
- Apple chưa công bố yêu cầu SDK cho năm 2027 (trang "Upcoming requirements" hôm nay không có mục nào sau tháng 9/2026).

---

## Câu 5: Tự động upload lên store (fastlane supply / pilot / deliver, Codemagic publishing, GitHub Actions marketplace, Shorebird code push) và chính sách của Apple/Google về code push

### Takeaway
Android: đẩy AAB lên track `internal` từ runner Linux bằng action `r0adkll/upload-google-play` hoặc fastlane `upload_to_play_store` (supply),
xác thực bằng JSON của service account; lần upload **đầu tiên phải làm tay** trong Play Console. iOS: Codemagic tự publish lên TestFlight
hoặc App Store bằng API key; trên GitHub Actions thì dùng fastlane `upload_to_testflight` (pilot) hoặc `xcrun altool --apiKey`. Từ WWDC25
Apple có thêm Build Upload API, upload build "using any language or platform". Shorebird code push chỉ vá được code Dart (không vá native
code, mặc định không vá assets); Shorebird tự nhận là tuân thủ chính sách của hai store dựa trên ngoại lệ dành cho interpreter, nhưng
guideline 2.5.2 của Apple vẫn cấm tải code làm thay đổi tính năng.

### Cited Findings
- Upload iOS theo Flutter docs: dùng Transporter (app macOS), `xcrun altool --upload-app --type ios -f build/ios/ipa/*.ipa --apiKey your_api_key --apiIssuer your_issuer_id`, hoặc Xcode (Validate, Distribute) — [Flutter docs: iOS deployment](https://docs.flutter.dev/deployment/ios)
- Flutter CD + fastlane: Android lane `upload_to_play_store(aab: "../build/app/outputs/bundle/release/app-release.aab")`; iOS lane `build_app(skip_build_archive: true, archive_path: ...)` rồi `upload_to_testflight`; `fastlane supply init` để kéo metadata từ Play về; JSON của service account: "Treat the .json file like your password"; trên CI dùng `json_key_data: ENV[...]` — [Flutter docs: Continuous delivery](https://docs.flutter.dev/deployment/cd)
- Codemagic publishing:
  ```yaml
  integrations:
    app_store_connect: <App Store Connect API key name>
  publishing:
    app_store_connect:
      auth: integration
      submit_to_testflight: true
      beta_groups:
        - group name 1
  ```
  Có thêm `submit_to_app_store`, `release_type: MANUAL | AFTER_APPROVAL | SCHEDULED`, `phased_release`. Bước xử lý sau upload chạy bất đồng bộ và "doesn't consume build minutes"; phải tạo app record trong App Store Connect trước, và nên upload bản đầu bằng tay để điền ảnh chụp màn hình, URL privacy policy, category — [Codemagic docs: publishing to App Store Connect](https://docs.codemagic.io/yaml-publishing/app-store-connect/)
- GitHub Action `r0adkll/upload-google-play`: dùng Google Play Developer API v3; các input `serviceAccountJsonPlainText`, `packageName`, `releaseFiles`, `tracks`, `status` (completed/inProgress/halted/draft), `mappingFile`, `debugSymbols`, `whatsNewDirectory`; muốn hết lỗi "Package not found" thì phải "upload an apk or aab manually first by creating a release through the play console" — [r0adkll/upload-google-play](https://github.com/r0adkll/upload-google-play)
- Build Upload API (WWDC25 session 324): "The new build upload API is a part of standardized App Store Connect APIs"; "you can upload your build using any language or platform you prefer"; quy trình là tạo BuildUpload (POST), tạo BuildUploadFile (tên, kích thước, loại asset), upload từng phần theo `uploadOperations`, rồi PATCH `uploaded: true`; trạng thái được báo qua webhook — [WWDC25: Automate your development process with the App Store Connect API](https://developer.apple.com/videos/play/wwdc2025/324/)
- iTMSTransporter dòng lệnh chạy trên macOS, Windows và Linux theo App Store Connect Help — [App Store Connect Help: upload asset packs](https://www.developer.apple.com/help/app-store-connect/manage-asset-packs/upload-apple-hosted-asset-packs) (đọc qua bản tóm tắt của kết quả tìm kiếm). Có báo lỗi app Transporter trên Windows mở lên rồi tắt ngay — [Apple Developer Forums](https://developer.apple.com/forums/thread/757632)
- Shorebird, giá: Free $0 với 5.000 lượt cài patch/tháng; Pro $20/tháng với 50.000 lượt (vượt thì $1 cho mỗi 2.500 lượt); Business $400/tháng với 1.000.000 lượt — [Shorebird pricing](https://shorebird.dev/pricing)
- Shorebird, những gì vá được: mọi code Dart, kể cả package thuần Dart; "Shorebird does not support changing native code (e.g. Java/Kotlin on Android or Objective-C/Swift on iOS)"; thay đổi assets mặc định bị chặn; package có native code chỉ dùng được nếu đã có sẵn trong bản đã phát hành; chỉ hỗ trợ kênh Flutter **stable**; nâng phiên bản Flutter phải phát hành bản mới lên store; trên iOS chạy patch bằng "a custom interpreter designed specifically for physical arm64 iOS devices", patch không chạy trên Simulator — [Shorebird FAQ](https://docs.shorebird.dev/code-push/faq/)
- Shorebird, lập luận tuân thủ: với Google Play, trích "This restriction does not apply to code that runs in a virtual machine or an interpreter"; với Apple, trích mục 3.3.1(b) cho phép interpreted code nếu không "change the primary purpose of the Application..." — [Shorebird FAQ](https://docs.shorebird.dev/code-push/faq/)
- Chính sách Google Play: "an app may not download executable code (such as dex, JAR, .so files) from a source other than Google Play"; ngoại lệ dành cho code chạy trong máy ảo hoặc interpreter, khi môi trường đó chỉ truy cập Android API một cách gián tiếp (ví dụ JavaScript trong webview) — [Play policy: Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379?hl=en)
- Apple App Review Guideline 2.5.2: app "may not download, install, or execute code which introduces or changes features or functionality of the app" — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Inferences
- **Cách upload ít rủi ro nhất cho người dùng Windows:**
  - Android: GitHub Actions trên runner Linux, rồi `r0adkll/upload-google-play` vào track `internal`. Không cần Ruby hay fastlane, và chạy cùng repo với CI sẵn có.
  - iOS: để Codemagic tự publish. Build Upload API cho phép tự viết script upload từ Linux/Windows, nhưng phiên này chưa thấy công cụ nào dùng nó (Codemagic CLI, fastlane) nên chưa nên dựa vào.
- **fastlane deliver** (đẩy metadata và ảnh lên App Store) có ích khi app đã ổn định. Lần đầu nên điền tay trên web, đúng như Codemagic khuyên.
- **Shorebird:** gói Free đủ cho app nhỏ. Chỉ nên dùng để sửa lỗi Dart, không dùng để thêm tính năng: lập luận "interpreter exemption" là của chính Shorebird, còn guideline 2.5.2 của Apple cấm code tải về làm thay đổi tính năng. Cho bản phát hành đầu tiên thì không cần Shorebird, và thêm sau cũng được (nhưng phải phát hành lại một bản build bằng Shorebird).

### Gaps
- Trang tài liệu "Build uploads" của Apple không hiển thị khi mở bằng công cụ, nên đường dẫn endpoint chưa được trích từ docs (chỉ có từ transcript WWDC).
- Chưa kiểm fastlane pilot, Codemagic CLI hay action nào trên GitHub Marketplace đã chuyển sang dùng Build Upload API chưa.
- Chưa đọc trực tiếp Apple Developer Program License Agreement mục 3.3.1(B) mà Shorebird trích, nên chưa xác nhận câu chữ gốc.
- Chưa kiểm phiên bản và ngày phát hành mới nhất của `r0adkll/upload-google-play` (phần Releases của trang trống khi mở bằng công cụ).

---

## Câu 6: Báo crash và các thứ cơ bản về chất lượng thường cần trước bản phát hành đầu tiên

### Takeaway
Firebase Crashlytics miễn phí. Sentry gói Developer miễn phí với 5k error, 1 người dùng, giữ dữ liệu 30 ngày; gói Team $29/tháng. Dù dùng
cái nào cũng phải upload symbols của Flutter (`--split-debug-info`) và mapping của R8, nếu không stack trace không đọc được. Trước khi nộp
bản iOS còn cần: demo account cho reviewer, tính năng xóa tài khoản ngay trong app (nếu app cho tạo tài khoản), privacy manifest, và trả
lời bộ câu hỏi age rating mới.

### Cited Findings
- Crashlytics, Analytics, App Distribution đều được ghi "No-cost" và có trong gói Spark — [Firebase pricing](https://firebase.google.com/pricing)
- Sentry Developer: miễn phí, 1 người dùng, 5k error, lưu 30 ngày, 50 session replay, 5M span; Team: $29/tháng (hoặc $26/tháng trả theo năm), không giới hạn người dùng, 50k error, lưu tới 90 ngày — [Sentry pricing](https://sentry.io/pricing/)
- File symbols của Flutter phải giữ lại để giải mã stack trace (`flutter symbolize`) — [Flutter docs: obfuscate](https://docs.flutter.dev/deployment/obfuscate); action upload lên Play nhận `mappingFile` (mapping.txt của R8) và `debugSymbols` — [r0adkll/upload-google-play](https://github.com/r0adkll/upload-google-play)
- Guideline 5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app"; guideline 2.1(a): phải đưa demo account cho reviewer và bật backend — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Privacy manifest (khai lý do dùng một số API, kể cả trong SDK bên thứ ba) bắt buộc từ 01/05/2024; age rating mới phải trả lời trước 31/01/2026 — [Apple: Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)

### Inferences
- Với ngân sách thấp, Crashlytics (miễn phí, không giới hạn số lỗi theo trang giá) hợp hơn. Sentry hợp hơn nếu muốn dùng một công cụ chung cho cả NestJS API và app; khi đó 5k error/tháng của gói free có thể hết nhanh nếu API cũng gửi lỗi về.
- **Rủi ro cụ thể cho dự án này:** theo CLAUDE.md, xóa tài khoản nằm ở Bước 8, nhưng guideline 5.1.1(v) yêu cầu có xóa tài khoản trong app ngay khi app cho đăng ký. Bản iOS đầu tiên có thể bị từ chối nếu chưa có tính năng này.
- Các bước CI nên làm cho mỗi bản phát hành: lưu thư mục symbols làm artifact (hoặc upload lên Crashlytics/Sentry), upload `mapping.txt` lên Play, và giữ AAB/IPA của từng versionCode.

### Gaps
- Chưa kiểm cách upload Dart symbols lên Crashlytics hoặc Sentry cho Flutter (lệnh `firebase crashlytics:symbols:upload`, `sentry_dart_plugin`), và chưa kiểm hai công cụ này có chạy trên Windows/Linux không.
- Chưa kiểm yêu cầu In-App Purchase của Apple cho gói Pro (guideline 3.1.1), dù Bước 5 có billing; việc này nằm ngoài phạm vi ghi chú này nhưng sẽ ảnh hưởng tới lần nộp app.

---

## Câu 7: Pipeline tối thiểu chi phí cho developer một mình, kèm ước tính chi phí hằng tháng

### Takeaway
Đề xuất: Android build trên GitHub Actions runner Linux (đã có sẵn), đẩy lên Play track `internal` bằng `r0adkll/upload-google-play`. iOS
build trên Codemagic gói Free cá nhân (500 phút M2/tháng), dùng automatic code signing bằng App Store Connect API key, tự publish lên
TestFlight. Crashlytics miễn phí. Chi phí cố định khoảng **US$8,25/tháng** (phí Apple $99/năm chia 12) cộng **$25 một lần** cho Google;
CI gần như $0 khi dùng trong mức miễn phí. Tháng nhiều build iOS (khoảng 60 lần × 15 phút) thì tốn thêm khoảng $38. Nên mua một iPhone
cũ để test, vì Apple yêu cầu đã test trên thiết bị.

### Cited Findings
- Apple Developer Program: "99 USD per membership year. Prices may vary by region and are listed in local currency during the enrollment process"; cá nhân cần Apple Account bật xác thực hai lớp, dùng tên thật; tổ chức cần D-U-N-S Number và website — [Apple: Enroll](https://developer.apple.com/programs/enroll/)
- Có báo cáo đăng ký từ Việt Nam bị mặc định vùng thanh toán UK (EUR); hỗ trợ của Apple khuyên dùng app Apple Developer — [Apple Developer Forums](https://developer.apple.com/forums/thread/688900) **(có thể đã cũ, trước 2025)**
- Google Play: phí đăng ký US$25 một lần — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- Codemagic Free: 500 phút M2/tháng; sau đó M2 $0,095/phút — [Codemagic pricing](https://codemagic.io/pricing/)
- GitHub Actions: Linux 2-core $0,006/phút; 2.000 phút miễn phí/tháng cho repo private ở gói Free; repo public miễn phí — [GitHub runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing); [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- Xcode Cloud có sẵn 25 compute hours/tháng nhưng cần Xcode để thiết lập — [Apple: Xcode Cloud](https://developer.apple.com/xcode-cloud/); [Flutter docs: CD](https://docs.flutter.dev/deployment/cd)
- Crashlytics miễn phí — [Firebase pricing](https://firebase.google.com/pricing)

### Inferences

Sơ đồ pipeline đề xuất:

```
push / tag trên GitHub (apps/mobile/**)
   ├─ GitHub Actions, ubuntu runner ── flutter build appbundle --obfuscate --split-debug-info
   │      └─ r0adkll/upload-google-play → Play track "internal" (closed test 12 tester / 14 ngày → production)
   └─ Codemagic, Mac mini M2 (working_directory: apps/mobile, changeset includes apps/mobile/**)
          ├─ ios_signing: distribution_type app_store (automatic, API key App Manager)
          ├─ flutter build ipa --obfuscate --split-debug-info  (+ xcode-project use-profiles)
          └─ publishing.app_store_connect → TestFlight (internal) → nộp review bằng tay
```

| Khoản | Một lần | Hằng tháng (bình thường) | Ghi chú |
|---|---|---|---|
| Apple Developer Program | — | ≈ $8,25 ($99/năm) | bắt buộc cho TestFlight/App Store |
| Google Play | $25 | $0 | |
| Codemagic (iOS) | — | $0 nếu ≤ 500 phút M2 | quá 500 phút: $0,095/phút |
| GitHub Actions (Android) | — | $0 nếu ≤ 2.000 phút Linux (private) | quá: $0,006/phút |
| Crashlytics | — | $0 | |
| iPhone cũ để test | ? (chưa có giá) | — | nên có vì guideline 2.1 |
| **Tổng** | **$25 + iPhone** | **≈ $8–10** | |

- Mức dùng nhiều: 60 lần build iOS × 15 phút = 900 phút, tức 400 phút tính tiền × $0,095 = **$38** thêm (`ASSUMPTION`: 15 phút mỗi lần build, chưa đo).
- **Các phương án khác:**
  - (B) iOS cũng chạy trên GitHub Actions `macos-latest` với fastlane match: một chỗ CI duy nhất, không phụ thuộc Codemagic. Đổi lại: tự lo signing, và chi phí cao hơn nếu repo private ($0,062/phút; phút miễn phí chỉ còn khoảng 200 nếu đúng là nhân 10). Nếu repo public thì miễn phí, nhưng code app bị công khai.
  - (C) Thuê Scaleway M1 €75/tháng hoặc mua Mac mini M1 cũ (khoảng €239–421): có Xcode GUI và debug trên simulator. Chỉ đáng khi lỗi riêng của iOS xuất hiện nhiều.
  - (D) Xcode Cloud (25 giờ miễn phí): rẻ, nhưng cần Mac một lần để tạo workflow.
- **Lộ trình hợp lý:** bắt đầu bằng phương án A (gần như $0 tiền CI). Nếu gặp lỗi riêng của iOS mà không debug được qua TestFlight hay VNC của Codemagic, thì thuê Mac theo giờ hoặc tháng, hoặc mua Mac mini cũ.
- **Rủi ro chưa giải quyết:**
  - Chưa đo thời gian build iOS thật.
  - Bitrise và hệ số nhân phút macOS của GitHub chưa xác minh được.
  - Có thể bị từ chối nếu chưa có xóa tài khoản trong app (5.1.1(v)).
  - Phải chờ đủ 12 tester trong 14 ngày mới lên production Android được.
  - Đăng ký Apple từ Việt Nam có thể vướng vùng thanh toán (thông tin từ forum cũ).

### Gaps
- Không có nguồn cho thời gian build thực tế của một app Flutter trên Codemagic M2 hay GitHub macOS runner; con số 10–20 phút là giả định.
- Không có giá VND chính thức của Apple Developer Program; Apple chỉ nói giá hiển thị theo tiền địa phương lúc đăng ký.
- Chưa có giá iPhone cũ ở Việt Nam để test.
- Chưa kiểm Codemagic có cho tài khoản Free cá nhân dùng `codemagic.yaml` với automatic signing và publish hay không (trang giá không ghi giới hạn tính năng nào của gói Free ngoài số phút, số build song song và support).
