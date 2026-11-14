# Apple App Store: from no account to a live app, for a solo developer in Vietnam (state as of 20/10/2026)

Scope: the Apple Developer account, App Store Connect setup, App Review and release. Build, signing and CI tooling are another
researcher's job and appear here only where the account or submission rules require them. All sources were read this session
(20/10/2026) unless a line says "search summary only" (meaning only the search engine's summary was seen, not the page itself).
Facts dated before 2025 are marked **(pre-2025, may be stale)** even when Apple's current page still lists them.

App context these notes apply to: English-vocabulary app for Vietnamese learners; Flutter iOS client (not built yet); NestJS API
already exists; email+password accounts (Google login planned); flashcards and spaced review; AI-generated practice questions;
auto-renewing "Pro" subscription (Free / Trial / Pro); ads planned; email reminders; one developer in Vietnam on Windows 11.

## 1. Individual vs Organization enrollment (fee, requirements, D-U-N-S, household business, seller name, identity checks, Vietnam eligibility)

### Takeaway
A Vietnam resident can enroll as an **Individual** for 99 USD a year (shown in local currency "where available"). Their **personal
legal name becomes the seller name** on the App Store, and Apple verifies their identity with a government photo ID. **Organization**
enrollment needs a real legal entity with a D-U-N-S Number, a website on its own domain and a work email on that domain. Apple
explicitly sends sole proprietorships and single-person businesses to Individual enrollment, so a Vietnamese *hộ kinh doanh*
(household business) almost certainly enrolls as Individual too; that last step is an inference, see below.

### Cited Findings
**Fee and payment**
- "The Apple Developer Program annual fee is 99 USD and the Apple Developer Enterprise Program annual fee is 299 USD, in local currency where available. Prices may vary by region and are listed in local currency during the enrollment process." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/); same 99 USD figure on [Apple Enroll](https://developer.apple.com/programs/enroll/)
- If Apple Developer products aren't sold on your region's Apple Store Online, you get a credit card form: "Please make your purchase with a credit card that can be charged in USD." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- An individual paying by credit card "must use your own credit card … If you do not, your enrollment will be delayed and you'll be asked for a copy of your government-issued photo identification." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- Tax: "When applicable, your membership purchase will be taxed using the tax rate for your region or state." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- In the Apple Developer app, membership is "an annual basis as an auto-renewable subscription that renews until cancelled"; Apple Account balances from gift cards "aren't accepted as payment" (except for developers in India); you can cancel up to one day before renewal; fees for the current year are non-refundable. — [Enroll with the Apple Developer app](https://developer.apple.com/support/app-account/)
- Fee waivers exist only for nonprofits, accredited educational institutions and government entities. — [Apple Enroll](https://developer.apple.com/programs/enroll/)

**Individual requirements**
- An Apple Account with two-factor authentication turned on; you must be "the legal age of majority in your region"; use your legal first and last name ("Using an alias, nickname, or company name … will cause a delay"). — [Apple Enroll](https://developer.apple.com/programs/enroll/)
- "Your personal legal name is needed so that you can enter into contracts with Apple. Your name will be displayed as the seller name of your apps on the App Store." P.O. boxes are not accepted. — [Apple Enroll](https://developer.apple.com/programs/enroll/)
- "If you are a sole proprietor/single-person business, you must join as an individual and your legal name will appear as the seller." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- Individuals and sole proprietors "can review the license agreement and purchase a membership at the time of enrollment" (no separate approval wait before paying, unlike organizations). — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- Changing an Individual account to an Organization account is not self-service: "please contact us." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)

**Identity verification**
- "Verification of your legal identity is currently required in order to enroll in Apple's developer programs." Individuals give legal name, phone and address; "In some cases, you may be asked for your government identification number or an image of your photo ID." — [Apple Identity verification](https://developer.apple.com/support/identity-verification/)
- In the Apple Developer app: "verify your identity using your driver's license or government-issued photo ID. Take a picture of your photo ID." "We accept passports in most regions, and some regions can accept additional types of government-issued ID, like a driver's license." Apple says it checks authenticity and reads name and address from the image "but will not keep the image"; an alternative method is available on request. — [Enroll with the Apple Developer app](https://developer.apple.com/support/app-account/)
- Devices for app enrollment: "An iPhone or iPad with Touch ID, Face ID, or passcode enabled, or a Mac with the T2 Security Chip and Apple Silicon. You must use the same device for the entire enrollment process." You must also be signed in to iCloud on that device. — [Enroll with the Apple Developer app](https://developer.apple.com/support/app-account/)
- "Enrollment in the Apple Developer Program is available through the Apple Developer app and on the web." Only India is app-only. "Enrollment may not be supported in certain regions, for example due to sanctions or other restrictions." No country list is published. — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- Anecdotal (Apple Developer Forums, August–September 2026): a German citizen living in Thailand could not enroll as an individual because his German passport and driver's licence were rejected for an account set to Thailand; another user reported the same pattern (an ID from a country other than the Apple Account's region is rejected). No fix was posted. — [Apple Developer Forums thread 844011](https://developer.apple.com/forums/thread/844011)
- Anecdotal, Vietnamese blogs (search summary only): individual enrollment is described as feasible for Vietnamese developers; one guide says Apple processes it within about two business days after payment, another says Individual is usually auto-approved in 24–72 hours. — [DotB guide](https://help.dotb.vn/dang-ky-tai-khoan-developer/huong-dan-dang-ky-tai-khoan-apple-developer/dang-ky-tai-khoan-apple-developer-cho-ca-nhan); [Hoàng Hà Mobile](https://hoanghamobile.com/tin-tuc/apple-developer)

**Organization requirements**
- "Your organization must be a legal entity that can enter into contracts with Apple. We do not accept DBAs, fictitious business names, trade names, or branches. Your organization's name will be displayed as the seller name." — [Apple Enroll](https://developer.apple.com/programs/enroll/)
- The enrolling person must have legal binding authority (owner/founder, executive, senior project lead, or an employee granted that authority); the work email must be on the organization's domain; the website must be "publicly available and functional", and social-media links or near-empty sites "won't be accepted". — [Apple Enroll](https://developer.apple.com/programs/enroll/)
- Organizations "may be asked for business documents that are notarized … Depending on your region, notarization may be done by a municipal office, solicitor, notary public, or other method." — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)
- Organizations pay only after "Apple Developer Support verifies the enrollment information and sends an email with next steps"; Apple states no verification time. — [Apple Enrollment support](https://developer.apple.com/support/enrollment/)

**D-U-N-S**
- A free nine-digit number from Dun & Bradstreet, requested through Apple's lookup tool. D&B "can take up to 5 business days" (expediting does not shorten it; email D&B if it takes more than two weeks), then Apple may need "up to 2 business days" to receive it. Corporations, limited partnerships and LLCs qualify; DBAs, trade names and branches do not. — [Apple D-U-N-S support](https://developer.apple.com/support/D-U-N-S/)
- "A sole proprietorship or single-person business isn't recognized as a legal entity." If the tool says "Your organization is not listed as a legal entity", you should enroll as an individual. — [Apple D-U-N-S support](https://developer.apple.com/support/D-U-N-S/)

### Inferences
- **Household business (hộ kinh doanh):** Apple sends sole proprietorships and single-person businesses to Individual enrollment, and accepts as organizations only legal entities that can contract (corporation, LP, LLC). A *hộ kinh doanh* is therefore almost certainly an Individual enrollment, and the developer's personal name appears as seller. That a hộ kinh doanh is not a legal entity (pháp nhân) under Vietnamese law was **not verified this session** (ASSUMPTION). A *công ty TNHH một thành viên* (single-member LLC) is the smallest Vietnamese form that fits Apple's "LLC" category.
- **Organization timeline for a new Vietnamese company:** company registration, then D-U-N-S (up to about 7 business days), then a working website and domain email, then Apple's unpublished verification time (possibly notarized documents too). Expect weeks, not days. This estimate is mine, not Apple's.
- **Vietnam eligibility:** Apple publishes no list of countries where enrollment is blocked. Vietnam is a normal App Store region (see section 7) and Apple names sanctions as the blocking reason, so Individual enrollment from Vietnam should be possible. The Vietnamese guides describing it agree, but they are anecdotal.
- **Practical identity-check advice from the forum pattern:** set the Apple Account's region to Vietnam and verify with a Vietnamese document, ideally a valid Vietnamese passport, since Apple says passports are accepted "in most regions". Whether the CCCD (citizen ID card) is accepted is unknown.
- **No Mac or iPhone:** web enrollment on Windows is possible. App enrollment needs an iPhone, iPad or Apple-silicon Mac. An iPhone is in any case close to essential for testing TestFlight builds on a real device.
- **Project-doc cross-check:** the checklist (H1) and the readiness doc Q1 say an individual account shows the owner's real name and an organization needs a legal entity plus D-U-N-S. Both are **consistent** with Apple's pages.

### Gaps
- **VND price** of the membership: Apple only says it is shown in local currency "where available". No page or anecdote seen this session gives the Vietnam figure, or says whether Vietnam is charged in VND or in USD by card.
- **Accepted ID documents for Vietnam** (passport only, or CCCD too): not published; only an Apple Support contact or a real attempt would settle it.
- **Apple's verification time** for individuals or organizations: not stated officially; the only figures are the anecdotal "24–72 h" and "about two business days".
- **D&B Vietnam process specifics** (local office, documents asked for a Vietnamese TNHH): not researched; only Apple's generic D-U-N-S page was read.
- Forum threads [835984](https://developer.apple.com/forums/thread/835984) and [816941](https://developer.apple.com/forums/thread/816941) (identity checks failing with no reason given; company enrollment declined after the ID check) were seen as search results only; not read.

## 2. Trader status under the EU Digital Services Act (DSA)

### Takeaway
Every account must declare trader or non-trader once, even without EU distribution. A **trader** (selling commercially, which a
paid Pro subscription in the EU would almost certainly count as) must have a verified address, phone and email shown publicly on
EU product pages; for an individual that means a personal address or a documented P.O. box. Turning off availability in all 27 EU
territories avoids publishing those details, and Apple's own text treats an App-Store-outside-the-EU developer as "not acting as a
trader".

### Cited Findings
- Since 17/2/2025: "Apps without trader status will be removed from the App Store in the European Union (EU) until trader status is provided and verified." Since 16/10/2024 **(pre-2025, may be stale, but still listed)**: trader status is required to submit updates for apps on the EU App Store. — [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- "Even if you don't distribute apps in the EU, you'll still need to declare a trader status." — [App Store Connect Help: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- "If you don't distribute apps on the App Store in the EU (for example you only distribute … on the App Store only outside the EU), you're not acting as a trader on the App Store. Apple can't determine whether you're a trader." The non-trader choice ("This is not a trader account") needs no contact information. — [DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- Traders who are individuals must provide "Address or P.O. Box, Phone number, Email address". Once verified, Apple "will publish this information on your App Store product page when your app is distributed in any of the 27 territories of the EU". Verification uses two-factor codes for email and phone, plus "a current document that verifies your business name and address"; a P.O. box needs proof of association (a receipt or bill). Traders must also give payment account details and certify EU-law compliance. — [DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- For non-traders, "consumers in the EU will be informed that consumer rights stemming from applicable consumer protection laws won't apply to contracts between you and them." Trader status can be set per app (App Information → App Store Regulations and Permits → Digital Services Act). — [DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- Availability is chosen country by country; there is no single "exclude EU" switch, so EU countries are deselected one by one. — [Manage availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store)

### Inferences
- With Vietnam as the primary market, the simplest path is: launch outside the EU (deselect the 27 EU territories), declare non-trader, and revisit the question before any EU launch. A worldwide-later launch that includes the EU with a paid subscription would put the developer's address and phone on public EU product pages unless they use a documented P.O. box. That disclosure is a reason in favour of an Organization account (company address) before an EU launch.
- Declaring "non-trader" while actually selling subscriptions in the EU would likely misrepresent commercial activity under the DSA. That is a legal judgement this note does not make (not legal advice).

### Gaps
- Whether a Vietnam bank or company document works as the "current document that verifies your business name and address" for an individual trader: not stated.
- Whether Apple accepts a Vietnamese P.O. box: not stated.

## 3. Agreements, tax and banking in App Store Connect (Vietnam developer)

### Takeaway
Free distribution needs only the Developer Program License Agreement. **Selling the Pro subscription needs the Paid Apps
Agreement**, signed by the Account Holder, then tax forms, then a single bank account. Apple pays **within 45 days of the end of the
fiscal month** once proceeds pass a monthly threshold, which is **40 USD** for a Vietnam bank (Vietnam isn't in Apple's table, so the
"all other" rule applies). For Vietnam-based individuals Apple withholds a 2% personal income tax (since 21/8/2025, per secondary
sources).

### Cited Findings
**Agreements**
- "By joining the Apple Developer Program, you can distribute free apps on the App Store under the Apple Developer Program License Agreement." "To sell your apps on the App Store or offer In-App Purchases, the Account Holder must sign the Paid Apps Agreement." The agreement "must be active in order for you to submit or update paid apps and In-App Purchases." "You won't be able to create a new app or In-App Purchase until you've agreed to the most recent version of the Paid Apps Agreement." After a membership lapse you must click "Renew Agreement". — [Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)
- "You can't add an app to your account until the Account Holder signs the latest agreement in the Business section." — [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app)

**Tax**
- The Paid Apps Agreement comes first: "In order to submit tax forms, you first need to sign the Paid Apps Agreement." Non-US developers answer a questionnaire that routes them to "the W-8BEN, W-8BEN-E, or W-8ECI" (W-8BEN is the individual form). "Once you submit this information, you won't be able to make any changes in App Store Connect." — [Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- The country-specific tax sections on that page cover Australia, Brazil, Canada, Ireland, Mexico, Singapore, South Korea, Taiwan and Thailand; **no Vietnam section was found** in the full page read this session. — [Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- Vietnam tax changes effective 21/8/2025, secondary sources (search summary only): for **Vietnam-based individual developers**, a 2% personal income tax replaces corporate income tax; Apple stops remitting foreign contractor tax (FCT) on sales to end customers and instead applies 5% FCT to Apple's commission. Non-Vietnam organizations selling into Vietnam move from 5% to 10% VAT. Vietnam prices for apps and one-off IAPs were auto-adjusted from 8/9/2025, but **auto-renewable subscriptions were excluded**. — [PPC Land](https://ppc.land/apple-announces-tax-and-pricing-updates-affecting-global-developers/); [9to5Mac](https://9to5mac.com/?p=1015265); [Gummicube](https://www.gummicube.com/blog/apple-updated-in-app-purchases-and-subscriptions-for-select-territories)
- Search summary only: Apple Distribution International is registered with Vietnam's tax authority (Tax ID 9000000486) and remits Vietnam FCT on commission. — [Provide tax information for Core Technology Fee](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information-for-core-technology-fee)

**Banking and payouts**
- "In order to add banking information, you'll first need to sign a Paid Apps Agreement"; "You must submit all required tax forms needed for your paid contract in order for us to process banking information." You choose "the primary currency of the bank account"; the account number must belong to "the legal entity or individual enrolled"; enter details "exactly as it appears on your bank account or your payment may be rejected"; one bank only. — [Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- Payment conditions: an active Paid Apps Agreement, banking information on file, proceeds over the minimum monthly threshold "for each country or region in which you sell content", and any monthly invoicing your country requires. "Payments are made … within 45 days of the last day of the fiscal month in which the transaction was completed." Apple's bank converts to your account currency, "typically the spot rate on the date of payment"; bank and intermediary fees may reduce the deposit. — [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- Threshold: Vietnam has no row in Apple's table; bank country and currency pairs not listed "must exceed a minimum payment threshold of 40 USD". — [Minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/minimum-payment-threshold)

### Inferences
- Order of operations: enroll → Account Holder signs the Paid Apps Agreement → tax questionnaire (W-8BEN for an individual) → bank account → create the subscription products. The subscription can be configured only after the agreement is signed.
- A Vietnam bank account in either VND or USD falls under the 40 USD rule (inferred from the table's structure; the USD row is for the United States only).
- A 2% withholding by Apple does not by itself settle the developer's own Vietnamese tax obligations (household-business filing and so on). That belongs to the tax/legal researcher.
- **Project-doc cross-checks:**
  - The readiness doc cites the 2% PIT and 5% FCT to "[Apple Developer News, 21/8/2025](https://developer.apple.com/news/?id=qs5bol0)". Fetched this session, that URL resolves to the News page, and the Vietnam item readable there is the **21/5/2026 age-rating item**, not the August 2025 tax item. The tax facts themselves are consistent across three secondary sources, but the doc's citation points to the wrong item. Mark it as secondary-confirmed and primary-unverified.
  - Checklist H10 says the developer must declare a tax code or 12-digit CCCD to Apple. **Not confirmed:** Apple's tax-information page has no Vietnam section. It may appear only inside App Store Connect.
  - The 45-day payout in the readiness doc is **consistent**.

### Gaps
- Whether App Store Connect asks Vietnam-based individuals for a Vietnamese tax code (MST) or CCCD, and the exact current withholding rate. Only visible inside a live account, or in Apple's original August 2025 notice, which was not read this session.
- What happens to proceeds below 40 USD (rolled over to the next month?): Apple's threshold page does not say.
- Whether Vietnamese banks charge for incoming SWIFT transfers, and Apple's payout currency options for Vietnam: not found.
- The Small Business Program (15% commission), cited in the project docs, was not re-checked this session.

## 4. App Store Connect setup: bundle ID, app record, metadata, screenshots, privacy, age rating, TestFlight

### Takeaway
Create the app record (platform, name, primary language, bundle ID, SKU, user access). Then fill in: a **privacy policy URL
(required for every app)**, App Privacy answers covering third-party SDKs (the ad SDK included), the new age-rating questionnaire
(which since 18/6/2026 also yields a **Vietnam-only rating of 00+/12+/16+/18+**), screenshots, and the subscription products (**the
first subscription must ship with a new app version**). TestFlight allows 100 internal and 10,000 external testers; the first
external build goes through Beta App Review, and builds expire after 90 days.

### Cited Findings
**App record**
- The New App dialog has: platforms, app name, primary language, bundle ID, SKU, and user access (Limited or Full). Required role: Account Holder, App Manager or Admin. "You can use an app name for one app per localization"; if another developer holds the name and you own a trademark, "you can submit a claim." — [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app)

**Privacy**
- "A privacy policy URL is required for all apps, while a user privacy choices URL is optional." App Store apps must "explain your data handling practices in App Store Connect"; "You must include information about your app's privacy practices and those of third-party partners whose code you integrate into your app"; keep answers up to date. — [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)

**Age rating (new system, 2025–2026)**
- Since 31/1/2026: all ratings were auto-updated to the new system (shown on iOS 26 and later), and developers had to answer the updated questions "by January 31, 2026, to avoid an interruption when submitting your app updates." — [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- New global values: 4+, 9+, 13+, 16+, 18+, plus Unrated (cannot be published). Questionnaire groups: In-App Controls (parental controls, age assurance); Capabilities (unrestricted web access, user-generated content, social media, messaging and chat, advertising); Mature Themes; Medical or Wellness; Sexuality or Nudity; Violence; Chance-Based Activities. At 4+, advertising, user-generated content and messaging are allowed; "Unrestricted web access" pushes an app to 16+. — [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)
- Vietnam: "As required by Article 38 of Vietnam Decree 147, apps that have at least one of the following content descriptors will display the region-specific age rating": **00+** (may include parental controls, age assurance, user-generated content, messaging and chat, advertising, infrequent contests), **12+**, **16+** (unrestricted web access, social media, …) and **18+**. — [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)
- Apple news item of 21/5/2026, "Upcoming changes to age ratings in Australia and Vietnam": starting 18/6/2026, apps on the App Store in Vietnam need a region-specific rating from the questionnaire, shown on the Vietnam product page. — [Apple Developer News](https://developer.apple.com/news/?id=qs5bol0)
- Guideline 2.3.6: "Answer the age rating questions in App Store Connect honestly … If your app is mis-rated … it could trigger an inquiry from government regulators." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Screenshots (current page, 2026)**
- Required: "**iPhone:** At least one screenshot for iPhone with Dynamic Island (medium display)" (1179×2556 or 1206×2622 portrait, or the landscape equivalents); "**iPad (if your app supports iPadOS):** At least one screenshot for iPad 13-inch display" (2064×2752 or 2048×2732 portrait). 1 to 10 screenshots per size; .jpeg, .jpg or .png; no alpha channel. Provide only the highest required resolution if the UI is the same across sizes, and Apple scales it down. — [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- The same page's "iPhone with Face ID (large display)" row (6.5-inch, 1284×2778 or 1242×2688) says "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided". The large Dynamic Island sizes (6.9-inch class) are 1260×2736, 1290×2796 and 1320×2868. **The intro and this row disagree** on what is mandatory. — [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- Upcoming: "iPhone Duo" screenshots will be required "Starting in April 2027 … for any app using the iOS 27.1 SDK or later." — [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)

**Subscriptions (App Store Connect side)**
- Subscription group: up to 100 subscriptions per group; a customer holds one per group at a time, so a single group is "the best practice for most apps". Each product needs a reference name, product ID, duration (1 week, 1, 2, 3 or 6 months, 1 year), price, availability, and review information (a screenshot and notes). — [Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions)
- "Your first auto-renewable subscription must be submitted with a new app version. Your first subscription group must also be submitted with a new app version … select Add for Review on the subscription detail page." — [Offer auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions)

**TestFlight**
- Up to 100 internal testers (App Store Connect users) and up to 10,000 external testers, invited by email or public link. "When you add the first build of your app to a group, the build gets sent to App Review … A review is required only for the first build. Subsequent builds may not require a full review." "You can test a build for up to 90 days." You provide a beta description, what to test and a feedback email. — [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)

### Inferences
- **Likely ratings for this app:** global 4+ and Vietnam 00+, provided it has ads but no in-app browser to arbitrary pages, no chat between users and no social features. AI-generated practice sentences are not a separate descriptor. If learners' own sentences are shared with others, "user-generated content" applies, which is still 00+/4+. A WebView that can browse freely would push it to 16+.
- **Ads affect the privacy label** (third-party partner data must be declared) and answer "Advertising" in the age questionnaire. Whether App Tracking Transparency (Apple's prompt asking permission to track the user across other apps) is needed depends on the ad SDK. Not researched here.
- **Screenshots safe path,** given the contradiction: upload the medium Dynamic Island size (1206×2622) **and** one large size (1320×2868). If the Flutter build declares iPad support, iPad 13-inch screenshots become mandatory. Whether Flutter's default iOS template targets iPad too is an ASSUMPTION for the build researcher; restricting the build to iPhone-only avoids iPad screenshots and iPad layout review.
- **Plan the first submission to include the Pro subscription group** (Free / Trial / Pro): a trial is an introductory offer on the auto-renewable product (Guideline 3.1.2(a), section 6). Shipping v1.0 without the subscription means the subscription must wait for the next app version.
- **Project-doc cross-check:** the Vietnam 00+/12+/16+/18+ rating from 18/6/2026 (checklist H6) is **confirmed** by both Apple pages.

### Gaps
- **Support URL:** not verified this session. Guideline 1.5 (cited by the project docs) was not in the portion of the Guidelines read, so "support URL is required" stays an ASSUMPTION; metadata character limits (name, subtitle, keywords) were not verified either.
- The "Set up introductory offers" page (free-trial mechanics in App Store Connect) and "Testing subscriptions and In-App Purchases in TestFlight" were not read.
- Whether the bundle ID can change after the first build upload: not on the pages read (commonly believed fixed; unverified).

## 5. Current minimum build requirements (SDK/Xcode, deployment target, privacy manifest)

### Takeaway
Since **28/4/2026** every upload must be built with **Xcode 26 or later and the iOS 26 SDK**; since **9/9/2026** iOS apps must target
**iOS 13 or later**. Apps that include a listed SDK need its privacy manifest; **Flutter is on Apple's list**, as are GoogleSignIn and
Firebase pods. Approved reasons for "required-reason" APIs (system calls Apple flags as fingerprinting-prone, which must declare why
they are used) are mandatory for uploads.

### Cited Findings
- Since 28/4/2026: "Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26, iPadOS 26, tvOS 26, visionOS 26, or watchOS 26." — [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- Since 9/9/2026: "iOS and iPadOS apps uploaded to App Store Connect must target iOS 13 or later." — [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- Since 1/5/2024 **(pre-2025, still listed as current)**: "You'll need to include approved reasons for the listed APIs used by your app's code (including from third-party SDKs) to upload a new or updated app." — [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- "You must include the privacy manifest for any SDK listed below when you submit new apps … Signatures are also required … where the listed SDKs are used as binary dependencies. Any version of a listed SDK, as well as any SDKs that repackage those on the list, are included." The list includes **Flutter**, path_provider, shared_preferences_ios, url_launcher, sqflite, flutter_local_notifications, connectivity_plus, device_info_plus, package_info_plus, share_plus, FirebaseCore, FirebaseMessaging, FirebaseCrashlytics, **GoogleSignIn**, GTMAppAuth and others. — [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- No 2027 deadline is listed yet on Upcoming Requirements; the screenshot page separately announces iPhone Duo screenshots from April 2027 for iOS 27.1 SDK builds. — [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/); [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)

### Inferences
- For a developer on Windows with no Mac, the Xcode 26 rule means the build and upload step must run on macOS: a borrowed or bought Mac, or a cloud macOS CI runner. That Xcode runs only on macOS is well known but was not re-checked this session; tooling is the other researcher's scope.
- Apple's annual cycle suggests a new Xcode/SDK minimum around April 2027 (likely Xcode 27 or iOS 27 SDK), but **nothing is announced**, so treat it as speculation.
- **Project-doc cross-check:** checklist H7, "Xcode 26 from 28/4/2026", is **confirmed** on Apple's page (the doc had it from a search summary only). The iOS 13 minimum target from 9/9/2026 is **new** and not in the project docs.

### Gaps
- The exact macOS version that Xcode 26 requires: not checked (tooling researcher).
- Whether the Flutter engine's bundled privacy manifest fully covers the app, or the app needs its own `PrivacyInfo.xcprivacy` for its own required-reason API use: not checked.

## 6. App Review: timing, demo account, likely rejection reasons for this app, appeals, expedited review

### Takeaway
Apple reviews **at least 50% of submissions in under 24 hours and 90% in under 48 hours**. For a login-gated app Apple must receive a
working **demo account** and a **live backend**. The guidelines this app is most exposed to: 2.1 (completeness), 3.1.1/3.1.2
(subscription via IAP, ≥ 7 days, clear description), 4.2 (not a repackaged website), 4.8 (Sign in with Apple once Google login is
added), 5.1.1(v) (in-app account deletion, with a subscription notice), and 5.1.2(i) (explicit permission before sending personal
data to a third-party AI). Appeals go to the App Review Board, one per rejected submission.

### Cited Findings
**Timing, expedite, appeal, contact**
- "App Review works around the clock, typically reviewing at least 50% of submissions in less than 24 hours and 90% in less than 48 hours." "If your submission is incomplete, review times may be delayed." — [Apple App Review](https://developer.apple.com/distribute/app-review/)
- Expedited review is for "extenuating circumstances, such as fixing a critical bug in your app or releasing your app to coincide with an event you're directly associated with"; include repro steps for a bug, or the event name and date. — [Apple App Review](https://developer.apple.com/distribute/app-review/)
- Appeal to the App Review Board if "we misunderstood your app's concept and functionality, or … you were treated unfairly"; give specific reasons; "Submit only one appeal per submission"; answer any requests for information first. 30-minute Webex appointments with App Review are also offered. — [Apple App Review](https://developer.apple.com/distribute/app-review/)

**Demo account and backend (2.1)**
- "If some features require signing in, provide a valid demo account username and password"; enter everything in the App Review Information section; otherwise "your app may not pass review." — [Apple App Review](https://developer.apple.com/distribute/app-review/)
- 2.1(a): submissions "should be final versions with all necessary metadata and fully functional URLs … placeholder text, empty websites, and other temporary content should be scrubbed … include demo account info (and turn on your back-end service!)." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Subscriptions (3.1.x)**
- 3.1.1: "If you want to unlock features or functionality within your app, (by way of example: subscriptions …) you must use in-app purchase." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.2(a): "the subscription period must last at least seven days and be available across all of the user's devices"; free trials go through "the relevant information set forth in App Store Connect". 3.1.2(c): "Before asking a customer to subscribe, you should clearly describe what the user will get for the price … Ensure you clearly communicate the requirements described in Schedule 2 of the Apple Developer Program License Agreement." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Minimum functionality (4.2)**
- "Your app should include features, content, and UI that elevate it beyond a repackaged website." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Login services (4.8)**
- Apps using a third-party or social login (Google Sign-In is named) "to set up or authenticate the user's primary account … must also offer as an equivalent option another login service" that limits data to name and email and lets users keep their email private. Exempt: an app that "exclusively uses your company's own account setup and sign-in systems." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Account deletion (5.1.1(v))**
- "If your app supports account creation, you must also offer account deletion within the app." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple's deletion guidance:
  - Deletion must be easy to find (usually account settings) and remove "the entire account record, along with associated personal data"; deactivation alone "is insufficient".
  - A direct link to a web page that finishes the process is allowed; asking people to email or phone is not, outside regulated industries.
  - Sign in with Apple apps "should use the Sign in with Apple REST API to revoke user tokens".
  - Subscribers must be told "billing will continue through Apple" and asked to cancel first, for example via `showManageSubscriptions`.
  - Deletion can be manual if it takes "a reasonable amount of time"; tell the user how long it takes and confirm when done.

  — [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

**Third-party AI (5.1.2(i))**
- "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Inferences
- **Typical calendar:** about 1–2 days for the first Beta App Review (external TestFlight), then about 1–2 days for the App Store review; each rejection-and-resubmit cycle adds a similar wait. Budget 1–2 weeks of calendar time for review loops on a first app. This is my estimate from Apple's percentiles, not a published figure.
- **Highest-risk points for this app:**
  1. A demo account that is Free with no quota left, or a backend not deployed. The project's deploy is postponed to "when the app is complete", and review needs a public API.
  2. The demo account being unable to reach Pro features: the reviewer must be able to buy in the sandbox, or the review notes must explain.
  3. A Pro paywall where the renewal price, period and Terms/Privacy links aren't clear (3.1.2(c) / Schedule 2).
  4. No in-app account deletion (planned only for Bước 8 in the project docs, so it must exist before the first iOS submission).
  5. AI calls sending learner sentences without an explicit consent screen.
  6. When Google login lands, it must ship together with Sign in with Apple, or another login meeting 4.8's privacy features; email+password alone is exempt.
- **Project-doc cross-check:** checklist H4/H5 and G3 (Sign in with Apple when Google login exists, in-app deletion, explicit AI consent) are **consistent** with the current guideline text.

### Gaps
- Real-world 2026 review times for Vietnam-based developers: no sources found; only Apple's global percentiles.
- Guideline 5.6 (Developer Code of Conduct) and 1.5 (Developer Information) were past the portion of the Guidelines read this session.
- The Guidelines page showed no "last updated" date in the portion read.

## 7. Release options, country availability (Vietnam storefront) and ongoing obligations

### Takeaway
After approval you can release **manually**, **automatically**, or **automatically but no earlier than a date**. Phased release
(7 days: 1→2→5→10→20→50→100%, pausable for 30 days in total) applies to **updates**. Pre-orders force a manual release. Countries are
picked one by one, and Vietnam is a live storefront. The membership renews yearly. **If it lapses, the app disappears from the
store** (installed copies keep working), and free apps return within 24 hours of renewal.

### Cited Findings
**Release options**
- Options: "Manually release this version"; "Automatically release this version"; "Automatically release this version after App Review, no earlier than" a date and time. With pre-order in a not-yet-released country, release is forced to manual, and releasing "publish[es] for pre-order in countries or regions where pre-order is enabled". Apple emails a reminder if a version sits in Pending Developer Release for more than 30 days; it can take up to 24 hours to appear. — [Select an App Store version release option](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/)
- Phased release "will release your app's update gradually over 7 days" to users with automatic updates: day 1: 1%, 2: 2%, 3: 5%, 4: 10%, 5: 20%, 6: 50%, 7: 100%. "You can pause your release for a total of 30 days"; anyone can still download it manually. "If you remove your app from sale — including when your Apple Developer Program membership lapses — phased release will stop." — [Release a version update in phases](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases)

**Availability and pre-orders**
- Availability options: "All Countries or Regions", "Specific Countries or Regions" or "Publish as Pre-Order"; a checkbox keeps the app available in new countries added later; deselecting a country removes the app there; changes "may require up to 24 hours to be visible". "Once your app becomes available … in a country or region, pre-orders are no longer possible in that same location." — [Manage availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store)
- Vietnam storefront: Apple's 21/5/2026 news item refers to "apps available on the App Store in Vietnam", which get a Vietnam-specific age rating from 18/6/2026. — [Apple Developer News](https://developer.apple.com/news/?id=qs5bol0)

**Membership renewal and lapse**
- Web-enrolled accounts renew manually from 30 days before expiry, or automatically by card ("only available in certain regions"); app-enrolled accounts renew as an auto-renewable subscription and can resubscribe "for up to one year after your membership expiration date." — [Apple renewal support](https://developer.apple.com/support/renewal/)
- On expiration: "your apps will no longer be available for download and you won't be able to submit new apps or updates or access Certificates, Identifiers & Profiles"; installed apps "will still function". After a late renewal, "any free apps … will become available again within 24 hours. Any paid apps … will become available again after you … accept the Paid Applications Agreement. You don't need to resubmit." Test devices are removed 180 days after expiry unless removed earlier. — [Apple renewal support](https://developer.apple.com/support/renewal/)
- Ongoing obligations already cited above: accept each new Paid Apps Agreement version before creating new apps or IAPs ([Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)); keep privacy answers accurate ([Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)); rebuild with each new Xcode/SDK minimum for updates ([Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)).

### Inferences
- For a Vietnam-first launch: set availability to Vietnam only (or Vietnam plus chosen non-EU countries) and use "Manually release this version" so launch day is under the developer's control. Phased release is useless for v1.0, since it applies to updates; use it from v1.1.
- **Membership lapse and Pro subscribers:** the app vanishes from the store, but whether existing Pro auto-renewals keep billing or stop is **not documented** on the pages read. For a subscription business this is the single biggest reason to keep membership on auto-renew.
- **End-to-end calendar for an individual, excluding app build work:**

  | Step | Time |
  |---|---|
  | Enrollment | about 1–3 days (anecdotal) |
  | Paid Apps Agreement, W-8BEN, bank | same day to a few days (unverified) |
  | First TestFlight external review | about 1–2 days |
  | App Store review, including one rejection loop | about 2–5 days |

  Roughly 1–2 weeks in total. An Organization path adds company registration plus D-U-N-S (up to about 7 business days) plus Apple's verification. These are my estimates, not Apple's figures.
- **Annual costs on the Apple side:** 99 USD membership (VND equivalent unknown). D-U-N-S is free. Mac or cloud build costs belong to the tooling researcher.

### Gaps
- The pre-order lead-time limit (often said to be up to 180 days): not on the pages read; the "Publish for pre-order" page was not fetched.
- What happens to active auto-renewable subscriptions, and to TestFlight builds, while the membership is lapsed: not documented on the renewal page.
- Whether Vietnam is billed through Apple Store Online in VND, which decides whether the 99 USD is charged in VND and whether web auto-renewal is offered: not verified.
