# Module spec — Identity & Access

> Sinh bởi `write-spec`, lần chạy `v1-specs`, đợt 2. Mẫu `module-spec.md`. Cách trích dẫn: **K#, N#, F#** =
> [DECISIONS](DECISIONS_2026-10-04.md) và [kế hoạch](SPEC_PLAN_AND_DECISIONS_2026-10-04.md); **R#** =
> [research.md](../tasks/v1-specs/research.md); **S#, SR#** = [system-spec](system-spec.md); **ASSUMPTION** = chưa có nguồn.
> Vùng cần Defense Analysis (đăng nhập, OTP, phiên) nằm ở mục **Defense Analysis** cuối file.

**Ngày:** 2026-10-04 · **Module:** Identity & Access · **Spec run:** v1-specs

## Observed on

Không có hệ thống tham chiếu. Spec dựa trên quyết định của chủ dự án và các nguồn đã đọc (R17–R31).

| Surface | How accessed | By whom | When |
|---|---|---|---|
| Quyết định về tài khoản (K3–K9, F6–F12, N1, N2) | Chat | Chủ dự án | 02–04/10/2026 |
| Hướng dẫn xác thực NestJS, RFC 9700 §2.2.2 | Công cụ tải trang, đọc qua tóm tắt | Trợ lý | 04/10/2026 |

## Scope

Module sở hữu: **người dùng và danh tính đăng nhập** (email + mật khẩu, Google), **xác minh email và quên mật khẩu
bằng OTP**, **phiên** (access token + refresh token theo từng thiết bị), **hồ sơ** (tiếng mẹ đẻ, múi giờ), **vai trò admin**,
**xóa tài khoản** và việc gửi thư của chính module (qua cổng `Mailer`). Ranh giới: quyền dùng feature và hạn mức thuộc
Entitlements (Identity chỉ cung cấp "email đã xác minh chưa"); mỗi module khác tự xóa dữ liệu của mình theo yêu cầu xóa tài khoản.

**Ngoài phạm vi V1:** Sign in with Apple (là điều kiện trước khi ra bản iOS có Google Sign-In, R15; mô hình danh tính phải
chứa được provider thứ ba); MFA và TOTP; đăng nhập không mật khẩu; **đổi email**; màn hình danh sách và thu hồi thiết bị;
màn quản lý admin; provider đăng nhập khác Google (F10, F11, K2).

## Constraints

| Constraint | Imposed by | Why it is not the implementer's choice |
|---|---|---|
| Mật khẩu lưu bằng Argon2id, cấu hình không yếu hơn m=19456 KiB, t=2, p=1 | Chủ dự án (K2) | Chọn từ nguồn R17 |
| OAuth 2.0 authorization code với PKCE cho mọi client; không dùng implicit grant hay password grant | Chủ dự án (K2) và R21 | Khó đổi sau khi có client |
| Mobile phải đăng nhập Google qua trình duyệt hệ thống hoặc Google Sign-In/AppAuth, không dùng WebView nhúng | Google và RFC 8252 (R23, R25) | Google chặn WebView nhúng |
| Refresh token của phiên được xoay vòng, và dùng lại token cũ thì thu hồi cả chuỗi | Chủ dự án (K5), tham khảo RFC 9700 §2.2.2 và §4.14.2 (R22) | Lựa chọn của chủ dự án; RFC điều chỉnh máy chủ OAuth cấp token cho client OAuth, ở đây dùng tương tự chứ không bị ràng buộc |
| Backend phải xác minh **chữ ký** ID token bằng khóa công khai của Google, rồi kiểm `iss`, `aud`, `exp`, và dùng `sub` làm khóa | Google (R24) | Cách danh tính Google được định nghĩa; thiếu chữ ký thì token giả vẫn qua |
| Token trên mobile lưu bằng secure storage (Keychain, Keystore) | Khuyến nghị của nguồn (R26); không nằm trong 13 mục của K2 | Bảo vệ token trên thiết bị |
| OTP chỉ dùng cho xác minh email và quên mật khẩu | Chủ dự án; NIST cấm email làm kênh xác thực out-of-band, ngoại lệ cho xác minh và khôi phục (R27) | Ranh giới đã chốt |
| Gửi thư qua SMTP Google (đổi được sau cổng `Mailer`); Workspace tối đa 2.000 thư/ngày (500 với tài khoản trial) và 3.000 người nhận bên ngoài/ngày | Chủ dự án (F12); R29 | Điều kiện của Gmail cá nhân chưa đọc |
| Mật khẩu: tối thiểu 8 ký tự và bắt buộc chữ hoa, chữ thường, số, ký tự đặc biệt | Chủ dự án (K9) | Lựa chọn của chủ dự án, **khác NIST** (R27: 15 ký tự, không quy tắc thành phần) |
| Bản iOS có Google Sign-In phải có Sign in with Apple | Apple 4.8 (R15) | Chính sách store |

