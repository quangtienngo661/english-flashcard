# Legal and regulatory requirements in Vietnam for selling paid digital subscriptions (web + iOS/Android), as of 19/10/2026

Research notes, written 19/10/2026. Scope: an English-vocabulary self-study app (Next.js web + Flutter iOS/Android), freemium with a trial and a paid "Pro" tier, some AI-generated practice questions. The owner is one individual who is probably not a registered business (ASSUMPTION). The app collects email, a password hash and learning history, and may later collect name and date of birth. Users are Vietnamese adults and possibly minors.

**How to read the sources.** Official portals (vbpl.moj.gov.vn, thuvienphapluat.vn full texts) blocked the fetcher during this session: HTTP 403, or DNS failure for vbpl. So primary text was read from mirror sites that reproduce the legal texts: **hethongphapluat.com** and **dulieuphapluat.vn**. These notes treat them as copies of primary text, not as official sources. Points from law firms (EY, Indochine Counsel, Luật Việt An, Apolat), vendors (MISA, einvoice, Tenzen, Safegate, VACIF) and news sites are marked *(secondary)*. Anything that could not be confirmed is marked **UNVERIFIED**. Article numbers come from the mirrored texts and should be re-checked on Công báo / vbpl.vn before anyone relies on them in a filing.

---

## Q1. Business form: can an individual sell digital subscriptions without registering a business? Hộ kinh doanh or company (công ty TNHH)?

### Takeaway
The new e-commerce rules explicitly allow an **individual** to own a direct-sale website or app, identified by a personal tax code (mã số thuế cá nhân). Business-registration law is narrower. It exempts only listed low-income activities from registering a household business (hộ kinh doanh), and "selling an online subscription" is not on that list. Running a recurring paid service therefore most likely requires at least a hộ kinh doanh (inference). A hộ kinh doanh is not a legal entity and its owner has unlimited liability. It also cannot sign Apple's "Organization" developer agreement, because Apple requires a legal entity with a D-U-N-S number. A one-member LLC (công ty TNHH một thành viên) fixes both problems, at the cost of company accounting and corporate income tax (CIT).