## Business rules

| # | Quy tắc | Nguồn |
|---|---|---|
| IR1 | **Email.** Chuẩn hóa bằng cách cắt khoảng trắng và đưa về chữ thường. Mỗi người dùng có đúng một email chính; không có hai người dùng cùng email chính đã chuẩn hóa. Chuẩn hóa chưa gộp địa chỉ dạng `+nhãn` hoặc dấu chấm của Gmail, nên một hộp thư có thể xác minh nhiều địa chỉ: chấp nhận ở pilot | F10; chấp nhận rủi ro `ASSUMPTION` |
| IR2 | **Đăng ký bằng email + mật khẩu.** Tạo người dùng chưa xác minh với danh tính `password` và gửi OTP xác minh. Vì người dùng chưa xác minh dùng được tính năng Free ngay (K7), việc email đã có tài khoản **không che được** ở bước đăng ký: đăng ký email đã có tài khoản trả lỗi "email đã được dùng" và không tạo gì. Đăng nhập, quên mật khẩu và gửi lại OTP vẫn không tiết lộ email có tồn tại hay không; giới hạn tần suất của OTP và 429 tính theo chuỗi email dù tài khoản có hay không | K7, R18, R19; chấp nhận lộ ở đăng ký `ASSUMPTION` (đã nêu ở DECISIONS mục 9) |
| IR3 | **Mật khẩu.** Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ít nhất một ký tự không phải chữ hay số; tối đa 128 ký tự; mọi ký tự được chấp nhận. Lưu bằng Argon2id; không bao giờ ghi vào log. Báo lỗi liệt kê các quy tắc chưa đạt | K9, R17; trần 128 và định nghĩa "ký tự đặc biệt" là `ASSUMPTION` |
| IR4 | **OTP.** 6 chữ số, sinh bằng bộ sinh số ngẫu nhiên an toàn mật mã, hiệu lực 10 phút, dùng một lần, tối đa 5 lần thử mỗi mã, gửi lại sau tối thiểu 60 giây, tối đa 5 lần gửi mỗi giờ mỗi email, lưu dạng hash. Mã mới vô hiệu mã cũ cùng mục đích. Ngoài giới hạn mỗi mã còn có **trần cộng dồn**: quá 20 lần nhập sai (mọi mã, cùng mục đích) trong 24 giờ trên một tài khoản thì mục đích đó bị khóa 24 giờ cho tài khoản này và chủ email nhận thư thông báo; bộ đếm lần thử cập nhật nguyên tử nên thử song song không vượt giới hạn. Chỉ có hai mục đích: `verify_email` và `reset_password`; mã của mục đích này không dùng được cho mục đích kia; OTP không bao giờ dùng để đăng nhập hay xác nhận xóa tài khoản | F6, R18, R27, R47; con số và trần cộng dồn `ASSUMPTION` |
| IR5 | **Xác minh email.** Nhập đúng OTP `verify_email` thì email được đánh dấu đã xác minh. Người dùng chưa xác minh dùng được các tính năng Free; việc kích hoạt trial yêu cầu email đã xác minh (Entitlements kiểm). Tài khoản tạo bằng Google tự được coi là đã xác minh | K7 |
| IR6 | **Đăng nhập bằng mật khẩu.** Lỗi trả thông báo chung chung, không phân biệt email sai hay mật khẩu sai, cả về nội dung lẫn thời gian phản hồi. Sau 10 lần sai liên tiếp trên một tài khoản, đăng nhập bằng mật khẩu của tài khoản đó bị tạm khóa 15 phút; có thêm giới hạn theo IP. Khóa chỉ áp dụng cho đăng nhập bằng mật khẩu, không chặn đăng nhập Google hay đặt lại mật khẩu. Đăng nhập thành công đặt lại bộ đếm | F7, R19, R18; không chặn Google và đặt lại là `ASSUMPTION` (tránh kẻ tấn công khóa người dùng thật) |
| IR7 | **Quên mật khẩu.** Nhập email thì (nếu tồn tại) gửi OTP `reset_password`; phản hồi giống nhau cho email có và không có tài khoản. Đặt mật khẩu mới bằng OTP đúng và mật khẩu mới hợp lệ (IR3); mật khẩu cũ mất hiệu lực; mọi phiên bị thu hồi; chủ email nhận thư thông báo (IR22). Nếu tài khoản chỉ có Google, hoàn tất đặt lại sẽ **thêm** danh tính mật khẩu. OTP đúng cũng xác minh email | F8, R18; thêm danh tính mật khẩu và xác minh email là `ASSUMPTION` |
| IR8 | **Đăng nhập Google.** OAuth 2.0 authorization code với PKCE; mobile qua trình duyệt hệ thống hoặc Google Sign-In/AppAuth. Backend xác minh chữ ký ID token bằng khóa công khai của Google, rồi kiểm `iss`, `aud`, `exp`, và dùng `sub` làm khóa danh tính, không dùng email. Nếu `email_verified` là false thì từ chối. Người dùng mới tạo bằng Google là đã xác minh và chưa hoàn tất thiết lập hồ sơ | K2, R21, R23–R25; từ chối khi `email_verified` false là `ASSUMPTION` |
| IR9 | **Liên kết.** Khi ID token Google có email trùng một người dùng sẵn có: (a) nếu email của người đó **đã xác minh** thì gắn danh tính Google vào chính người đó; (b) nếu **chưa xác minh** thì xóa thông tin xác thực mật khẩu của người đó, thu hồi mọi phiên của họ, rồi gắn danh tính Google (dữ liệu của người đó được giữ). Không trùng thì tạo người dùng mới. Mỗi danh tính (provider, subject) thuộc đúng một người dùng | K8; giữ dữ liệu ở (b) là `ASSUMPTION` |
| IR10 | **Phiên.** Sau đăng nhập cấp **access token** (JWT, sống 15 phút) và **refresh token** (chuỗi ngẫu nhiên, lưu dạng hash, mỗi thiết bị một "chuỗi phiên" có nhãn thiết bị, thời điểm tạo và lần dùng cuối). Web: refresh token trong cookie `HttpOnly`, `Secure`, `SameSite`; access token giữ trong bộ nhớ trang. Mobile: cả hai trong secure storage. Mỗi lần đăng nhập tạo chuỗi phiên mới | K5, N2, R20, R26, R31; 15 phút và độ dài token `ASSUMPTION` |
| IR11 | **Xoay vòng.** Mỗi lần gia hạn trả cặp token mới và refresh token cũ mất hiệu lực. Dùng lại refresh token đã xoay vòng thì **thu hồi cả chuỗi phiên của thiết bị đó** và buộc đăng nhập lại (RFC 9700 §4.14.2 không có khoảng ân hạn). **Ngoại lệ do spec tự chọn:** trong 10 giây sau lần gia hạn thành công, một request song song mang token cũ nhận lại cặp token vừa cấp, nhưng chỉ khi chuỗi chưa bị thu hồi (logout hoặc đổi mật khẩu trong khoảng đó thắng); cặp trả lại được giữ dạng mã hóa tối đa 10 giây và mọi lần dùng ân hạn được ghi log | N2, R22, R31; khoảng ân hạn và cách giữ cặp trả lại `ASSUMPTION` |
| IR12 | **Hết hạn.** Refresh token hết hiệu lực sau 90 ngày không dùng (trượt) hoặc 365 ngày kể từ lúc đăng nhập (tuyệt đối); khi đó phải đăng nhập lại | K6, R20; con số `ASSUMPTION` |
| IR13 | **Logout.** Thu hồi chuỗi phiên của thiết bị đang gọi; thiết bị khác không đổi. Access token đã cấp vẫn dùng được tối đa đến khi hết hạn (15 phút): đây là giới hạn đã biết. Thao tác nhạy cảm (đổi mật khẩu, xóa tài khoản) luôn đòi xác nhận lại danh tính nên không phụ thuộc access token | F9, R31, R20 |
| IR14 | **Đổi và đặt lại mật khẩu.** Đổi (đã đăng nhập, nhập mật khẩu hiện tại và mật khẩu mới hợp lệ) thu hồi mọi chuỗi phiên khác và **chuyển thiết bị hiện tại sang một chuỗi phiên mới** (chuỗi cũ bị thu hồi); đặt lại thu hồi tất cả. Cả hai gửi thư thông báo (IR22) | F8, R20 |
| IR15 | **Số thiết bị.** Tối đa 10 chuỗi phiên hoạt động mỗi tài khoản; vượt thì chuỗi cũ nhất bị thu hồi | ASSUMPTION |
| IR16 | **Hồ sơ.** Tiếng mẹ đẻ (thuộc danh sách ngôn ngữ được hỗ trợ; bắt buộc chọn ở lần thiết lập đầu trước khi dùng nội dung học; client gợi ý theo locale thiết bị) và múi giờ IANA (mặc định từ thiết bị); đổi được trong cài đặt. Các module khác đọc hai giá trị này | K4, SR3, SR13 |
| IR17 | **Vai trò admin.** Gán bằng cấu hình hoặc lệnh khởi tạo, không có API nào tự cấp. Server đọc vai trò từ dữ liệu lưu, không từ token, và thao tác admin còn kiểm chuỗi phiên chưa bị thu hồi | K1, N1, SR9; kiểm chuỗi phiên `ASSUMPTION` |
| IR18 | **Xóa tài khoản.** Yêu cầu xác nhận lại: nhập mật khẩu (nếu có danh tính mật khẩu), hoặc đăng nhập Google lại với yêu cầu xác thực lại (`prompt=login` hoặc `max_age`) và kiểm `auth_time` trong vòng 5 phút (nếu chỉ có Google). Thứ tự: (1) tài khoản chuyển sang trạng thái **"đang xóa"**: từ lúc này **mọi request của người đó bị từ chối**, kể cả khi mang access token còn hạn, nên không có dữ liệu mới nào được ghi; (2) mọi phiên bị thu hồi; (3) mọi module xóa dữ liệu của người đó; (4) Identity xóa người dùng và danh tính cuối cùng. Nếu một module lỗi giữa chừng, việc xóa được thử lại cho đến khi xong | K3, SR11, R24; nhánh Google, trạng thái "đang xóa" và thứ tự `ASSUMPTION` (K3 ghi "mật khẩu hoặc OTP", nhưng OTP chỉ dành cho hai mục đích khác, xem decision D12) |
| IR19 | **Gửi thư.** Qua cổng `Mailer`: local dùng SMTP giả, production dùng SMTP Google, đổi được nhà cung cấp mà không đụng lõi; gửi từ domain có SPF hoặc DKIM. Lỗi gửi một thư không lộ ra phản hồi API (vẫn như thành công), được ghi log và cảnh báo; người dùng gửi lại sau thời gian chờ. Có **ngân sách gửi thư toàn hệ thống mỗi ngày**, **cấu hình được** và đặt thấp hơn trần thật của nhà cung cấp (mặc định 1.500 khi dùng Workspace, trần 2.000; nếu dùng Gmail cá nhân thì trần có thể chỉ 500 mỗi 24 giờ theo nguồn thứ cấp, chưa có nguồn Google, R29) và giới hạn theo IP mỗi ngày; khi cạn, hệ thống **từ chối rõ ràng** đăng ký và yêu cầu OTP mới bằng lỗi "tạm thời không gửi được thư" thay vì báo thành công im lặng, và cảnh báo owner khi đạt 80%. OTP không bao giờ vào log | F12, R28–R30, F4; ngân sách `ASSUMPTION` |
| IR20 | **Giới hạn tần suất.** Đăng ký, gửi OTP, đăng nhập, gia hạn đều giới hạn theo IP và theo email hoặc tài khoản (khóa theo chuỗi email dù tài khoản có hay không); vượt thì trả 429 kèm thời gian chờ | SR14, R18; con số `ASSUMPTION` |
| IR21 | **Dữ liệu tối thiểu.** Chỉ lưu email, hash mật khẩu, danh tính, chuỗi phiên (nhãn thiết bị, thời điểm), hash OTP, hồ sơ, vai trò. Không lưu địa chỉ IP lâu dài | F4; không lưu IP `ASSUMPTION` |
| IR22 | **Thư thông báo.** Gửi cho chủ email (có giới hạn tần suất) khi: đặt lại hoặc đổi mật khẩu thành công, thêm danh tính mật khẩu vào tài khoản chỉ có Google, liên kết Google vào tài khoản có sẵn, và khi OTP bị khóa do vượt trần cộng dồn | R18 (OWASP khuyến nghị gửi thư sau khi đặt lại); các trường hợp còn lại `ASSUMPTION` |

## Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| I1 | When someone registers with a new email and a valid password, then an unverified user is created, a verification OTP is emailed, and the Free features can already be used | K7 |
| I2 | When someone registers with an email that already has an account, then the request is refused with an "email already used" error and no second account is created, while sign-in, password reset and OTP resend still do not reveal whether an email exists | K7 |
| I3 | When a password lacks length, an uppercase letter, a lowercase letter, a digit or a special character, then registration or change is refused and the message lists the rules not met | K9 |
| I4 | When the correct `verify_email` OTP is entered within 10 minutes, then the email becomes verified and the code cannot be used again | F6 |
| I5 | When a wrong code is entered 5 times for one OTP, then that OTP is invalidated and a new one must be requested | F6 |
| I6 | When an OTP is requested again less than 60 seconds after the last one, or more than 5 times in an hour for the same email, then the request is refused with 429 and a wait time | F6 |
| I7 | When an OTP issued for password reset is submitted to verify an email, or the reverse, then it is rejected | F6 |
| I8 | When a password reset is requested for an unknown email, then the response and its timing are indistinguishable from a known email | R18 |
| I9 | When a reset OTP and a valid new password are submitted, then the old password stops working and every session of the user is revoked | F8 |
| I10 | When a login fails, then the message is the same for an unknown email and a wrong password | R19 |
| I11 | When an account has 10 consecutive failed password logins, then password login for that account is refused for 15 minutes, while Google sign-in and password reset still work | IR6 (`ASSUMPTION` for the Google and reset exemption) |
| I12 | When a user signs in with Google for the first time, then a user is created with a verified email, keyed by the Google `sub`, and profile setup is still required | K7 |
| I13 | When the Google ID token has an invalid or missing signature, a wrong `aud`, a wrong `iss`, is expired, or has `email_verified` false, then sign-in is refused | R24 (`ASSUMPTION` for refusing `email_verified` false) |
| I14 | When a Google email matches an existing user whose email is verified, then the Google identity is attached to that user and either method then signs in the same account | K8 |
| I15 | When a Google email matches an existing user whose email is not verified, then that user's password credential is removed, all its sessions are revoked, and the Google identity is attached | K8 |
| I16 | When a refresh token is used, then a new access and refresh pair is returned and the old refresh token no longer works | N2 |
| I17 | When an already-rotated refresh token is presented again after the grace period, then every session of that device is revoked and login is required | N2 |
| I18 | When a refresh token has been idle for 90 days or is 365 days old, then it is refused and the user must sign in again | K6 |
| I19 | When a user logs out on one device, then only that device's session is revoked and other devices stay signed in | F9 |
| I20 | When a user changes the password while signed in, then every other device is signed out, the current device continues on a new session chain, and the old chain no longer works | R20 |
| I21 | When a non-admin calls an admin operation, or an admin's session was revoked, then the call is refused whatever the token claims | K1 |
| I22 | When a new user has not chosen a native language, then learning content is not served until it is chosen, and changing it later changes the interface and default explanation language | K4 |
| I23 | When a user deletes the account after re-authenticating, then the account goes to "deleting", sessions are revoked, every module deletes the user's data, and the user and identities are removed last | K3 |
| I24 | When Entitlements asks whether a user's email is verified, then Identity answers from the stored state | K7 |
| I25 | When an account is in the "deleting" state, then every request from that user, even with an unexpired access token, is refused and no data is written | IR18 (`ASSUMPTION`) |
| I26 | When a password is reset or changed, then the owner of the email receives a notification message | R18 |
| I27 | When the daily mail budget is exhausted, then new registrations and OTP requests are refused with a clear "mail temporarily unavailable" error and the owner is alerted at 80% | IR19 (`ASSUMPTION`) |
| I28 | When more than 20 wrong OTP entries are made on one account for one purpose within 24 hours, then that purpose is locked for 24 hours for that account and the owner of the email is notified | R47 |

## Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| IE1 | Two tabs or two requests refresh with the same refresh token within 10 seconds | Both receive the same new pair; nothing is revoked | IR11 (`ASSUMPTION`) |
| IE2 | A rotated refresh token is replayed after the grace period (stolen token) | The whole session chain of that device is revoked; the legitimate device must sign in again | N2 |
| IE3 | An 11th device signs in | The oldest session chain is revoked | IR15 (`ASSUMPTION`) |
| IE4 | A Google user later changes the email of the Google account | The user is still found by the Google `sub` | R24 |
| IE5 | A user who only has a Google identity tries password login | The same generic failure as any other failed login | R19 |
| IE6 | The SMTP provider is down when an OTP must be sent | The API still answers as for success, the failure is logged and alerted, the user can ask again after the cooldown | IR19 |
| IE7 | A verified user asks for a `verify_email` OTP | The response looks the same, no code is sent | ASSUMPTION |
| IE8 | The email is entered as `  Foo@Example.com ` | It is normalised and matches the user registered as `foo@example.com` | F10 |
| IE9 | A password longer than 128 characters or with Unicode characters | Up to 128 characters of any kind are accepted; longer is refused with a Problem Details error | IR3 (`ASSUMPTION`) |
| IE10 | The access-token signing key is rotated | Tokens signed with the old key stop working and clients recover through their refresh token without a new login | ASSUMPTION |
| IE11 | A login is attempted while the account is in the "deleting" state | Refused with the generic failure | IR18 (`ASSUMPTION`) |
| IE12 | Two registrations for the same new email arrive at the same moment | Exactly one user is created | IR1 (`ASSUMPTION`) |
| IE13 | A Google-only user completes a password reset | A password identity is added and the user can sign in either way | IR7 (`ASSUMPTION`) |
| IE14 | A logout or a password change happens inside the 10-second grace window of a refresh | The grace pair is refused and the revoked chain stays revoked | IR11 (`ASSUMPTION`) |
| IE15 | Google's sign-in service is slow or down | Google sign-in fails with a Problem Details error and no partial account is created; password login is unaffected | IR8 (`ASSUMPTION`) |

## Defense Analysis

Chưa chạy thử; mọi dòng là phân tích hành vi mong muốn. Con số "xác suất" là tính toán của trợ lý, không có trong nguồn.

**Đường đi bình thường.** Đăng ký → OTP xác minh → dùng Free; hoặc đăng nhập Google → hồ sơ → dùng Free; đăng nhập trả cặp token, gia hạn xoay vòng, logout thu hồi chuỗi của thiết bị.

**Bất biến.** (1) Mỗi email có đúng một người dùng. (2) Mỗi danh tính (provider, subject) thuộc đúng một người dùng. (3) Mỗi refresh token chỉ dùng một lần, trừ khoảng ân hạn đã nêu. (4) OTP một lần, một mục đích, có hạn và có trần thử. (5) Không có bí mật trong log. (6) Vai trò admin chỉ đến từ cấu hình. (7) Người dùng "đang xóa" không ghi được dữ liệu.

| Case | Hành vi bảo vệ | Phát hiện → khôi phục | Kiểm chứng dự kiến |
|---|---|---|---|
| Dò mật khẩu, credential stuffing | Đếm theo tài khoản và theo IP, lỗi chung chung (IR6, R19) | Số lần đăng nhập sai theo giờ → khóa tự hết sau 15 phút | 10 lần sai liên tiếp; nhiều IP cùng một tài khoản |
| Kẻ tấn công khóa tài khoản của người khác | Khóa chỉ chặn đăng nhập bằng mật khẩu, không chặn Google và đặt lại (IR6) | — | Tài khoản đang khóa vẫn đặt lại được mật khẩu |
| Đoán OTP | 6 chữ số, 5 lần thử mỗi mã, hiệu lực 10 phút, tối đa 5 lần gửi mỗi giờ, **và trần cộng dồn 20 lần sai mỗi 24 giờ mỗi tài khoản** (IR4). Tính của trợ lý (không có trong nguồn): một mã bị đoán trúng trong 5 lần thử ở mức 5 trên 10^6; với trần cộng dồn, khả năng một kẻ tấn công đoán trúng mã đặt lại của một tài khoản là khoảng 0,002% mỗi ngày (20 trên 10^6) và khoảng 0,7% sau một năm; khi chưa có trần cộng dồn, ở mức gửi tối đa là 25 lần thử mỗi giờ, tức khoảng 20% sau một năm. NIST giới hạn 100 lần thất bại liên tiếp (R47) | Số OTP sai theo email → cảnh báo và khóa mục đích | 21 lần nhập sai trong 24 giờ thì bị khóa; thử song song không vượt giới hạn |
| Dò email có tài khoản hay không | Quên mật khẩu, gửi lại OTP và đăng nhập không tiết lộ (IR6, IR7, R18). **Đăng ký thì lộ**, vì K7 cho dùng Free ngay khi chưa xác minh (IR2); chấp nhận ở pilot, ghi ở DECISIONS mục 9 | — | So sánh phản hồi và thời gian giữa email có và không có ở ba luồng không lộ |
| Chiếm trước tài khoản (đăng ký email của nạn nhân) | Đăng nhập Google với email đó xóa mật khẩu chưa xác minh và thu hồi phiên (IR9, K8) | — | Đăng ký rồi để chưa xác minh, sau đó đăng nhập Google cùng email |
| Chiếm hộp thư rồi đặt lại mật khẩu | Rủi ro vốn có của khôi phục qua email; NIST cho phép riêng mục đích khôi phục (R27). Đặt lại thu hồi mọi phiên | Người dùng nhận thư OTP | Chấp nhận, không giảm thêm ở V1 |
| Trộm refresh token | Xoay vòng, dùng lại token cũ thì thu hồi chuỗi (IR11, N2) | Sự kiện "dùng lại token" → log và cảnh báo | Phát lại token cũ ngoài ân hạn |
| Request gia hạn song song báo thu hồi oan | Khoảng ân hạn 10 giây, chỉ khi chuỗi chưa bị thu hồi; cặp trả lại giữ dạng mã hóa tối đa 10 giây; mọi lần dùng ân hạn được ghi log (IR11, IE1, IE14) | Số lần dùng ân hạn bất thường theo chuỗi | Hai request gia hạn cùng lúc; logout trong khoảng ân hạn |
| Cố định phiên | Mỗi lần đăng nhập tạo chuỗi phiên mới (IR10, R20) | — | Phiên cũ không dùng lại được sau đăng nhập |
| Logout nhưng access token còn sống | Giới hạn đã biết ≤15 phút; thao tác nhạy cảm đòi xác nhận lại (IR13) | — | Dùng access token sau logout trong 15 phút |
| CSRF vào endpoint gia hạn bằng cookie | Cookie `SameSite` (R20) và yêu cầu thêm một header tùy chỉnh trên endpoint gia hạn của web | — | Yêu cầu gia hạn từ trang khác |
| ID token Google dùng sai nơi | Kiểm `iss`, `aud`, `exp` (IR8, R24) | — | Token của ứng dụng khác bị từ chối |
| Đăng ký lỗi giữa chừng (đã tạo user, thư chưa gửi được) | Người dùng yêu cầu gửi lại sau thời gian chờ; tài khoản vẫn ở trạng thái chưa xác minh (IR19) | Log lỗi gửi thư | SMTP lỗi lúc đăng ký |
| Xóa tài khoản lỗi giữa chừng | Trạng thái "đang xóa", thử lại đến khi xong (IR18) | Tài khoản "đang xóa" quá lâu → cảnh báo | Một module lỗi lúc xóa |
| Khôi phục từ backup làm sống lại phiên đã thu hồi | Sau khi khôi phục DB, thu hồi mọi phiên và buộc đăng nhập lại | — | Khôi phục một bản sao cũ |
| Khóa ký access token bị lộ hoặc cần đổi | Đổi khóa; client phục hồi bằng refresh token (IE10) | — | Đổi khóa trong lúc client đang chạy |
| Quan sát | Log sự kiện: đăng nhập sai, khóa, dùng lại refresh, gửi OTP, đăng nhập Google; mang `operation_id`, không có bí mật (F4) | Thống kê theo giờ | Tìm được sự kiện qua `operation_id`; log không chứa mật khẩu hay OTP |
| Ngân sách thư cạn hoặc Google lỗi | Ngân sách thư toàn hệ thống và theo IP, từ chối rõ ràng khi cạn (IR19, I27); đăng nhập Google lỗi không tạo tài khoản dở dang (IE15) | Cảnh báo ở 80% ngân sách; tỉ lệ lỗi đăng nhập Google | Gửi 1.500 yêu cầu OTP; ngắt dịch vụ Google giả |