### Cited Findings
- Luật Thương mại điện tử (Law on E-commerce) 122/2025/QH15, Art. 3(3), defines a "nền tảng thương mại điện tử kinh doanh trực tiếp" (direct-sale e-commerce platform) as a platform that "tổ chức, cá nhân thiết lập để trực tiếp bán hàng hóa hoặc cung ứng dịch vụ" (set up by an organization **or individual** to sell its own goods or services directly) — [hethongphapluat mirror of Law 122/2025](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025.html)
- Decree 248/2026/NĐ-CP, Art. 4, requires the platform owner's identity to be disclosed. For an individual this means "tên, địa chỉ cư trú của cá nhân" (name, residential address) and "mã số thuế của cá nhân hoặc mã số thuế của hộ kinh doanh" (personal tax code or household-business tax code). The decree therefore contemplates an individual owner without a company — [dulieuphapluat mirror of Decree 248/2026](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html)
- Decree 168/2025/NĐ-CP on enterprise registration (đăng ký doanh nghiệp), Art. 82(3), lists who does **not** have to register a household business: farming/fishing/salt households, street vendors, snack sellers, itinerant and seasonal traders, and "làm dịch vụ có thu nhập thấp" (low-income service providers), unless the line of business is conditional. The provincial People's Committee (UBND cấp tỉnh) sets the low-income level. Online selling is not on the list — [hethongphapluat, Art. 82 of Decree 168/2025](https://hethongphapluat.com/nghi-dinh-168-2025-nd-cp-ve-dang-ky-doanh-nghiep/dieu-82); the same reading was given in a Ministry of Finance Q&A dated 19/06/2026, as summarised in search results — [MOF Q&A portal](https://portal.mof.gov.vn/hoidapcstc/home/cthoidap/162205) *(seen only as a search summary, page not opened)*
- Decree 168/2025 took effect 01/7/2025. Household-business registration is filed with the commune-level (cấp xã) registration office, and companies register at provincial level — [MISA AMIS, company vs household business 2026](https://amis.misa.vn/250389/nen-thanh-lap-cong-ty-hay-ho-kinh-doanh-ca-the/) *(secondary)*
- A hộ kinh doanh has no legal-entity status (không có tư cách pháp nhân) and its owner is liable with all personal assets. A công ty TNHH một thành viên has legal-entity status and the owner's liability is limited to contributed capital — [MISA AMIS](https://amis.misa.vn/250389/nen-thanh-lap-cong-ty-hay-ho-kinh-doanh-ca-the/) *(secondary)*
- According to a tax-advisory site, a registered household-business owner falls under compulsory social insurance (BHXH bắt buộc) from 01/07/2025 — [ketoanthuanthien.vn](https://ketoanthuanthien.vn/hoi-dap/ban-hang-online-facebook-tiktok-co-bat-buoc-dang-ky-ho-kinh-doanh-khong/) *(secondary, seen only as a search summary)*
- Apple Developer Program, **individual** enrollment: legal personal name, no legal-entity status, no D-U-N-S number, and the seller name on the App Store is the person's legal name. **Organization** enrollment: "must be a legal entity that can contract with Apple" (DBAs, trade names and branches are not accepted), plus a D-U-N-S number, a domain email and a public website. The seller name shown is the organization's name — [Apple, Enroll](https://developer.apple.com/programs/enroll/)
- Google Play: individual or household-business developers based in Vietnam must enter their Vietnam tax code (the 12-digit personal ID number) in Play Console, and Google withholds tax from their Vietnam sales (see Q6) — [Google Play Console Help 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)
- Consumer Protection Law 19/2023/QH15, Art. 9(1), already places duties on "cá nhân hoạt động thương mại không phải đăng ký kinh doanh" (individual traders who are not required to register): accurate information, exchange/refund for goods that do not match their description, and compliance with recalls — [hethongphapluat mirror of Law 19/2023](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)

### Inferences
- **No business registration at all**: the e-commerce notification can be filed with a personal tax code (Decree 248, Art. 4). However, a recurring paid online service does not fit any exemption in Decree 168/2025, Art. 82(3). Selling without a hộ kinh doanh is therefore exposed to an "unregistered business" finding (inference, not confirmed by an authority).
- **Hộ kinh doanh** is cheap and fast and has simplified taxation (Q6). Downsides: unlimited liability; Apple enrollment only as an individual, so the App Store shows the owner's personal legal name; and probably weaker standing with payment gateways that require "xác thực tổ chức" (organization verification, see Gaps).
- **Công ty TNHH một thành viên**: limited liability; can enroll on Apple as an Organization (needs D-U-N-S); can sign merchant contracts with Vietnamese payment gateways and issue company e-invoices; CIT at 15% for revenue ≤ 3 billion VND (Q6). Costs: bookkeeping and accounting, e-invoicing from the first sale, and a higher admin burden. It also counts as a "doanh nghiệp siêu nhỏ/nhỏ" (micro or small enterprise) for the personal-data exemptions (Q3), whereas the exemption status of a bare individual is unclear.

### Gaps
- No primary source found on whether VNPAY, MoMo, payOS or OnePay onboard an unregistered individual as a merchant. A payOS integration guide mentions "xác thực tổ chức" (organization verification) but gives no details — [Odoo payOS module](https://apps.odoo.com/apps/modules/18.0/payment_payos). This needs a direct check with each gateway (also covered in research file 2).
- No ruling or official Q&A found that says whether a "cá nhân" selling digital subscriptions must register a hộ kinh doanh. Recommend asking the commune-level registration office or a lawyer.
- Not verified this session: the minimum capital and registration fees for an LLC under Decree 168/2025, and the contract capacity of minor buyers under the Civil Code.

---

## Q2. E-commerce rules: notification vs registration, does selling one's own digital service count, and what must be displayed?

### Takeaway
Since **01/7/2026** the old regime (Decree 52/2013, as amended by Decree 85/2021) is repealed and replaced by **Law 122/2025/QH15** plus **Decree 248/2026/NĐ-CP**. A website or app that sells its own goods or services and has an **online ordering function** is a "nền tảng kinh doanh trực tiếp" (direct-sale platform). It must file a **notification (thông báo)** and have it **confirmed before it operates**. Confirmation is now done by the **provincial People's Committee (UBND cấp tỉnh)**, with a target of 3 working days. Full **registration (đăng ký)** applies only to intermediary marketplaces, e-commerce social networks and integrated platforms. A paid Pro checkout on web or in-app is an online ordering function, so the notification applies to both the web and the app. A long list of policies must be displayed on the main screen or behind a clearly marked link.

### Cited Findings
- **Law 122/2025/QH15** was passed 10/12/2025 and takes effect **01/7/2026** — [LuatVietnam](https://luatvietnam.vn/tin-van-ban-moi/da-co-luat-thuong-mai-dien-tu-2025-so-122-2025-qh15-186-106402-article.html). Art. 40 states the effective date. Art. 41(1): websites and apps confirmed under the old rules may operate "đến hết ngày 30 tháng 6 năm 2027" (until 30/6/2027) — [hethongphapluat mirror](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025.html)
- Law 122, **Art. 14(1)**: the owner of a direct-sale platform with online ordering must "thực hiện thông báo với cơ quan nhà nước có thẩm quyền trước khi vận hành nền tảng" (notify the competent authority before operating). **Art. 14(2)**: intermediary platforms, e-commerce social networks and integrated platforms must **register** and meet conditions. **Art. 14(3)**: foreign platforms follow Art. 28(1) instead — [hethongphapluat, Art. 14](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025/dieu-14)
- Law 122, Art. 12(1)–(2): before an order is placed, a platform with online ordering must "hiển thị rõ ràng, đầy đủ, chính xác" (show clearly, fully and accurately) the terms of the deal, and let the buyer review and correct the order. Art. 16(2)(b): access to contract data must be kept for at least **3 years**, with shorter periods allowed for micro enterprises, household businesses and some startups (Art. 16(2)(c)) — [hethongphapluat mirror](https://hethongphapluat.com/luat-thuong-mai-dien-tu-2025.html)
- **Decree 248/2026/NĐ-CP** was issued 30/6/2026 and takes effect 01/7/2026, except electronic identity verification of sellers and livestreamers, which starts **01/01/2027** (Art. 52(1)–(2)). Under Art. 52(3), Decree 52/2013/NĐ-CP and Decree 85/2021/NĐ-CP lapse on that date, except for the Art. 53 transition. Art. 53: platforms already confirmed or registered before 01/7/2026 continue until 30/6/2027 and must re-file under the new decree in that window — [dulieuphapluat mirror of Decree 248/2026](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html); issue date and identity-verification date also in [LuatVietnam on Decree 248](https://luatvietnam.vn/tin-van-ban-moi/da-co-nghi-dinh-248-2026-nd-cp-huong-dan-thi-hanh-luat-thuong-mai-dien-tu-tu-01-7-2026-186-110111-article.html)
- Decree 248, **Art. 23(1)**: the direct-sale platform with online ordering "phải được xác nhận thông báo trước khi vận hành nền tảng" (must have its notification confirmed before operating). **Art. 24(1)**: the dossier is Form No. 01 (Mẫu số 01, Phụ lục II) plus any conditional-business licence. **Art. 24(5)** and **Art. 51(1)**: UBND cấp tỉnh confirms. **Annex I** sets a reply within **03 working days** of a complete dossier. **Art. 23(3)**: changes must be filed within 20 working days — [dulieuphapluat mirror](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html)
- Decree 248, Art. 45: a confirmation badge is displayed on the site and links to online.gov.vn — [Lawgical](https://lawgical.vn/vi-du/website-ban-hang-co-phai-thong-bao-voi-bo-cong-thuong-khong) *(secondary)*. Filing is done online via the National Public Service Portal (Cổng Dịch vụ công Quốc gia), and households and businesses are both covered — [Tenzen](https://tenzen.vn/huong-dan-thong-bao-website-bo-cong-thuong-theo-nghi-dinh-248-2026/) *(secondary)*
- Sites that only display products, with no online ordering, do not have to notify — [Lawgical](https://lawgical.vn/vi-du/website-ban-hang-co-phai-thong-bao-voi-bo-cong-thuong-khong) *(secondary)*
- **Digital services are in scope.** Decree 248, Art. 15(1), covers platforms that "cung cấp dịch vụ sử dụng trực tiếp trên nền tảng" (provide services used directly on the platform), which is the case for an in-app subscription — [dulieuphapluat mirror](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html)
- **Mandatory disclosures** under Decree 248 Chapter II (Arts. 4–16): owner identity (Art. 4: for an individual, name, residential address and personal or household tax code); rights and obligations of the parties (Art. 6); prices stating whether tax, delivery and other charges are included (Art. 8); payment policy, refund method and any loyalty-points scheme (Art. 10); return and refund policy with conditions, time limits, process, method and "chi phí hoàn trả của các bên" (return costs for each party) (Art. 14). Art. 17(1)(a): these must sit in a visible place on the main screen, "có dấu hiệu phân biệt rõ ràng" (clearly distinguishable), or behind a link — [dulieuphapluat mirror](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html). According to Lawgical, Law 122 Art. 11 also requires a privacy policy, and Law 122 Art. 39 provides fines, access blocking or removal from the confirmed list — [Lawgical](https://lawgical.vn/vi-du/website-ban-hang-co-phai-thong-bao-voi-bo-cong-thuong-khong) *(secondary)*
- Foreign platforms must register with the Ministry of Industry and Trade (Bộ Công Thương) if they have a Vietnamese-language interface, use a .vn domain, or reach 100,000 transactions a year with Vietnamese buyers (Decree 248, Arts. 31–32). This is relevant only if the owner later hosts the business abroad — [LuatVietnam](https://luatvietnam.vn/tin-van-ban-moi/da-co-nghi-dinh-248-2026-nd-cp-huong-dan-thi-hanh-luat-thuong-mai-dien-tu-tu-01-7-2026-186-110111-article.html)

### Inferences
- Both the website (Pro checkout) and the mobile app (in-app purchase) are "nền tảng số" with online ordering. Each needs a confirmed notification before it starts charging. It is not certain whether an app whose payments go only through Apple/Google In-App Purchase counts as having "online ordering" on the owner's own platform. The conservative reading is yes, because the order is placed in the owner's app.
- Older guides that list "9 tài liệu" (nine required documents) for online.gov.vn, or that name Bộ Công Thương as the confirming authority, describe the repealed Decree 52/85 regime and are out of date.

### Gaps
- Not read verbatim: Law 122 Art. 11 (disclosure duty), Art. 39 (sanctions), and the exact field list of Form No. 01. Not found: the penalty amounts for operating without a confirmed notification under the post-01/7/2026 regime. The old penalty decree (98/2020) may have been amended; **UNVERIFIED**.
- Not confirmed: whether an app sold only through App Store/Play IAP must be notified separately from the website, or can share one notification.

---

## Q3. Personal data protection: PDPL 2025, Decree 356/2025, the status of Decree 13/2023, and the penalty decree

### Takeaway
**Luật Bảo vệ dữ liệu cá nhân (Personal Data Protection Law) 91/2025/QH15** and **Decree 356/2025/NĐ-CP** have both been in force since **01/01/2026**. Decree 356 replaced Decree 13/2023. A dedicated penalty decree, **330/2026/NĐ-CP**, applies from **19/8/2026**. The core duties are:
- consent that is separate for each purpose, verifiable, and never pre-ticked;
- a published processing notice and privacy policy;
- data-subject rights with fixed deadlines;
- extra consent for children's data (Vietnamese "trẻ em" = under 16);
- a 60-day DPIA dossier and a 60-day cross-border transfer dossier filed with the Ministry of Public Security's A05 department (Cục A05). The cross-border case explicitly includes "using a platform outside Vietnam to process data collected in Vietnam", for example Cloudflare or a US AI API;
- 72-hour breach notification.

Household businesses and micro enterprises are fully exempt from the DPIA and DPO duties, and small enterprises and startups get 5 years. These exemptions are lost when the business processes **sensitive data** or a large number of data subjects (Decree 356 sets 100,000). Decree 356 reportedly moved "behaviour-tracking / online-service usage data" into the sensitive category, so learning history might count as sensitive. That point is the biggest open risk.

### Cited Findings
- **Law 91/2025/QH15** was passed 26/6/2025 and took effect 01/01/2026 — [Cần Thơ legal-education portal (gov)](https://pbgdpl.cantho.gov.vn/quy-dinh-ve-bao-ve-du-lieu-ca-nhan-cua-tre-em-nguoi-bi-mat-hoac-han-che-nang-luc-hanh-vi-dan-su-nguoi-co-kho-khan-trong-nhan-thuc-lam-chu-hanh-vi). Art. 38(1) gives the effective date. Art. 39(1): processing consented to under Decree 13/2023 may continue "không phải xin đồng ý lại" (without new consent). Art. 39(2): impact dossiers filed before 01/01/2026 remain valid — [hethongphapluat mirror of Law 91/2025](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html)
- **Decree 356/2025/NĐ-CP** was issued 31/12/2025, **replaces Decree 13/2023/NĐ-CP**, and took effect 01/01/2026 — [EY Vietnam legal alert, March 2026 (PDF)](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary)*. Note: the text of Law 91 does not itself expressly repeal Decree 13; the repeal comes from Decree 356 according to EY — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html)
- **Consent (Law 91, Arts. 9–10):** must be voluntary and informed about the data type, purpose, controller, and the subject's rights (Art. 9(2)); clear, specific and verifiable, electronic form allowed (Art. 9(3)); separate for each purpose (Art. 9(4)(a)); "Sự im lặng hoặc không phản hồi không được coi là sự đồng ý" (silence or no response is not consent). Withdrawal must be in writing or electronic and is not retroactive (Art. 10) — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html). Decree 356 adds: consent records must be stored and verifiable as to time and content; no default "agree" settings or confusing agree/disagree prompts; consent may be collected through a technical consent flow on a website, platform or app — [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary)*
- **Sensitive data expanded (Decree 356):**
  - The "basic data" group no longer includes "dữ liệu phản ánh hoạt động, lịch sử hoạt động trên không gian mạng" (data on online activity and activity history).
  - The "sensitive" group adds "dữ liệu theo dõi hành vi, hoạt động sử dụng dịch vụ viễn thông, mạng xã hội, truyền thông trực tuyến và các dịch vụ khác trên không gian mạng" (behaviour-tracking data and data on use of telecom, social, online-media and **other online services**).
  - It also adds login names and passwords of electronic-identification accounts, and bank and card data.

  Sources: [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary)*; corroborated by [Luật Việt An](https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html) *(secondary)*, which describes "theo dõi hành vi, thói quen và hoạt động sử dụng dịch vụ" (tracking of behaviour, habits and service use)
- **Data-subject rights deadlines (Decree 356):** consent withdrawal, restriction or objection: reply within 2 working days, act within 15 days (20 if a processor or third party is involved). Access, correction or provision: 10 days. Deletion: 20 days. One extension allowed per request — [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf); [Luật Việt An](https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html) *(both secondary, and their figures differ slightly)*
- **Children (Law 91, Art. 24):** the legal representative exercises the child's data rights (Art. 24(2)). Processing to publish or disclose the private life of a child "từ đủ 07 tuổi trở lên" (aged 7 or older) needs the consent of **both the child and the legal representative**. Processing must stop if consent is withdrawn or a competent authority requests it (Art. 24(3)) — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html); [Cần Thơ gov portal](https://pbgdpl.cantho.gov.vn/quy-dinh-ve-bao-ve-du-lieu-ca-nhan-cua-tre-em-nguoi-bi-mat-hoac-han-che-nang-luc-hanh-vi-dan-su-nguoi-co-kho-khan-trong-nhan-thuc-lam-chu-hanh-vi). "Trẻ em là người dưới 16 tuổi" (a child is a person under 16): Law on Children 102/2016/QH13, Art. 1, in force since 01/6/2017 — [LuatVietnam](https://luatvietnam.vn/tin-phap-luat/tre-em-la-nguoi-duoi-bao-nhieu-tuoi-230-35818-article.html) *(secondary restatement)*
- **Cross-border transfer (Law 91, Art. 20):** Art. 20(1)(a) covers moving data stored in Vietnam to storage abroad. Art. 20(1)(b) covers transfer to a foreign party. Art. 20(1)(c): "sử dụng nền tảng ở ngoài lãnh thổ nước Cộng hòa xã hội chủ nghĩa Việt Nam để xử lý dữ liệu cá nhân" (using a platform outside Vietnam to process personal data collected in Vietnam). Art. 20(2): file an impact dossier with the specialised agency (Ministry of Public Security, Art. 33(1)(a)) "trong thời gian 60 ngày kể từ ngày đầu tiên chuyển" (within 60 days of the first transfer). Art. 20(6) exemptions: state agencies, employee data on cloud services, data subjects moving their own data, and other cases set by the Government — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html)
- **DPIA (Law 91, Arts. 21–22):** the controller must file within 60 days of first processing, and update every 6 months on changes or immediately on specified events — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html). Decree 356 makes this a **pre-check**: A05 reviews dossiers within 15 days, the business has 30 days to complete them, and forms 09 and 10 are used — [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary)*. The cross-border dossier also requires a written agreement with the foreign recipient (Decree 356 Art. 18 per Luật Việt An) — [Luật Việt An](https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html) *(secondary)*
- **Breach (Law 91, Art. 23(1)):** notify the specialised agency "chậm nhất là 72 giờ kể từ khi phát hiện" (within 72 hours of detection) when the breach may harm security, order, or a person's life, health, honour or property — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html). Decree 356 adds: for location and biometric data, also notify the data subjects within 72 hours; keep breach records for 5 years — [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary)*
- **Small-business exemptions (Law 91, Art. 38):**
  - Art. 38(2): small enterprises and startups may, for **5 years** from 01/01/2026, choose not to apply Art. 21 (DPIA), Art. 22 (updates) and Art. 33(2) (data-protection staff).
  - Art. 38(3): household businesses and micro enterprises are not required to apply those articles.
  - Both exemptions exclude businesses that sell data-processing services, process **sensitive data directly**, or process data of a large number of subjects.
  - As enacted, Art. 38 does **not** list Art. 20 (cross-border).

  Source: [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html). Per EY, **Decree 356** extends the exemption scope to "lập, cập nhật và nộp báo cáo DPIA, **CTIA**" (preparing, updating and filing the DPIA and the cross-border transfer impact assessment, CTIA) plus DPO/DPD duties, for hộ kinh doanh, micro, small and startup enterprises. Household and micro businesses are exempt fully, small and startup enterprises for 5 years from 01/01/2026. The exemption is lost when the business sells data-processing services, directly processes sensitive data, or has processed data of **≥ 100,000 subjects** cumulatively — [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary; conflicts with the law text on CTIA, see Gaps)*
- **DPO qualifications (Decree 356):** college degree or higher, ≥ 2 years of relevant experience, data-protection training. An outsourced DPO service is allowed — [EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf) *(secondary)*
- **Penalty caps (Law 91, Art. 8):** trading personal data: up to 10× the illegal income. Cross-border violations by an organisation: up to **5% of the previous year's revenue**. Other violations by an organisation: up to **3 billion VND**. Individuals: half of the organisational cap (Art. 8(6)) — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html)
- **Penalty decree 330/2026/NĐ-CP**, effective 19/8/2026, covers personal-data violations in Arts. 39–71. Examples:

  | Violation | Fine (VND) | Article |
  |---|---|---|
  | No processing notice, no consent logs | 30–50 million | Art. 43 |
  | Processing without consent, or treating silence as consent | 50–70 million | Art. 43 |
  | Refusing a valid access request | 10–20 million | Art. 49(1) |
  | Failing to create, update or submit a DPIA | 20–30 million | Art. 55(1) |
  | Platforms: unclear privacy notice, cookie/tracking controls, missing user-rights tools | 50–70 million | Art. 65 |
  | Platforms: forced ID upload, collection beyond the agreed scope | 70–150 million | Art. 65 |

  Source: [Luật Việt An on Decree 330/2026](https://luatvietan.vn/nghi-dinh-330-2026-nd-cp.html) *(secondary)*. One news source says the decree also covers cybersecurity penalties and has 4 chapters and 82 articles; another article cites "Nghị định 363/2026" instead (conflict) — [search summary incl. thitruongtaichinhtiente.vn](https://thitruongtaichinhtiente.vn/quy-dinh-xu-phat-vi-pham-hanh-chinh-trong-linh-vuc-an-ninh-mang-va-bao-ve-du-lieu-ca-nhan-85098.html)
- **Consumer law duplicates some data duties.** Law 19/2023, Arts. 15–20: publish data rules covering purpose, scope, retention and security; notify and offer choices before collecting; get fresh consent for a new purpose or for advertising use; notify the authority within **24 hours** of a cyberattack that creates risk (Art. 19); allow deletion — [hethongphapluat mirror of Law 19/2023](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)

### Inferences
- **Learning history may be "sensitive data."** If per-user review results, streaks and weak-word lists count as "theo dõi hành vi … hoạt động sử dụng … dịch vụ khác trên không gian mạng" (behaviour tracking and use of other online services), then:
  - (a) the small-business exemptions fall away, so a DPIA must be filed within 60 days of the first processing;
  - (b) the extra security and notice duties for sensitive data apply.

  This depends on Decree 356's exact wording, which was not read this session.
- **Foreign hosting or AI triggers the cross-border rules.** Hosting on Cloudflare, or sending learner text to a US AI API, is a cross-border transfer under Art. 20(1)(c). The 60-day cross-border dossier then applies unless the Decree 356 exemption (per EY) covers the business form chosen. A bare individual is not named in either exemption list.
- **Minors.** For users under 16, verifiable parental consent is the safe default. The Law 91 text quoted covers consent only for "publishing private life" from age 7, but the Cybersecurity Law 2025 parent-account rule (Q4) applies more broadly.
- **Practical minimum before charging:**
  1. a privacy notice / processing notice in Vietnamese;
  2. per-purpose, unticked consent with a stored log (time and version);
  3. a rights-request channel with deadline tracking;
  4. an age gate, plus a parental-consent flow for under-16 users;
  5. a breach procedure (72 hours to A05, 24 hours under consumer law after a cyberattack);
  6. DPIA and cross-border dossiers unless clearly exempt.

### Gaps
- **UNVERIFIED:** the exact Decree 356 article listing sensitive data, and whether self-study learning history falls under the "behaviour tracking / other online services" item. This needs the official text (vbpl.moj.gov.vn/TW/Lists/vbpq/Attachments/187276/ND.356.2025.doc could not be fetched) or a lawyer's opinion.
- **Conflict:** Law 91 Art. 38 does not exempt Art. 20 (cross-border dossier), while EY says Decree 356 exempts CTIA for hộ kinh doanh, micro and small enterprises. The exact Decree 356 exemption article was not read.
- **Unclear:** whether an unregistered individual (not a hộ kinh doanh) qualifies for any exemption.
- **Not read verbatim:** Decree 330/2026's issue date, whether its fines are for individuals or organisations, and fines for children's-data and breach-notification failures.
- **Not verified:** the A05 online filing portal URL and form numbers (EY mentions forms 09 and 10; Luật Việt An mentions forms 08, 09, 01a/01b).

---

## Q4. Cybersecurity and data localization: Cybersecurity Law 2025, Decree 333/2026, and the fate of Decree 53/2022

### Takeaway
**Luật An ninh mạng (Cybersecurity Law) 116/2025/QH15**, in force since **01/7/2026**, repealed the 2018 Cybersecurity Law and the 2015 Network Information Security Law. It keeps the duty on **domestic and foreign** providers of internet or value-added services that collect user data to **store that data in Vietnam**. Its guiding **Decree 333/2026/NĐ-CP** (19/8/2026) lists the data to store: account name, usage time, email, IP, phone and card data. It sets 24-month retention after a storage request, 12-month logs, and account verification by Vietnamese mobile number or personal ID number. Two new duties: parents must register children's accounts with the parent's own information, and IP addresses must be identifiable for police requests. No local office is required for a domestic provider; the branch or representative-office rule targets foreign enterprises.

### Cited Findings
- **Law 116/2025/QH15** was passed 10/12/2025 and took effect 01/7/2026. It has 8 chapters and 58 articles and consolidates the 2018 and 2015 laws — [thuvienphapluat listing (search summary)](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-An-ninh-mang-2025-so-116-2025-QH15-666020.aspx); Công báo published it 21/01/2026 per [Apolat Legal](https://apolatlegal.com/vi/laws/luat-an-ninh-mang-2025-so-116-2025-qh15/) *(secondary)*. On the effective date, Law 86/2015/QH13 and Law 24/2018/QH14 are repealed — [hethongphapluat mirror](https://hethongphapluat.com/luat-an-ninh-mang-2025.html)
- **Art. 25(3)**: domestic and foreign providers of telecom, internet or value-added services that collect, analyse or process personal data or user-generated data must "lưu trữ dữ liệu này tại Việt Nam" (store this data in Vietnam), for a period set by the Government. Foreign providers must "đặt chi nhánh hoặc văn phòng đại diện tại Việt Nam" (open a branch or representative office in Vietnam). **Art. 25(2)**: verify information when users register accounts; give user information to the Ministry of Public Security's cyber force within 24 hours of a request (3 hours if urgent); remove violating content within 24 hours (6 hours if urgent); retain account, usage-time and IP data — [hethongphapluat mirror](https://hethongphapluat.com/luat-an-ninh-mang-2025.html)
- Interpretation: the 2025 law "tiếp tục duy trì quy định về nghĩa vụ lưu trữ dữ liệu tại Việt Nam đối với các doanh nghiệp trong nước và nước ngoài" (keeps the Vietnam data-storage duty for domestic and foreign enterprises) and drops the sector list for the foreign-presence rule. A new duty to identify users' IP addresses on request is added. Details were left to a Government decree — [Indochine Counsel special alert, Jan 2026 (PDF)](https://indochinecounsel.com/wp-content/uploads/2026/02/Special-Alert-Law-on-Cybersecurity-2025-VN-012026.pdf) *(secondary)*
- **Children (Art. 16(2))**: "Trẻ em sử dụng dịch vụ giá trị gia tăng trên không gian mạng thì cha, mẹ hoặc người giám hộ … đăng ký tài khoản bằng thông tin của cha, mẹ hoặc người giám hộ" (when children use online value-added services, the parent or guardian registers the account with the parent's or guardian's own information) and supervises the child's use. **Art. 16(3)**: providers must control, block and remove content harmful to children and build technical systems for this — [hethongphapluat, Art. 16](https://hethongphapluat.com/luat-an-ninh-mang-2025/dieu-16); same reading in [Indochine Counsel alert](https://indochinecounsel.com/wp-content/uploads/2026/02/Special-Alert-Law-on-Cybersecurity-2025-VN-012026.pdf) *(secondary)*
- **Decree 333/2026/NĐ-CP** was issued 19/8/2026 and took effect the same day (6 chapters, 32 articles). **Art. 19**, data to store in Vietnam: personal information of users in Vietnam and data they create, such as account name, usage time, card information, email, last login/logout IP and registered phone. The storage form is up to the enterprise. **Art. 20**: retention ≥ 24 months, counted from the storage request — [VACIF](https://vacif.com/nghi-dinh-333-2026-nd-cp-nhung-quy-dinh-moi-ve-an-ninh-mang-doanh-nghiep-can-luu-y/) *(secondary)*. **Art. 16**: system logs kept ≥ 12 months. Accounts are verified at registration by Vietnamese mobile number, or by personal ID number or another lawful e-ID for users without one. Only verified accounts may post, share or use interactive features — [Safegate](https://safegate.vn/vi/post/nghi-dinh-3332026nd-cp-quy-dinh-chi-tiet-luat-an-ninh-mang-160.htm) *(secondary)*
- **Decree 53/2022/NĐ-CP** (issued 15/8/2022, effective 01/10/2022) guided the 2018 law's data-localization chapter. Foreign enterprises had 12 months after a Ministry of Public Security decision to localise data or open an office — [KPMG alert](https://advisory.kpmg.us:443/content/dam/kpmg/vn/pdf/Legal-Update/2022/9/legal-alert-for-decree-53-guiding-cybersecurity-law-vn.pdf); [LSVN](https://lsvn.vn/tu-01102022-du-lieu-nguoi-dung-internet-tai-viet-nam-se-duoc-luu-tru1661052929.html) *(secondary)*

### Inferences
- A domestic owner (individual, household business or LLC) offering an online service collects email, login IP and usage time, which are the Art. 19 categories. To be safe, assume the account and log data must be stored, or at least replicated, **in Vietnam**, in a way that allows timely retrieval. That conflicts with Cloudflare D1 or Workers storage and with a foreign-region Postgres, unless the obligation applies only after a Ministry of Public Security request. The VACIF wording "from receipt of the storage request" hints that it might, but this is not verified.
- No local branch or office is needed for a Vietnamese-resident owner. That duty targets foreign enterprises.
- Under-16 users: under Art. 16(2), the account should be registered with the parent's or guardian's information. This pushes the product toward a "parent creates the account" flow for minors, and fits the PDPL Art. 24 consent design.
- If Decree 333's phone or ID verification applies to every online service rather than only to social and interactive ones, email-only sign-up would be non-compliant for Vietnamese users. Treat this as a high-priority question for a lawyer.

### Gaps
- **UNVERIFIED:** whether Decree 333/2026 repealed or replaced Decree 53/2022. Its parent law was repealed on 01/7/2026, so Decree 53's continued effect is doubtful.
- **UNVERIFIED:** whether the domestic duty to store data in Vietnam applies automatically or only after a request, and whether there is any scale threshold for small providers.
- **UNVERIFIED:** whether the account-verification-by-phone rule covers non-social apps. The primary text of Decree 333/2026 was not read.

---

## Q5. Consumer protection: distance contracts, standard-form contracts, subscriptions, cancellation and refunds

### Takeaway
**Luật Bảo vệ quyền lợi người tiêu dùng (Law on Protection of Consumer Rights) 19/2023/QH15** and **Decree 55/2024/NĐ-CP** have both applied since **01/7/2024**. A Pro subscription is both a **distance transaction** (Arts. 37–38) and a **continuous service** (Arts. 41–42). Required:
- pre-contract disclosure, and letting the user review and download the contract;
- a **30-day termination right** if the required information was incomplete or inaccurate, with refunds within 30 days;
- **advance notice of each fee payment and of contract expiry at least 7 working days ahead**, which in practice is a renewal reminder;
- letting the consumer **terminate at any time** (unless agreed otherwise) while paying only for service used.

Standard-form terms must meet Decree 55's form rules and avoid the 15 categories of unfair terms in Art. 25. **Registering** the standard-form contract is required only for Prime Minister-listed services (Decision 07/2024/QĐ-TTg), and online education or apps are not on that list.

### Cited Findings
- Law 19/2023 took effect 01/7/2024 and replaced Law 59/2010/QH12. Businesses had to revise or re-register existing standard contracts by 31/12/2024 — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html); [MOIT notice](https://moit.gov.vn/tin-tuc/thong-bao/luat-bao-ve-quyen-loi-nguoi-tieu-dung-nam-2023-chinh-thuc-co-hieu-luc-tu-ngay-1-7-2024.html)
- **Art. 37**: before contracting, give identity and contact details, business registration or tax code, product details, costs, payment and return terms, and the complaint procedure. **Art. 38(1)**: let the consumer review, confirm, then view and download the contract. **Art. 38(3)**: if the information was inaccurate or incomplete, the consumer may terminate within **30 days**, paying only for what was used. **Art. 38(4)**: refund within **30 days** of the termination notice, with interest if late — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)
- **Continuous services:**
  - Art. 41: no prepayment unless agreed; no unlawful suspension; ≥ 3 working days' notice of planned maintenance.
  - Art. 42(1)–(2): written contract with a copy for the consumer. Standard forms must state terms and fees and give notice of fee payments and contract expiry **≥ 7 working days** beforehand.
  - Art. 42(3): the consumer may terminate at any time unless otherwise agreed, paying only for service used.

  Source: [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)
- **Art. 25, unfair terms (15 categories).** Examples: excluding the business's legal liability; restricting complaints; unilateral changes, or price changes at delivery, without a termination right; making consent to data collection a condition of the contract — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)
- **Decree 55/2024/NĐ-CP** was issued 16/5/2024 and took effect 01/7/2024 — [MOIT](https://moit.gov.vn/tin-tuc/bao-chi-voi-nguoi-dan/cac-van-ban-quy-pham-phap-luat-ve-bao-ve-quyen-loi-nguoi-tieu-dung-co-hieu-luc-tu-ngay-01-7-2024.html) (title); [Luật Việt An](https://luatvietan.vn/nghi-dinh-55-2024-nd-cp-huong-dan-luat-bao-ve-quyen-loi-nguoi-tieu-dung-nam-2024.html) *(secondary)*. **Art. 6** form rules: Vietnamese language; paper contracts in at least size-12 font; contrasting text and background colours, which applies to electronic contracts too; clear layout and content. **Arts. 7–13**: registration only for Prime Minister-listed products, 30-day review, publication — [MOIT, new points of Decree 55](https://moit.gov.vn/tin-tuc/bao-chi-voi-nguoi-dan/nhung-diem-moi-cua-nghi-dinh-so-55-2024-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-cua-luat-bao-ve-quyen-loi-nguoi-tieu-dung-20.html)
- **Decision 07/2024/QĐ-TTg** was signed 20/6/2024, took effect 01/7/2024 and replaced Decision 02/2012. It lists the services that must register standard contracts: residential electricity and water, pay TV, mobile and fixed telecom, air and rail passenger transport, and apartment sales — [caselaw.vn record](https://caselaw.vn/van-ban-phap-luat/509624-quyet-dinh-so-07-2024-qd-ttg-ngay-20-06-2024-cua-thu-tuong-chinh-phu-ve-danh-muc-san-pham-hang-hoa-dich-vu-phai-dang-ky-hop-dong-theo-mau-dieu-kien-giao-dich-chung); list per [Luật Minh Khuê](https://luatminhkhue.vn/danh-muc-san-pham-hang-hoa-dich-vu-phai-dang-ky-hop-dong-theo-mau-tu-01-7-2024.aspx) *(secondary; list not checked item-by-item against the decision)*
- Decree 248/2026 Art. 14 (return and refund policy content) and Art. 10 (refund method) also apply to the platform; see Q2 — [dulieuphapluat mirror](https://dulieuphapluat.vn/van-ban/thuong-mai-van-ban/nghi-dinh-2482026nd-cp-huong-dan-luat-thuong-mai-dien-tu-1389723.html)

### Inferences
- **Auto-renewal:** there is no dedicated "auto-renewal" article. Art. 42(2)'s 7-working-day advance notice of fee payment and expiry works as a mandatory renewal reminder (email/push) before each charge. Art. 42(3) supports "cancel anytime, effective at the end of the paid period" as the default design. For App Store/Play IAP, the stores handle the billing mechanics, but the owner remains the seller toward Vietnamese consumers.
- **Trial → paid conversion:** the trial terms, price and renewal date must be shown before the order (Law 122 Art. 12, Law 19 Art. 37). Silence cannot be treated as acceptance in the data context (Law 91 Art. 9), and Art. 25 bans one-sided terms. The trial flow should therefore make the paid conversion explicit.
- **No registration of the Terms of Service** with authorities is needed, because "online education apps" are not on the Decision 07/2024 list. The terms still need to meet the Decree 55 Art. 6 form rules and avoid the Art. 25 unfair terms.

### Gaps
- Not read verbatim: Decree 55/2024's provisions on distance or continuous-service transactions, and whether Law 19's "giao dịch đặc thù" (special transaction) rules include detail on prepaid digital subscriptions.
- No source found on whether the stores' (Apple/Google) refund policies satisfy Art. 38(4) for IAP subscriptions.

---

## Q6. Tax and invoicing: direct web sales, App Store / Google Play, and the 2026 household-business changes

### Takeaway
**Since 01/01/2026, presumptive tax (thuế khoán) and the business-licence fee (lệ phí môn bài) are abolished** for household and individual businesses (Resolution 198/2025/QH15, Art. 10). Households now self-declare. Annual revenue **≤ 1 billion VND** is exempt from VAT and personal income tax (PIT) from 01/01/2026. Decree 141/2026/NĐ-CP, amending Decree 68/2026/NĐ-CP, raised this from the earlier 500 million figure. Households under the threshold must still report revenue by 31/1 of the next year. Above 1 billion VND, households must use e-invoices.

**App Store / Google Play:** since **01/7/2025**, platforms with a payment function, foreign ones included, withhold tax for individual and household sellers (Decree 117/2025/NĐ-CP). For services the rates are VAT 5% and PIT 2%.
- Apple applies 2% PIT for Vietnam-based individual developers, plus 5% foreign contractor tax (FCT) on its commission.
- Google's page now states 5% withholding for Vietnam-based individual/household developers.

**Company:** CIT 15% if revenue ≤ 3 billion VND (CIT Law 67/2025/QH15, from 01/10/2025). Software products and services are outside VAT under VAT Law 48/2024/QH15, Art. 5(21).

### Cited Findings
- **Resolution 198/2025/QH15, Art. 10** abolishes thuế khoán and lệ phí môn bài for household and individual businesses from 01/01/2026 — [thuvienphapluat Q&A (search summary)](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/giai-dap-doanh-thu-ho-kinh-doanh-bao-nhieu-duoc-mien-thue-2026-nang-muc-mien-thue-ho-kinh-doanh-2026-len-bao-nhieu-20491.html); news coverage [Tuổi Trẻ](https://tuoitre.vn/plo/bo-thue-khoan-tu-nam-2026-ho-kinh-doanh-can-lam-gi-post885846.html), [VnExpress](https://vnexpress.net/bo-thue-khoan-ho-kinh-doanh-tinh-thue-the-nao-tu-2026-4992081.html) *(secondary)*. The same Art. 10 gives innovative startups a 2-year CIT exemption followed by a 4-year 50% reduction. The resolution took effect 17/5/2025 — [diendandoanhnghiep (search summary)](https://diendandoanhnghiep.vn/nghi-quyet-198-2025-qh15-mien-thue-thu-nhap-ca-nhan-thue-thu-nhap-doanh-nghiep-khoi-nghiep-10154747.html) *(secondary)*. A 3-year CIT exemption for newly established small and medium enterprises (SMEs) is reported by [LuatVietnam](https://luatvietnam.vn/tin-van-ban-moi/doanh-nghiep-nho-va-vua-duoc-mien-thue-thu-nhap-doanh-nghiep-trong-vong-3-nam-186-102182-article.html), headline only; the text was not read
- **Threshold history:** the amended PIT Law raised the non-taxable threshold from 200 to 500 million VND per year, with the same figure for VAT — [VnExpress / Tuổi Trẻ via search summary](https://vnexpress.net/bo-thue-khoan-ho-kinh-doanh-tinh-thue-the-nao-tu-2026-4992081.html) *(secondary)*. **Decree 141/2026/NĐ-CP** (issued 29/4/2026), amending **Decree 68/2026/NĐ-CP**, then set **1 billion VND per year**, applied from 01/01/2026. At or below that, households are exempt from VAT and PIT on business income and must file revenue notification form 01/TKN-CNKD (Circular 18/2026/TT-BTC) by 31/1 of the next year, or twice a year (31/7 and 31/1) in their first year. E-invoices are optional below the threshold and **mandatory above 1 billion** (tax-authority-coded invoices, or invoices from connected cash registers) — [einvoice.vn](https://einvoice.vn/tin-tuc/hkd-doanh-thu-1ty-nam) *(secondary)*; the threshold and issue date are also in [thuvienphapluat article on Decree 141/2026](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/chinh-thuc-ho-kinh-doanh-duoi-1-ty-duoc-mien-thue-theo-nghi-dinh-141-2026-nd-cp-20747.html) *(seen only as a search summary)*
- **Above 1 billion (1–3 billion band):** VAT = revenue × sector rate, 5% for "services and other". PIT method 1 = (revenue − 1 billion) × sector rate; method 2 = (revenue − costs) × 17% (the source table also shows 20%, inconsistent) — [einvoice.vn](https://einvoice.vn/tin-tuc/hkd-doanh-thu-1ty-nam) *(secondary, internally inconsistent)*
- **Decree 117/2025/NĐ-CP** (issued 9/6/2025, effective 01/7/2025): managers of e-commerce and digital platforms **with a payment function, domestic or foreign**, withhold and pay VAT on domestic revenue and PIT for resident individuals on each transaction — [EY Tax News](https://taxnews.ey.com/news/2025-1337-vietnam-promulgates-decree-on-tax-administration-for-business-activities-on-e-commerce-and-digital-platforms-of-households-and-individuals) *(secondary)*. Withholding rates under Art. 5:

  | Category | VAT | PIT (resident) |
  |---|---|---|
  | Goods | 1% | 0.5% |
  | Services | 5% | 2% |
  | Transport / goods-related services | 3% | 1.5% |

  If the category is unclear, the highest rate applies. Sellers on platforms **without** a payment function self-declare (Art. 8(1)) — [LuatVietnam](https://luatvietnam.vn/thue-phi-le-phi/ho-ca-nhan-kinh-doanh-online-bi-khau-tru-thue-bao-nhieu-565-102490-article.html) *(secondary)*
- **Apple** (tax changes effective 21/8/2025):
  - Individual developers based in Vietnam: **2% PIT** replaces CIT; **5% FCT on Apple's commission**; the reduced 0% VAT for news, magazines and books is removed.
  - Organizations based in Vietnam: Apple stops remitting FCT on sales to end customers; 5% FCT applies to the commission.

  Source: [9to5Mac, 21/8/2025, summarising Apple's developer notice](https://9to5mac.com/?p=1015265) *(secondary)*. Apple Distribution International "is registered with Vietnam tax authority" and remits Vietnam FCT on commission for developers based in Vietnam — [Apple App Store Connect Help (search summary)](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information-for-alternative-payment-options)
- **Google Play:** Vietnam-based business households and individual developers selling to Vietnamese users have **5% withholding tax on gross sales** deducted by Google or its payment partners, and must submit a Vietnam tax code (12-digit personal ID) — [Google Play Console Help 9384608, fetched 19/10/2026](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en). Conflict: a search-engine snippet of the same page showed **2%**, which may be an older or other-language version. The live page fetched says 5%.
- Foreign suppliers (e.g. Apple, Google) declare through the GDT portal for foreign suppliers; 176 had registered by 30/9/2025 — [nhadautu.vn via search summary](https://nhadautu.vn/63-san-thuong-mai-dien-tu-khai-nop-thue-thay-cho-ho-va-ca-nhan-kinh-doanh-d100456.html) *(secondary)*
- **Company route:** CIT Law 67/2025/QH15 (from 01/10/2025): 15% if annual revenue ≤ 3 billion VND, 17% for 3–50 billion, 20% standard — [MISA AMIS](https://amis.misa.vn/246961/ap-dung-thue-suat-15-voi-doanh-nghiep-doanh-thu-duoi-3-ty/) *(secondary)*. VAT Law 48/2024/QH15 (effective 01/7/2025), Art. 5(21): "sản phẩm phần mềm và dịch vụ phần mềm theo quy định của pháp luật" (software products and software services) are **not subject to VAT**. Decree 181/2025/NĐ-CP guides the law — [MISA SME](https://sme.misa.vn/345925/ban-phan-mem-co-chiu-thue-gtgt-khong/) *(secondary)*

### Inferences
- **Hộ kinh doanh under 1 billion VND/year:** no VAT or PIT on direct web revenue, but revenue must be reported annually. Apple and Google still withhold 2% or 5% at source on store sales. Whether that withholding can be refunded or offset when total revenue is under 1 billion VND is unclear (see Gaps).
- **Direct web sales via Vietnamese gateways** (VNPAY, MoMo, bank QR via payOS): a payment gateway is not a "platform manager" in the Decree 117 sense, so nothing is withheld. The household or company declares the tax itself.
- **Company:** if the Pro subscription counts as a "software service", VAT is exempt. Online education is not clearly exempt, and the VAT classification should be confirmed with the tax office before pricing. CIT is 15% on profit for revenue ≤ 3 billion VND.

### Gaps
- **UNVERIFIED** (primary texts not read): the issue and effective dates of Decree 68/2026/NĐ-CP, and the PIT Law 2025 number and article.
- **UNVERIFIED:** whether the 1-billion threshold now also stops Decree 117 withholding by platforms, and whether withheld tax is refundable for households under the threshold.
- **UNVERIFIED:** whether Apple withholds VAT (and at what rate) for Vietnam-based individual developers. The Apple notice summary mentions only PIT and FCT.
- **Conflict:** Google's current 5% vs. the 2% snippet.
- Not verified: e-invoice timing rules for a company selling many small B2C subscriptions (Decree 123/2020 as amended).

---

## Q7. Sector licensing: Ministry of Education, internet-content rules (Decree 147/2024), the AI Law and the Digital Technology Industry Law

### Takeaway
No source found shows that a **self-study vocabulary app with the owner's own content** needs an education licence. Licensing by the provincial Department of Education (Sở GD&ĐT) concerns foreign-language **centres** that organise teaching. Under **Decree 147/2024/NĐ-CP**, a website or app showing only the owner's own content is a non-licensed type: specialised, internal or personal (Art. 24(2)). A licence or notification is needed only if the product becomes a **social network** (user posting or sharing) or an **aggregator**. Apple now shows a Vietnam-specific age rating (00+/12+/16+/18+) under Decree 147 Art. 38.

The **AI Law 134/2025/QH15** (in force 01/3/2026) and **Decree 142/2026/NĐ-CP** (in force 01/5/2026) apply to the AI-generated questions:
- systems are classified by risk;
- **medium-risk** systems, meaning ones where users might not know they deal with AI or AI content, must notify the Ministry of Science and Technology before use;
- labels are mandatory for AI audio, image or video that imitates real people or events;
- **text edits such as correction, summarising and translation are exempt from labelling.**

### Cited Findings
- **Decree 147/2024/NĐ-CP** was issued 09/11/2024 and took effect 25/12/2024 — [thuvienphapluat Q&A (search summary)](https://thuvienphapluat.vn/hoi-dap-phap-luat/website-co-phai-la-trang-thong-tin-dien-tu-phan-loai-trang-thong-tin-dien-tu-tu-ngay-25122024-138038200.html). **Art. 24(1)**: organisations may run aggregator sites or social networks only with a licence or a notification confirmation. **Art. 24(2)**: specialised-service, personal and internal sites and internal forums need no licence. **Art. 24(3)**: those sites need an aggregator licence if they "cung cấp thông tin tổng hợp" (provide aggregated information) — [hethongphapluat, Art. 24](https://hethongphapluat.com/nghi-dinh-147-2024-nd-cp-quan-ly-cung-cap-su-dung-dich-vu-internet-va-thong-tin-tren-mang/dieu-24)
- Under Decree 147, social-network users under 16 register with a parent's information (headline) — [LSVN](https://lsvn.vn/tu-15-12-2024-tre-duoi-16-tuoi-dang-ky-tai-khoan-mang-xa-hoi-bang-thong-tin-cua-cha-me-a149746.html) *(secondary, headline only)*
- **Apple** (21/5/2026, effective 18/6/2026): "To align with Article 38 of Vietnam Decree 147", Vietnam App Store apps get a region-specific age rating of 00+, 12+, 16+ or 18+, derived from the age-rating questionnaire — [Apple Developer News](https://developer.apple.com/news/?id=qs5bol0)
- **Education:** teaching foreign languages online through a language centre requires centre conditions and a licence from the Sở GD&ĐT. One expert says an online tutoring unit may only need the business code "Giáo dục khác chưa được phân vào đâu" (other education n.e.c.) and not registration as a centre under Decree 125/2024 — [Giáo dục Việt Nam](https://giaoduc.net.vn/tu-vu-mac-edu-day-tieng-anh-chui-can-tang-cuong-giam-sat-day-ngoai-ngu-online-post253371.gd) *(secondary, journalism)*
- **AI Law 134/2025/QH15** was passed 10/12/2025 (429/434 votes), took effect **01/3/2026**, and has 8 chapters and 35 articles. It repeals parts of the **Digital Technology Industry Law 71/2025/QH15**, including its Chapter IV — [Đại biểu Nhân dân](https://daibieunhandan.vn/quoc-hoi-thong-qua-luat-tri-tue-nhan-tao-10399959.html); [Cần Thơ gov portal (search summary)](https://pbgdpl.cantho.gov.vn/mot-so-diem-moi-cua-luat-tri-tue-nhan-tao); [VnEconomy](https://vneconomy.vn/luat-tri-tue-nhan-tao-se-co-hieu-luc-tu-ngay-132026.htm)
- **Decree 142/2026/NĐ-CP** (issued 30/4/2026, effective 01/5/2026):
  - Arts. 6–12: medium risk means a system that "có thể gây nhầm lẫn hoặc thao túng người dùng" (may confuse or manipulate users) because they do not know they are interacting with AI or AI content. Medium- and high-risk systems must file a dossier and notify the Ministry of Science and Technology (Bộ KH&CN) via the AI one-stop portal before use (Art. 12). Low-risk systems have no mandatory notification.
  - Art. 18(2): labels for AI audio, image or video imitating real people's appearance or voice, or recreating real events.
  - Labelling exemptions: technical edits; text processing such as correction, summarising or translation that does not distort the original; internal use; controlled research.
  - Art. 19: serious incidents reported within 72 hours (emergency) or 5 working days.
  - Systems in operation before 01/3/2026 had 60 days from 01/5/2026 to notify a transition plan.
  - Sandbox for SMEs in Chapter IV. Penalties not stated.

  Source: [Luật Việt An on Decree 142/2026](https://luatvietan.vn/nghi-dinh-142-2026-nd-cp-huong-dan-luat-tri-tue-nhan-tao.html) *(secondary)*

### Inferences
- AI-generated fill-in-the-blank questions are text, not imitations of real people or events. They likely fall outside the mandatory labelling in Art. 18(2). They could still be "medium risk" if learners might not realise the questions are AI-generated. A visible "câu hỏi do AI tạo" (AI-generated question) notice probably keeps the system in the low-risk tier. Whether the notice removes the need to notify the Ministry of Science and Technology depends on the self-classification tool and the PM's high-risk list: **UNVERIFIED**.
- **Social-network risk:** keep users from posting or sharing content publicly (shared word groups, comments, leaderboards with free-text names) unless the owner is ready for social-network notification and Decree 147 / Decree 333 verification duties.

### Gaps
- No primary source confirms that a self-study app needs **no** Ministry of Education permission. The finding rests on the absence of any rule found plus press commentary.
- Not read: the Prime Minister's list of high-risk AI systems, and whether "education/assessment" is on it. One summary says the law imposes stricter duties for finance, health, justice and education uses — [vnreview (search summary)](https://vnreview.vn/threads/luat-tri-tue-nhan-tao-chinh-thuc-co-hieu-luc-tu-01-3-dinh-hinh-hanh-lang-phap-ly-cho-ai-va-bao-ve-nguoi-dung.79722/latest) *(low-reliability forum source)*.
- Not checked: Decree 147's continued effect after the Cybersecurity Law 2025 and Decree 333/2026.
- Not read: Decree 147 Art. 38 itself.

---

## Q8. Advertising and marketing: ads in the app, marketing emails and push notifications

### Takeaway
The **amended Advertising Law 75/2025/QH15** (in force **01/01/2026**) adds duties for people who convey advertising, such as influencers (new Art. 15a). **Decree 91/2020/NĐ-CP** on spam messages, emails and calls is still the operative anti-spam instrument as of October 2026. A Ministry of Public Security draft to replace it was published in September 2026 and is not yet issued. Marketing emails need opt-in and opt-out under Decree 91, and separate consent under the data law (Law 91 Art. 9: consent per purpose) and the consumer law (Law 19 Art. 18: advertising use needs consumer choice).

### Cited Findings
- **Law 75/2025/QH15** amends Advertising Law 16/2012/QH13 (as amended by Laws 35/2018, 42/2024 and 47/2024). It was passed 16/6/2025, takes effect 01/01/2026, and adds Art. 15a on obligations of ad conveyors — [LuatVietnam](https://luatvietnam.vn/thuong-mai/luat-quang-cao-sua-doi-2025-so-75-2025-qh15-404208-d1.html); [LuatVietnam, 7 new points](https://luatvietnam.vn/linh-vuc-khac/diem-moi-cua-luat-quang-cao-sua-doi-2025-883-102813-article.html) *(details not read)*
- **Decree 91/2020/NĐ-CP** (anti-spam messages, emails and calls) is still cited as current in 2026 sources. It gives users the right to refuse ads and a do-not-advertise list. The Ministry of Public Security has a draft replacement decree with a comparison table, files dated 09/9/2026. The draft extends coverage to OTT messages and calls and cites the Telecom Law 24/2023/QH15, Law 91/2025 and Law 116/2025. Its number is blank — [Bộ Công an draft (doc)](https://bocongan.gov.vn/media/bca-media/library-20260909084715-f7e1171f-eb0c-4ae2-97ed-7017b136dc65-1-nghi-inh-thay-the-n-91.doc); [comparison table](https://bocongan.gov.vn/media/bca-media/library-20260909084715-c3d4dec4-0f78-459d-96de-3293d10b69b5-4-ban-so-sanh-du-thao.docx) *(both seen only as search summaries)*
- Consumer data used for advertising requires the consumer's choice (Law 19/2023 Art. 18) — [hethongphapluat mirror](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023.html)

### Inferences
- Product emails tied to the subscription (receipts, the Art. 42 renewal reminders, security emails) are service messages. Promotional emails and pushes need separate, unticked opt-in plus a one-click unsubscribe.
- If the app runs third-party ads (e.g. an ad SDK in the free tier), ad identifiers and behavioural targeting probably count as "behaviour-tracking" sensitive data under Decree 356 (Q3). That would strip the small-business exemptions.

### Gaps
- Not read: Decree 91/2020's email-specific rules (e.g. labelling an ad email "[QC]", unsubscribe mechanics, sending limits) and current fine levels. Not read: Law 75/2025's rules on online ads (skip button, ad labelling) and its implementing decree.

---

## Q9. Phased checklist (instrument → obligation → status as of 19/10/2026), plus foreign-user note

### Takeaway
Before the **first payment**, the owner needs:
- a business vehicle: at least a hộ kinh doanh, or an LLC if Apple "Organization" enrollment, limited liability or merchant gateways matter;
- a **confirmed e-commerce notification** for web and app (Decree 248/2026);
- Vietnamese-language Terms, Privacy Policy and Refund Policy displayed as Decree 248 requires;
- PDPL consent and notice mechanics;
- an under-16 / parental flow;
- subscription notices (7-working-day reminders, cancel-anytime);
- tax registration and the revenue-reporting routine.

Before **scaling**:
- DPIA and cross-border dossiers if any exemption is unavailable, including if learning history counts as sensitive data or the user count nears 100,000;
- a decision on data localization for user/account data;
- AI risk self-classification and any notification to the Ministry of Science and Technology;
- e-invoicing once revenue exceeds 1 billion VND;
- possibly a move to a company.

The table below is the instrument register used for the checklist. The status entries summarise findings cited in Q1–Q8.

### Cited Findings
Instrument status register (sources are those cited in Q1–Q8):

| Instrument | Issued | Effective | Status (19/10/2026) |
|---|---|---|---|
| Law on E-commerce 122/2025/QH15 | 10/12/2025 | 01/7/2026 | In force; transition to 30/6/2027 (Art. 41) |
| Decree 248/2026/NĐ-CP (e-commerce) | 30/6/2026 | 01/7/2026 (ID verification 01/01/2027) | In force; repeals Decrees 52/2013 and 85/2021 (Art. 52(3)) |
| Decree 52/2013, Decree 85/2021 | — | — | Repealed from 01/7/2026, except Art. 53 transition |
| PDPL 91/2025/QH15 | 26/6/2025 | 01/01/2026 | In force |
| Decree 356/2025/NĐ-CP (PDPL) | 31/12/2025 | 01/01/2026 | In force; replaces Decree 13/2023 (per EY) |
| Decree 13/2023/NĐ-CP | 17/4/2023 | 01/7/2023 | Replaced (per EY); old consents kept by Law 91 Art. 39 |
| Decree 330/2026/NĐ-CP (data penalties) | 19/8/2026 (news) | 19/8/2026 | In force (secondary sources) |
| Cybersecurity Law 116/2025/QH15 | 10/12/2025 | 01/7/2026 | In force; repeals Laws 24/2018 and 86/2015 |
| Decree 333/2026/NĐ-CP (cybersecurity) | 19/8/2026 | 19/8/2026 | In force (secondary sources) |
| Decree 53/2022/NĐ-CP | 15/8/2022 | 01/10/2022 | **UNVERIFIED**; parent law repealed 01/7/2026 |
| Consumer Protection Law 19/2023/QH15 | 20/6/2023 (not verified) | 01/7/2024 | In force |
| Decree 55/2024/NĐ-CP | 16/5/2024 | 01/7/2024 | In force |
| Decision 07/2024/QĐ-TTg (standard-contract list) | 20/6/2024 | 01/7/2024 | In force; online education not listed |
| AI Law 134/2025/QH15 | 10/12/2025 | 01/3/2026 | In force |
| Decree 142/2026/NĐ-CP (AI) | 30/4/2026 | 01/5/2026 | In force |
| Digital Technology Industry Law 71/2025/QH15 | 2025 | 01/01/2026 (not verified this session) | In force minus Chapter IV (repealed by Law 134) |
| Decree 147/2024/NĐ-CP (internet services) | 09/11/2024 | 25/12/2024 | Treated as in force (Apple cites Art. 38 in 05/2026); interplay with Decree 333 **UNVERIFIED** |
| Resolution 198/2025/QH15 | 2025 | 17/5/2025 (Art. 10 tax items from 01/01/2026) | In force |
| Decree 68/2026/NĐ-CP + Decree 141/2026/NĐ-CP (household tax, 1 billion threshold) | Decree 141: 29/4/2026 | applied from 01/01/2026 | In force (secondary sources) |
| Decree 117/2025/NĐ-CP (platform withholding) | 09/6/2025 | 01/7/2025 | In force; interaction with 1 billion threshold **UNVERIFIED** |
| CIT Law 67/2025/QH15 | 2025 | 01/10/2025 | In force (secondary) |
| VAT Law 48/2024/QH15 | 2024 | 01/7/2025 | In force (secondary) |
| Decree 168/2025/NĐ-CP (business registration) | 2025 | 01/7/2025 | In force |
| Advertising Law amendment 75/2025/QH15 | 16/6/2025 | 01/01/2026 | In force |
| Decree 91/2020/NĐ-CP (anti-spam) | 2020 | — | In force; replacement draft dated 09/2026 |
| Law on Children 102/2016/QH13 | 05/4/2016 | 01/6/2017 | In force ("trẻ em" = under 16) |

Foreign users (short note):
- The EU GDPR applies to a non-EU controller that offers services to, or monitors the behaviour of, people in the EU (Art. 3(2)). Merely being accessible in the EU is not enough — [gdpr-text Art. 3](https://gdpr-text.com/read/article-3/).
- Children's consent defaults to age 16, and EU Member States may lower it to no less than 13 (Art. 8) — [gdpr-text Art. 8](https://gdpr-text.com/read/article-8/?lang1=en).
- US COPPA applies to foreign-based sites and services directed to US children, or that knowingly collect from them, and protects children under 13 — [FTC COPPA FAQ B.7](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

### Inferences
**A. Must have before taking the first payment**
1. **Business vehicle.** Register at least a hộ kinh doanh (Decree 168/2025), or form a công ty TNHH một thành viên if any of these matter: Apple "Organization" seller name, limited liability, merchant gateway contracts. Obtain the tax code. With no registration, the risk is an unregistered-business finding (Q1).
2. **E-commerce notification** for the web and the app, confirmed by UBND cấp tỉnh **before** checkout goes live (Law 122 Art. 14(1); Decree 248 Arts. 23–24). Display the badge linking to online.gov.vn (Art. 45).
3. **Mandatory disclosures** visible on the main screen or via clear links (Decree 248 Arts. 4, 6, 8, 10, 14, 17):
   - owner name, address and tax code;
   - Terms (rights and obligations);
   - prices with VAT and fees stated;
   - payment and refund method;
   - return and refund policy with time limits and costs;
   - privacy policy.
4. **Checkout and contract flow:**
   - show the full terms before the order and allow review and correction (Law 122 Art. 12; Law 19 Arts. 37–38);
   - let the user download the contract;
   - keep contract data for 3 years, or the shorter period allowed for micro and household businesses (Law 122 Art. 16).
5. **Subscription mechanics:**
   - remind the user ≥ 7 working days before each renewal charge and before expiry (Law 19 Art. 42(2));
   - cancel any time, paying only for service used (Art. 42(3));
   - refund within 30 days where termination is lawful (Art. 38);
   - no unfair terms (Art. 25); Decree 55 Art. 6 form rules;
   - no registration of the terms is needed (Decision 07/2024).
6. **PDPL basics:**
   - processing notice in Vietnamese;
   - per-purpose, unticked consent with stored proof (Law 91 Arts. 9–10; Decree 356);
   - rights-request handling within Decree 356 deadlines;
   - breach plan: 72 hours to A05 (Art. 23), 24 hours under consumer law Art. 19;
   - written agreements with processors and foreign recipients.
7. **Minors:**
   - an age gate;
   - for under-16 users, account registration with parent or guardian information (Cybersecurity Law 116/2025 Art. 16(2));
   - child-plus-parent consent for ages 7+ where Law 91 Art. 24 applies.

   The Apple and Google age ratings must match (Decree 147 Art. 38 rating via App Store Connect).
8. **Tax set-up.** Register a tax code and submit it to Google Play and App Store Connect. Expect Apple to withhold 2% PIT and Google 5% on store sales. Keep revenue books. As a household under 1 billion VND, file revenue form 01/TKN-CNKD by 31/1. As a company, issue e-invoices and pay CIT at 15%.
9. **Marketing consent.** Keep promotional email and push consent separate from service messages (Decree 91/2020; Law 19 Art. 18).

**B. Must have before scaling** (more users, more revenue, more data, more AI)
1. **Data classification decision.** If learning history is "sensitive" (Decree 356), or cumulative users approach 100,000, or the business form is not exempt, file the **DPIA within 60 days of first processing** (Law 91 Art. 21). File the **cross-border dossier within 60 days of the first transfer** for Cloudflare or a foreign AI API (Art. 20). Update both every 6 months on change.
2. **Data localization.** Decide whether to host account and log data in Vietnam, or at least keep an in-country copy that can be retrieved (Law 116 Art. 25(3); Decree 333 Arts. 16, 19–20). Keep logs ≥ 12 months.
3. **Account verification.** Check whether Decree 333's Vietnamese-phone or personal-ID verification applies. If it does, add phone or ID verification for Vietnamese accounts.
4. **AI.** Run the Ministry of Science and Technology risk self-classification. Add an "AI-generated" notice on generated questions. Notify the ministry if the system is medium risk (Decree 142 Art. 12). Set up incident reporting: 72 hours for an emergency, 5 working days otherwise (Art. 19).
5. **Revenue above 1 billion VND/year (household).** Move to declaring VAT at 5% for services and PIT, and to mandatory e-invoices (Decree 68/141/2026). At this point re-evaluate converting to an LLC.
6. **DPO.** Once the small-business exemption no longer applies, appoint a qualified DPO or outsource the role (Decree 356).
7. **Re-filing.** Re-file the e-commerce notification within 20 working days of any change to domain, responsible person, business registration or policies (Decree 248 Art. 23(3)).

**C. Nice to have**
- Show an AI label on all AI content, even where not mandatory (Decree 142).
- Run a voluntary DPIA early, even if exempt.
- Do a GDPR/COPPA review before accepting EU or US users.
- Use Decree 142's SME AI sandbox if a higher-risk feature is planned.
- Keep an internal register of A05 forms and of the dates in the instrument table above.

### Gaps
- Every row marked UNVERIFIED in the table above, plus the open points in Q1–Q8. The highest-impact open points:
  1. whether learning history is sensitive data;
  2. whether the Decree 356 exemptions cover the cross-border dossier, and which business form qualifies;
  3. whether a domestic provider must store data in Vietnam automatically;
  4. how far Decree 333's account-verification duty reaches;
  5. whether an unregistered individual may lawfully sell subscriptions;
  6. which payment gateways accept which business forms.

  All of these warrant a short written opinion from a Vietnamese law firm before the first paid launch.