### Bổ sung theo mẫu Defense Analysis (05/10/2026)

Theo `docs/preparation/DECISION_ANALYSIS_TEMPLATE.md`. Chưa chạy thử; con số dung lượng là ước tính từ tham số đã biết, không phải số đo.

| Nhóm case | Phân tích |
|---|---|
| Tiến hóa và tương thích | Thêm provider đăng nhập (Apple bắt buộc khi ra iOS, R15) là thêm một dòng danh tính, không đổi người dùng (IR9, K2). Thêm MFA hoặc TOTP sau này không đụng phiên vì phiên gắn với chuỗi, không gắn với yếu tố xác thực. Đổi email sau này khả thi vì khóa là user ID, không phải email (SR2). Thêm ngôn ngữ chỉ thêm giá trị vào danh sách tiếng mẹ đẻ được hỗ trợ (IR16). Client mobile cũ: endpoint đăng nhập và gia hạn nằm dưới `/v1` và chỉ thêm field (SR7), nên token cũ vẫn gia hạn được |
| Idempotency và trùng lặp | Đăng ký hai lần cùng lúc chỉ tạo một người dùng (IE12). Nhập đúng OTP hai lần: lần hai báo mã đã dùng, không đổi trạng thái. Logout hai lần: idempotent, lần hai không lỗi. Gia hạn trùng trong 10 giây: nhận lại cùng cặp (IR11). Xóa tài khoản hai lần: lần hai bị từ chối như mọi request khác của tài khoản "đang xóa" (IR18); việc xóa vẫn tiếp tục từ lần một |
| Timeout và retry | Gửi thư **đồng bộ trong request** với timeout ngắn (đề xuất 10 giây); không dùng hàng đợi vì worker chỉ dành cho việc nhập nội dung. Lỗi hoặc hết thời gian được log và cảnh báo, phản hồi vẫn như thành công, người dùng gửi lại sau thời gian chờ (IR19). Gọi dịch vụ Google có timeout; hết hạn thì đăng nhập Google trả lỗi Problem Details, không tạo tài khoản dở dang (IE15). Con số timeout (đề xuất 10 giây mỗi lời gọi) là `ASSUMPTION` |
| Năng lực và chi phí vận hành | Argon2id với tham số tối thiểu dùng khoảng 19 MiB mỗi lần băm (m=19456 KiB, R17), nên 5 lần đăng nhập đồng thời là khoảng 95 MiB; cần giới hạn số lần băm chạy cùng lúc để một đợt đăng nhập không làm hết bộ nhớ (`ASSUMPTION`). Kiểm "đang xóa" mỗi request là một lần đọc trạng thái người dùng; có thể đọc từ bộ nhớ đệm ngắn hạn. Thư tối đa 1.500 mỗi ngày (IR19), pilot tối đa 50 người nên thấp hơn nhiều. Số này chưa đo |
| Đánh đổi chấp nhận | Logout trễ tối đa 15 phút với access token đã cấp (IR13); lộ email đã đăng ký ở bước đăng ký (IR2, DECISIONS mục 9); ân hạn 10 giây khi gia hạn so với RFC 9700 §4.14.2 (IR11); mật khẩu theo K9 lệch NIST (R27) |

**So sánh phương án phiên (K5)**

| Phương án | Đáp ứng yêu cầu | Hạn chế | Chi phí và vận hành | Lý do |
|---|---|---|---|---|
| A. Phiên opaque phía server | Thu hồi tức thì, một cơ chế | Mỗi request tra DB; chủ dự án chưa quen | Thấp | Không chọn |
| B. Access JWT 15 phút + refresh xoay vòng (đã chọn) | Mô hình phổ biến cho mobile, một cơ chế cho hai client | Logout trễ tối đa 15 phút; cần phát hiện dùng lại token | Trung bình | Chọn theo khuyến nghị, chủ dự án chốt 05/10 |
| C. Cookie cho web, JWT cho mobile | Khớp hướng dẫn NestJS | Hai cơ chế | Cao hơn | Không chọn |

**Runbook tối thiểu.** Phát hiện: cảnh báo số lần "dùng lại refresh token", tỉ lệ khóa đăng nhập, ngân sách thư đạt 80%, số OTP bị khóa. Chẩn đoán: tìm log theo `operation_id`, xem chuỗi phiên liên quan và thiết bị. Xử lý: thu hồi chuỗi hoặc toàn bộ phiên (công tắc khẩn cấp), đổi khóa ký access token (IE10), nâng ngân sách thư hoặc chuyển nhà cung cấp SMTP qua cổng `Mailer`. Sau khi khôi phục từ bản sao lưu thì thu hồi mọi phiên. Xác minh: đăng nhập và gia hạn hoạt động; token cũ bị từ chối; thư OTP đến.

**Câu hỏi còn mở.** Giới hạn thư của Gmail cá nhân chưa có nguồn Google (R29), nên ngân sách phải cấu hình được; một kẻ tấn công dùng nhiều IP vẫn có thể làm cạn ngân sách thư trong ngày và chặn đăng ký và đặt lại mật khẩu của người thật (giới hạn theo IP chỉ giảm chứ không loại bỏ rủi ro này); có thêm kiểm tra mật khẩu đã lộ hay không (NIST yêu cầu, R27, K9 chưa bao gồm); có cần CAPTCHA không; timeout phía Google chưa đo.

## Cross-module contract notes

| Với module | Identity hứa hoặc cần |
|---|---|
| Entitlements & Usage | Trả lời "email đã xác minh chưa" và user ID; kích hoạt trial là việc của Entitlements |
| Mọi module | Cấp user ID tin cậy cho mỗi request; cung cấp hồ sơ (tiếng mẹ đẻ, múi giờ) để đọc; không module nào tự suy ra danh tính |
| Content, Content Pipeline | Cung cấp kiểm tra vai trò admin cho thao tác admin (IR17) |
| Learning, Practice, Content, Entitlements, AI Integration | Mỗi module cung cấp thao tác xóa dữ liệu theo người dùng; Identity gọi chúng khi xóa tài khoản và chạy cuối cùng (IR18, SR11) |
| Gửi thư | Chỉ Identity gửi thư ở V1, qua cổng `Mailer` |

## Provenance markers used above

- **K#** — quyết định đã chốt; **N#, F#** — mặc định hoặc đề xuất mang nhãn riêng ở nguồn (nhiều F# có con số là `ASSUMPTION`); **R#** — finding trong `research.md` (R22, R24, R29, R31, R47 đọc ngày 04/10, một phần qua agent kiểm chứng; các R còn lại của module này là `documented (02/10)`).
- **S#, SR#** — `system-spec.md`. **ASSUMPTION** — không có nguồn; được mang vào báo cáo cuối.
