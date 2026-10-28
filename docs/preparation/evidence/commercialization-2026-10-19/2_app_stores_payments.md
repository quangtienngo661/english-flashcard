# App-store and payment requirements for selling digital subscriptions (Vietnam seller, web + iOS + Android), as of 19 Oct 2026

All pages below were fetched on 2026-10-19 unless stated otherwise. "UNVERIFIED" = could not be confirmed from an official page this session. "Inference" = my reasoning from the cited facts, not a source statement.

Note on the owner's local files: `docs/subscription-recurring-payments-and-negative-option-billing-merchants–faqs.pdf` is **Mastercard's** FAQ and rule text (it says "Mastercard first announced these requirements in September 2021"), **not a Visa document**, despite the filename. The second file, `...–faqs-1.pdf`, is not a card-network document at all: its text is the **Duolingo Q2 2026 shareholder letter** (e.g. "DUOLINGO Q2 2026", DAU 58.7M, paid subscribers 12.7M). Visa's own rules are summarised from Visa's flier in Q4.

## Q1. Apple App Store: account, Review Guidelines, commission, Vietnam tax and payouts

### Takeaway
On iOS, Pro must be sold through Apple In-App Purchase (3.1.1). In Vietnam the app may not link to, or mention, cheaper web payment (anti-steering applies everywhere except the US storefront). A user who paid on the web may use Pro in the iOS app, but only if Pro is also sold as IAP (3.1.3(b)). Fees for a new solo developer: 99 USD/year, plus 15% commission under the Small Business Program. For a Vietnam-based individual, Apple now withholds 2% PIT and applies a 5% FCT on its own commission. Adding Google Sign-In triggers 4.8, so an "equivalent" privacy login is needed, in practice Sign in with Apple. In-app account deletion (5.1.1(v)) and the new Vietnam age rating (Decree 147, from 18 Jun 2026) are mandatory.

### Cited Findings

**Developer Program account**
- Fee: "The Apple Developer Program is 99 USD per membership year. Prices may vary by region and are listed in local currency during the enrollment process." Fee waivers exist only for nonprofits, accredited educational institutions and government entities. — [Apple: Enrollment](https://developer.apple.com/programs/enroll/)
- Individual: requires an Apple Account with 2FA, legal age of majority, and legal name. "Your name will be displayed as the seller name of your apps on the App Store." — [Apple: Enrollment](https://developer.apple.com/programs/enroll/)
- Organization: "Your organization must be a legal entity that can enter into contracts with Apple. We do not accept DBAs, fictitious business names, trade names, or branches." It needs a D-U-N-S Number, a public website on the organization's domain, and a work email on that domain; the organization's name is shown as the seller. — [Apple: Enrollment](https://developer.apple.com/programs/enroll/)
- The VND price of the membership: UNVERIFIED (Apple shows it only during enrollment).

**3.1.1 In-App Purchase (live guideline text)**
- "If you want to unlock features or functionality within your app, (by way of example: subscriptions, ... access to premium content, or unlocking a full version), you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality, such as license keys ... QR codes ..." — [App Review Guidelines 3.1.1](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.1(a): link-out entitlements exist only "in specific storefronts". "In all other storefronts, except for the United States storefront, where this prohibition does not apply, apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase." — [App Review Guidelines 3.1.1(a)](https://developer.apple.com/app-store/review/guidelines/)
- The StoreKit External Purchase (Link) Entitlement page that was fetched covers only dating apps on the Netherlands storefront. Vietnam is not mentioned. — [Apple: StoreKit External Purchase entitlement (NL)](https://developer.apple.com/support/storekit-external-entitlement/)
- US-only change: on 1 May 2025 Apple updated 3.1.1, 3.1.1(a), 3.1.3 and 3.1.3(a) "for compliance with a United States court decision regarding buttons, external links, and other calls to action". The change affects only the US storefront. — [Apple Developer News, 1 May 2025](https://developer.apple.com/news/?id=qs5bol0)

**3.1.2 Auto-renewable subscriptions**
- 3.1.2(a): "you must provide ongoing value to the customer, and the subscription period must last at least seven days and be available across all of the user's devices." Software as a service and "apps that offer consistent, substantive updates" are listed as appropriate. "Auto-renewable subscription apps may offer a free trial period to customers by providing the relevant information set forth in App Store Connect." Bait-and-switch or tricking users into subscribing leads to removal. — [App Review Guidelines 3.1.2(a)](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.2(b): users "should not be able to inadvertently subscribe to multiple variations of the same thing." — [3.1.2(b)](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.2(c): "Before asking a customer to subscribe, you should clearly describe what the user will get for the price ... Ensure you clearly communicate the requirements described in Schedule 2 of the Apple Developer Program License Agreement." — [3.1.2(c)](https://developer.apple.com/app-store/review/guidelines/)
- Sign-up screen must show:
  - the subscription name, duration and the content or services provided;
  - "Full renewal price, shown clearly and prominently, and localized";
  - a way to sign in or restore purchases;
  - links to the Terms of Use and Privacy Policy, both in the app and in the App Store metadata.
  — [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- On the same page:
  - "the amount that will be billed must be the most prominent pricing element"; a monthly equivalent of an annual price must be "subordinate";
  - free trials must "clearly indicate how long the free trial lasts and the price billed once the free trial is over";
  - developers should make it easy to reach the system cancellation UI.
  — [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Introductory offers come in three types: free trial, pay as you go, pay up front. There is one introductory offer per subscription per territory, and a customer can redeem one per subscription group. Promotional offers: up to 10 per subscription. — [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- 9 Jun 2025 change: 3.1.2(a) bullet 2 was deleted ("You may offer a single subscription that is shared across your own apps and services"), and bullet 5 moved to new 3.2.2(x). — [Apple Developer News, 9 Jun 2025](https://developer.apple.com/news/?id=qs5bol0)

**3.1.3 Other purchase methods, reader and multiplatform**
- 3.1.3: "Apps in this section cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront ... Developers can send communications outside of the app to their user base about purchasing methods other than in-app purchase." — [3.1.3](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.3(a) Reader apps covers only "magazines, newspapers, books, audio, music, and video". — [3.1.3(a)](https://developer.apple.com/app-store/review/guidelines/)
- 3.1.3(b) Multiplatform Services: "Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired in your app on other platforms or your web site ... provided those items are also available as in-app purchases within the app." — [3.1.3(b)](https://developer.apple.com/app-store/review/guidelines/)

**4.8 Login services**
- "Apps that use a third-party or social login service (such as ... Google Sign-In ...) to set up or authenticate the user's primary account with the app must also offer as an equivalent option another login service" that:
  - "limits data collection to the user's name and email address";
  - "allows users to keep their email address private";
  - "does not collect interactions with your app for advertising purposes without consent."
- This is not required if "Your app exclusively uses your company's own account setup and sign-in systems", among other exceptions (education/enterprise accounts, government eID, third-party-service clients). — [4.8](https://developer.apple.com/app-store/review/guidelines/)

**5.1.1(v) Account sign-in and deletion**
- "If your app supports account creation, you must also offer account deletion within the app." Also: "If your app doesn't include significant account-based features, let people use it without a login." — [5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/)
- Details from Apple's deletion guidance:
  - deletion must be easy to find, usually in account settings;
  - it must delete "the entire account record, along with associated personal data"; deactivation alone is insufficient;
  - a web page may finish the process if the app links "directly to the page";
  - non-regulated apps "should not require people to make a phone call, send an email, use a chat support flow";
  - Sign in with Apple apps must revoke tokens through the REST API;
  - if the user has an auto-renewable subscription, "notify them that billing will continue through Apple and ask them to cancel";
  - deletion may be scheduled at subscription expiry if an immediate option also exists;
  - it applies to users in every country, not just under CCPA or GDPR.
  — [Apple: Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

**4.2 Minimum functionality**
- "Your app should include features, content, and UI that elevate it beyond a repackaged website ... If your App doesn't provide some sort of lasting entertainment value or adequate utility, it may not be accepted." 4.2.2: apps shouldn't primarily be "web clippings, content aggregators, or a collection of links." — [4.2](https://developer.apple.com/app-store/review/guidelines/)

**Privacy: labels, manifest, AI disclosure**
- App Privacy details ("nutrition labels"): "This information is required to submit new apps and app updates to the App Store." It must include the data practices of third-party SDKs. Data collected only for app functionality must still be declared. — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- 5.1.1(i): a privacy policy link is required both in App Store Connect and inside the app. — [5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.2(i) (live text): "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." — [5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/)
- Privacy manifests: SDKs on Apple's list need a privacy manifest, and a signature when used as binary dependencies, for new apps or for updates that add them. **Flutter** and the Firebase SDKs are on the list. — [Apple: Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- Required-reason APIs: from 1 May 2024, App Store Connect rejects uploads that don't declare required-reason APIs in `PrivacyInfo.xcprivacy` (error ITMS-91053). This comes from a secondary source; Apple's own page was not fetched. — [Bitrise blog](https://bitrise.io/blog/post/enforcement-of-apple-privacy-manifest-starting-from-may-1-2024)

**Age ratings and kids**
- 2.3.6: "Answer the age rating questions in App Store Connect honestly." — [2.3.6](https://developer.apple.com/app-store/review/guidelines/)
- On 24 Jul 2025 Apple added 13+, 16+ and 18+ to the existing 4+ and 9+. Developers had to answer the new questions "by January 31, 2026, to avoid an interruption when submitting your app updates." — [Apple Developer News, 24 Jul 2025](https://developer.apple.com/news/?id=qs5bol0)
- **Vietnam-specific rating** (news of 21 May 2026): "Starting June 18, 2026 ... To align with Article 38 of Vietnam Decree 147, apps available on the App Store in Vietnam will require a region-specific age rating". The app gets one of "00+(all ages), 12+, 16+, or 18+" from the questionnaire. — [Apple Developer News, 21 May 2026](https://developer.apple.com/news/?id=qs5bol0)
- Vietnam games licensing (news of 4 Feb 2025): "The Vietnamese Ministry of Information and Communications (MIC) requires games to be licensed to remain available on the App Store in Vietnam." — [Apple Developer News, 4 Feb 2025](https://developer.apple.com/news/?id=qs5bol0)
- Kids Category (1.3):
  - no "links out of the app, purchasing opportunities, or other distractions to kids unless ... behind a parental gate";
  - generally no third-party analytics or advertising;
  - once in the category, an app must keep meeting its rules.
  — [1.3](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.4: an app that collects personal data from a minor needs a privacy policy and must comply with children's privacy laws. Under 2.3.8, "For Kids"/"For Children" in metadata is reserved for the Kids Category. — [5.1.4](https://developer.apple.com/app-store/review/guidelines/)

**Commission**
- Small Business Program: "a reduced commission rate of 15% on paid apps and Apple In-App Purchases". It covers new developers and those with ≤ 1M USD proceeds in the prior calendar year, counting all Associated Developer Accounts (>50% ownership or control). Above 1M in the current year, the standard rate applies to future sales. Enrolment requires the Account Holder, acceptance of the Paid Apps agreement and listing associated accounts. It takes effect 15 days after the end of the fiscal month of approval. — [Apple: Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- The further reduced 10% applies "For developers on the alternative terms in the EU in the App Store Small Business Program and for subscriptions after their first year". The page does not say whether this applies outside the EU alternative terms. — [Apple: Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- Standard subscription split: "During a subscriber's first year of service, you receive 70% ... After a subscriber accumulates one year of paid service, your net revenue increases to 85%". Free trials don't count toward the year. A lapse of more than 60 days resets the count. — [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)

**Vietnam tax (Apple, news of 21 Aug 2025 "Tax and Price Updates")**
- Individual developers based in Vietnam: "Personal income tax (PIT) introduction of 2%, replacing the corporate income tax (CIT). FCT of 5% introduced on Apple's commission." The 0% VAT rate for news, magazines and books no longer applies. — [Apple Developer News, 21 Aug 2025](https://developer.apple.com/news/?id=qs5bol0)
- Organizations based in Vietnam: "Apple will no longer remit foreign contractor tax (FCT) on sales to end customers. FCT of 5% introduced on Apple's commission." — [same](https://developer.apple.com/news/?id=qs5bol0)
- Developers outside Vietnam: VAT rises from 5% to 10% for organizations; individuals get 5% PIT. — [same](https://developer.apple.com/news/?id=qs5bol0)
- Exhibits B and C of the Paid Applications Agreement were updated. Prices on the Vietnam storefront were re-equalised unless Vietnam is the base storefront; auto-renewable subscriptions are excluded from automatic price changes. The date of that price update was 8 September (2025) according to a search summary only; UNVERIFIED. — [same](https://developer.apple.com/news/?id=qs5bol0)
- Background: in 2022 Apple attributed Vietnam price rises to new rules requiring Apple to collect and remit 5% VAT and 5% CIT. This comes from a search summary of press coverage; UNVERIFIED on an Apple page.

**Payouts**
- "payments are made to the bank account and the currency you provided within 45 days of the last day of the fiscal month in which the transaction was completed". A per-country minimum threshold applies. Payment goes by EFT or low-value transfer, and bank or intermediary fees may reduce it. — [App Store Connect Help: Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- The bank account currency is the payout currency, and a bank that can't be found in App Store Connect may not be payable. — [App Store Connect Help: Banking information](https://developer.apple.com/help/app-store-connect/reference/banking-information)
- Whether a Vietnamese bank account can receive VND or must use USD: UNVERIFIED.

### Inferences
- A vocabulary learning app is **not** a "reader" app (3.1.3(a) lists only magazines, newspapers, books, audio, music and video). So the External Link Account Entitlement does not apply, and in the **Vietnam storefront** the app cannot show a "subscribe cheaper on our website" button or link.
- What the iOS app can do under 3.1.3(b):
  - let a web-paying user log in and get Pro, provided Pro is also purchasable as IAP inside the iOS app;
  - market web pricing to users **outside** the app, for example by email.
- The Pro quota model fits 3.1.2(a): the guideline allows "consumable credits" inside a subscription. The subscription period must be ≥ 7 days, so a weekly, monthly or annual plan works and a daily pass does not.
- Login choice:
  - **email + password only** is exempt from 4.8 (own account system);
  - **adding Google Sign-In** requires an equivalent privacy login. Sign in with Apple is the obvious choice. The guideline names no product, so whether another option would satisfy it is a judgement call; plan for Sign in with Apple to avoid review friction;
  - if Sign in with Apple is added, account deletion must also revoke Apple tokens.
- Account type:
  - a Vietnamese **hộ kinh doanh** (household business) is generally not a separate legal entity, so it probably cannot enrol as an Apple "organization". This is an inference; Vietnamese law was not checked this session;
  - realistic options: enrol as an **individual**, with the owner's legal name shown as seller, or set up a company (e.g. a single-member LLC) and get a D-U-N-S number;
  - the account type also changes Apple's tax treatment in Vietnam (individual: 2% PIT withheld; organization: handles its own taxes on sales).
- AI questions: if user data (answers, words) goes to an external AI provider, 5.1.2(i) requires disclosure and explicit permission, and the privacy label must reflect it.
- Keep the app in the Education category, not Games, so the Vietnam MIC game licence does not apply. This is an inference; Apple decides the classification.
- The new Vietnam age-rating band (00+/12+/16+/18+) is derived from the global questionnaire. A vocabulary app should rate 00+ or 12+ unless it has user-generated or AI content that is not filtered.

### Gaps
- The current "last updated" date of the App Review Guidelines page was not shown in the fetched text. The live text includes the US link-out changes (1 May 2025), the 9 Jun 2025 changes and the "third-party AI" wording in 5.1.2(i). Whether a later 2026 revision exists: UNVERIFIED.
- Exact Schedule 2 (DPLA) disclosure wording: not fetched.
- Whether Apple still collects and remits Vietnamese VAT on IAP sales by Vietnam-based individual developers: the Aug 2025 note lists only PIT 2% and FCT 5% for them. UNVERIFIED.
- The local VND price of the Developer Program, and Apple's VND payouts to Vietnamese banks: UNVERIFIED.
- Apple's own page on the required-reason API rule (only a secondary source was used).

## Q2. Google Play: registration, testing gate, billing, fees, policies, Vietnam tax and payouts

### Takeaway
Registration costs 25 USD once. A new **personal** account cannot publish to production until it has run a closed test with **12 testers opted in for 14 consecutive days**. Play Billing is mandatory for Pro on Android; Vietnam is in **no** user-choice or alternative-billing program, so anti-steering applies. The fee is **15% for auto-renewing subscriptions**; the new 2026 regional fee structure covers the US, EEA, UK, Australia and Japan, not Vietnam. From 31 Aug 2026 new apps and updates must target **API 36**. For a Vietnam-based individual or household business, Google charges and remits **5% VAT** and needs the owner's 12-digit personal ID number. Payouts go to Vietnam in USD or EUR.

### Cited Findings

**Account and registration**
- "There is a US$25 one-time registration fee." Prepaid cards are not accepted. Google may ask for a government ID and a credit card in the owner's legal name. — [Play Console Help: Get started](https://support.google.com/googleplay/android-developer/answer/6112435)
- New personal accounts must also "verify access to an Android device through the Play Console mobile app" (from early 2024). — [same](https://support.google.com/googleplay/android-developer/answer/6112435)
- D-U-N-S requirement for organization accounts: not mentioned on the fetched page. UNVERIFIED this session.
- Vietnam merchant support: the table row reads "Vietnam ✔ ✔ VND[1]" (developer registration ✔, merchant registration ✔). Footnote [1]: "Developers in these countries will be paid in USD or EUR, depending on their location." — [Play Console Help: Supported locations](https://support.google.com/googleplay/android-developer/answer/9306917)

**Testing gate for new personal accounts**
- It applies to personal accounts created after 13 Nov 2023. Developers "must run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days".
- Opt-outs reset the count, and the 14 days must be consecutive.
- Production and pre-registration stay locked until the test is passed.
- The developer then uses "Apply for production", which asks for a summary of tester feedback and, if the app needs login, working login credentials.
- Review usually takes 7 days or less.
— [Play Console Help: App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)

**Payments policy**
- Play Billing is required for in-app features or services, including "app functionality or content (such as an ad-free version of an app or new features not available in the free version)" and "cloud software and services". — [Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- Anti-steering: outside Sections 3, 8 and 9, "apps may not lead users to a payment method other than Google Play's billing system", whether through listings, in-app promotions, webviews, buttons or ads. Alternative billing (Section 8) and external links (Section 9) are available only "in eligible countries/regions" with program enrolment. — [Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- Eligible regions:
  - user choice billing pilot: Australia, Brazil, Indonesia, Japan, South Africa, UK, EEA;
  - user choice billing in South Korea and India;
  - US user choice or alternative billing, depending on the program;
  - EEA-only alternative billing.
  **Vietnam is not listed.** User choice billing cuts the fee by 4%. — [Play Console Help: User choice billing](https://support.google.com/googleplay/android-developer/answer/13821247)

**Service fees**
- "15% for automatically renewing subscription products purchased by subscribers".
- For other products, the 15% tier is "15% for the first $1M (USD) revenue earned by the developer each year" and "30% for earnings in excess of $1M".
- "remaining markets" keep this structure "until the announced updated service fees are rolled out globally".
- A new regional structure takes effect in the EEA, UK and US on 30 Jun 2026 and in Australia and Japan on 30 Sep 2026; for example, subscriptions there pay 10% plus a 5% billing fee.
- The page's table was garbled in extraction, so treat the regional cell values with caution.
— [Play Console Help: Service fees](https://support.google.com/googleplay/android-developer/answer/112622)

**Subscriptions policy**
- Developers must disclose offer terms, cost, billing frequency, auto-renewal, and whether a subscription is required. "Users should not have to perform any additional action to review the information."
- Free trials: "let your users know how and when a free trial will convert to a paid subscription".
- The app must "include in your app access to an easy-to-use, online method to cancel the subscription". It can link to the Play Subscription Center.
- Prohibited:
  - annual plans that prominently show a monthly price;
  - SKUs named "Free Trial" that recur;
  - multi-screen flows that lead to accidental subscriptions;
  - subscriptions for one-time benefits;
  - reducing value after purchase;
  - removing access while the user is still entitled.
— [Play Console Help: Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)

**Data safety, account deletion, Families**
- Data safety: "All developers that have an app published on Google Play must complete the Data safety form", including "apps that do not collect any user data". A privacy policy is required, and inaccurate declarations can lead to blocking. — [Play Console Help: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- Account deletion:
  - apps with account creation must "provide users with an in-app path to delete their app accounts and associated data" **and** "a web link resource where users can request app account deletion" without reinstalling;
  - associated data must be deleted, and any retention must be disclosed;
  - the deletion URL goes into the Data safety form;
  - the deadline was 7 Dec 2023, extendable to 31 May 2024; after that, apps that don't comply may be removed.
  — [Play Console Help: Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- Families policy:
  - applies "If one of the target audiences for your app is children";
  - child-directed ads must come only from Families self-certified ad SDKs;
  - child-only apps must not transmit the AAID or precise location;
  - mixed-audience apps "must include a neutral age screen";
  - misrepresenting the target audience can lead to removal.
  — [Play Console Help: Families policy](https://support.google.com/googleplay/android-developer/answer/9893335)

**Target API level**
- "Starting August 31 2026: New apps and app updates must target Android 16 (API level 36) or higher".
- "Existing apps must target Android 15 (API level 35) or higher to remain available to new users".
- An extension can be requested "to November 1, 2026".
— [Android Developers: Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)

**Vietnam tax (Google Play)**
- A developer "located in Vietnam and considered a business household or individual under applicable Vietnamese regulations": "Google or its payment processor partners will charge and remit a 5% VAT" on purchases by customers in Vietnam.
- The developer must submit a 12-digit Vietnamese personal identification number under Payments profile → Manage settings → "Vietnam tax info", so Google can report to the tax department.
- Vietnam-based developers that are not business households or individuals (i.e. companies) handle VAT on their own sales.
- Google also charges 5% VAT on the invoiced service fee where applicable.
- Developers outside Vietnam: Google remits 10% VAT.
— [Play Console Help: Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000)

### Inferences
- Getting an Android release out takes extra time if the owner registers a **personal** account: the 14-day, 12-tester closed test plus up to 7 days of review add about 3 weeks.
- An organization account appears exempt, since the rule names only personal accounts. It probably needs a D-U-N-S number (UNVERIFIED).
- In Vietnam the Android app must use Play Billing for Pro. It may not mention the web price or link to the web checkout.
- Whether Google allows a user who paid on the web to use Pro inside the Android app without also buying through Play Billing was not verified this session (see Gaps).
- The 15% subscription fee applies from the first month regardless of revenue. Apple reaches 15% only through the Small Business Program, or after year 1 of each subscriber.
- Being an individual or household business in Vietnam is administratively simpler on Play: Google remits the 5% VAT and reports the owner's personal ID number. A company must handle VAT itself.
- An English-learning app for Vietnamese learners will likely attract teenagers. Two options:
  - declare an audience of 13+ (or 16+/18+) and avoid child-directed design; or
  - if under-13 users are targeted, Families policy applies, which in practice means no ad SDKs, no AAID and a neutral age screen.
- Account deletion must work both in the app and on a public web page; both stores require it.

### Gaps
- Whether Google Play's Payments policy lets an Android app unlock content bought on the web, if the app neither steers to it nor sells it there, was not confirmed from the policy text this session. UNVERIFIED.
- Whether Google also withholds Vietnamese PIT for individuals is not mentioned on the tax page. UNVERIFIED.
- D-U-N-S and other document requirements for organization accounts. UNVERIFIED.
- The exact Vietnam fee under any future "global rollout" of the new 2026 fee structure: no date announced on the page.

## Q3. Web payments in Vietnam: which gateways a solo developer or small company can onboard for subscriptions

### Takeaway
**Stripe is not available to Vietnamese businesses.** Merchant-of-record (MoR) platforms can serve a Vietnamese seller for international-style card subscriptions: **Paddle**, where Vietnam is not on the unsupported list, and **Lemon Squeezy**, where Vietnam is on the bank-payout list. Both charge 5% + 50¢. Lemon Squeezy's 2026 move toward Stripe Managed Payments is a risk, because Stripe does not support Vietnam. For VND domestic payments:
- **VNPAY** (card token), **MoMo** (subscription token) and **ZaloPay** (Agreement Pay / auto-debit) have tokenized recurring APIs, but all need merchant onboarding; MoMo explicitly needs a business account;
- **payOS** onboards an individual with just a citizen ID (CCCD) and is free up to 1,000 transactions a year, but it is VietQR bank transfer with no documented auto-renewal. In practice that means selling prepaid periods ("Pro 1/3/12 months") rather than true subscriptions.

### Cited Findings
- **Stripe:** the availability list's Asia-Pacific entries are Australia, Hong Kong, India (preview), Indonesia (preview), Japan, Malaysia, New Zealand, Singapore and Thailand. **Vietnam is not listed.** — [Stripe: Global availability](https://stripe.com/global)
- **Paddle:**
  - "Paddle works with software businesses anywhere in the world with the exception of the unsupported countries listed below". Vietnam is **not** on the unsupported list (Afghanistan, Belarus, Myanmar, Cuba, Iran, North Korea, Russia, Syria and others). — [Paddle Help: Supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)
  - Pricing is "5% + 50¢" per checkout transaction with "No monthly fees", acting as Merchant of Record (tax collection and filing, subscriptions, chargebacks, fraud). Products under $10 can get bespoke pricing. — [Paddle: Pricing](https://www.paddle.com/pricing)
- **Lemon Squeezy:**
  - Vietnam is on the list of countries with supported bank payouts. PayPal payouts cover "200+ countries". — [Lemon Squeezy Docs: Supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
  - Pricing is "5% + 50¢" per transaction, plus possible small fees outside the US. It is the merchant of record, with payouts twice a month by bank wire or PayPal.
  - The page carries a banner, "2026 Update: Lemon Squeezy + Stripe Managed Payments", and a footer reading "Sold through Link, LLC f/k/a Lemon Squeezy LLC". — [Lemon Squeezy: Pricing](https://www.lemonsqueezy.com/pricing)
  - The blog post behind the banner was not read. Secondary sources say Stripe Managed Payments is the successor MoR product and Lemon Squeezy still runs standalone as of April 2026; these come from competitor blogs and are UNVERIFIED. — [Dodo Payments blog](https://dodopayments.com/blogs/lemonsqueezy-alternatives), [Fungies blog](https://fungies.io/lemon-squeezy-stripe-acquisition-saas-founders-2026/)
- **payOS (Casso):**
  - "payOS là cổng thanh toán sử dụng chính tài khoản ngân hàng của người dùng để xác nhận thanh toán" (payments confirmed through the user's own bank account).
  - Registration needs only a citizen ID ("Đăng ký đơn giản với 1 chiếc CCCD"), and the business-licence requirement is removed for individuals and freelancers.
  - Payments are VietQR bank transfers.
  - Pricing: "Cổng thanh toán miễn phí" (free gateway); the BIDV-1K plan is "Miễn phí", "1.000 giao dịch / năm", valid until 31/12/2026.
  - Recurring, subscription or token charges are not mentioned. — [payOS](https://payos.vn/)
- **VNPAY:**
  - The API documentation lists "Thanh toán bằng mã token" (token payment) beside Pay, installments and query/refund. — [VNPAY sandbox docs: Pay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
  - Token flow: `token_create` or `pay_and_create`, which saves the token by default after a successful payment with bank OTP; then `token_pay` with `vnp_token`; and `token_remove`. Domestic and international cards are both covered (`vnp_card_type` 01 or 02). The merchant must hold a VNPAY-issued `vnp_tmn_code`.
  - Whether `token_pay` can run without the customer present or without OTP (a merchant-initiated recurring charge) is not stated. — [VNPAY sandbox docs: Token](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-token/token.html)
- **MoMo:**
  - "Automated Payments" (tokenization) has two types: Account Binding (one-click) and **Subscription**, where "your system saves the tokens and triggers the valid recurring payments"; charges can be initiated by the merchant server. The funding source documented is the MoMo e-wallet.
  - The merchant must complete a "Tokenization Evaluation Form" before integrating. Customers manage subscriptions and get reminders in the MoMo app. — [MoMo Developers: AIO tokenization](https://developers.momo.vn/v3/docs/payment/guides/aio-tokenization-payment/)
  - Integration requires registering a MoMo **business** account to get a partner code. This comes from a search summary of the developer portal. — [MoMo Developers](https://developers.momo.vn)
  - MoMo also documents tokenized ATM and credit-card payments. — [MoMo: Pay with token (credit)](https://developers.momo.vn/v3/docs/payment/api/credit/pay-with-token/)
- **ZaloPay:** Agreement Pay ("Auto-debit") lets merchants "debit money from user balances or accounts automatically after a user signs up for an agreement". It covers binding a ZaloPay wallet, ATM or credit card, Pay By Token, unbinding, refunds and notifications. This comes from a search summary of the official docs. — [ZaloPay Docs: Agreement pay](https://docs.zalopay.vn/docs/specs/agreement-pay), [ZaloPay AgreementPay PDF](https://docs.zalopay.vn/downloads/api/ZaloPay-APIs-AgreementPay-Integration-Document.pdf)
- **2C2P:**
  - The Recurring Payment Plan (RPP) has 2C2P "automatically trigger new payment requests ... based on the schedule" after a first card payment. Card tokenization is available.
  - In Vietnam, the licensed intermediary is reportedly M-Pay, "the licensed provider for payment solutions from 2C2P by Antom" (Shopify app listing; secondary).
  — [2C2P: Recurring payment plan](https://developer.2c2p.com/docs/direct-api-rpp-recurring-payment-plan), [M-Pay Vietnam on Shopify](https://apps.shopify.com/mpay-vn)

### Inferences
- Path 1, no company, fastest:
  - **payOS** to sell **prepaid passes** (e.g. 1, 3 or 12 months of Pro, paid by VietQR, no auto-renew);
  - Apple and Google IAP subscriptions on mobile;
  - prepaid passes avoid most card-network "subscription merchant" duties (Q4), since no stored credential is charged repeatedly;
  - the cost is manual renewals, so more churn.
- Path 2, true web auto-renewal in USD (international cards):
  - use an MoR (**Paddle** or **Lemon Squeezy**);
  - the MoR is the legal seller, handles tax and card-network subscription compliance, and pays out to a Vietnamese bank;
  - Paddle's acceptance of individuals or sole traders and of an ed-tech app is not confirmed (UNVERIFIED; their Acceptable Use Policy was not read);
  - Vietnamese learners mostly pay with domestic e-wallets or QR, so MoR card checkout may convert poorly in VN (UNVERIFIED; no data found).
- Path 3, true auto-renewal in VND:
  - **MoMo Subscription** tokens, **ZaloPay Agreement Pay** or **VNPAY token**;
  - all require merchant onboarding and contracts, and MoMo explicitly a business account;
  - plan for a registered business (household business or company) before choosing this path (UNVERIFIED which entity types each accepts).
- Whichever web gateway is used, the store rules from Q1 and Q2 still apply: the iOS and Android apps in Vietnam must not advertise or link to the web checkout.

### Gaps
- Published fee rates for VNPAY, MoMo, ZaloPay, OnePay and 2C2P in Vietnam: none found on official pages. UNVERIFIED; usually negotiated in the merchant contract.
- Exact onboarding documents (business registration certificate, household business registration, individual) for VNPAY, MoMo, ZaloPay and OnePay: not found on official pages. UNVERIFIED.
- **OnePay** tokenization or recurring support: not researched; no source.
- Whether VNPAY `token_pay` supports merchant-initiated charges without OTP: not stated in the docs.
- Lemon Squeezy's 2026 migration terms, and whether Stripe Managed Payments will accept sellers in countries Stripe doesn't support, such as Vietnam: UNVERIFIED and material for a Vietnamese seller.
- Paddle's policy on individual sellers and payout methods to Vietnam: UNVERIFIED.

## Q4. Card-network rules for subscriptions (Mastercard PDF in the repo, and Visa)

### Takeaway
If the owner charges cards on a recurring basis themselves (VNPAY token or another acquirer), both networks require:
- the full terms (price, frequency, trial length and post-trial price) shown **next to the card-entry field**, not behind a link;
- an affirmative tick or acceptance;
- a confirmation email with how to cancel;
- an easy online cancel path;
- a reminder before the trial converts. Visa wants it ≥ 7 days before; Mastercard requires it only for trials over 7 days;
- for plans billed every 6 months or less often (e.g. yearly), a renewal reminder 7–30 days before (Mastercard).

Through Apple, Google or an MoR, the store or MoR is the merchant. These duties are then largely theirs, but their own disclosure rules (Q1, Q2) still apply.

### Cited Findings

**Mastercard (from the owner's PDF `...–faqs.pdf`; Mastercard Rules 5.4.1 "Subscription Billing Merchants")**
- Timeline: announced September 2021, effective 22 September 2022.
- Scope: recurring payments for "a service, membership, physical products or Digital Goods"; the rules apply whether or not the merchant uses MCC 5968 (FAQ Q8), and the same rules apply to B2B and B2C (Q10).
- Rule 1: the merchant "must disclose the subscription terms simultaneously with a request for Card credentials", including price and billing frequency, e.g. "You will be billed USD 9.95 per month until you cancel".
  - Trials must also disclose "any initial charges, the length of the trial period, and the price and frequency of the subsequent subscription".
  - E-commerce merchants must "Clearly and prominently display the subscription terms on any payment and order summary webpages" and "Capture a Cardholder's affirmative acceptance".
  - "Providing a link to another webpage or requiring the Cardholder to expand a message box or scroll down the webpage to view the subscription terms does not satisfy this requirement."
- Rule 2: "Immediately after the Cardholder completes the subscription order", the merchant sends a confirmation by email or another electronic method, with the terms and "clear instructions on how to cancel".
- Rule 3: a receipt after each approved charge is recommended. It becomes mandatory for merchants flagged ≥ 4 months in the Acquirer Chargeback Monitoring Program (ECM, HECM or EFM). Cardholders may opt out.
  - A push notification in the app does not count as a receipt (Q18); an SMS does (Q19).
  - An invoice posted on a "My Account" page doesn't meet the recommendation (Q21).
  - Receipts may sit inside marketing email if they are clearly a receipt (Q25).
- Rule 4: the merchant "must provide an online or electronic cancellation method ... or clear instructions on how to cancel that are easily accessible online (such as a 'Manage Subscription' or 'Cancel Subscription' link on the merchant's home page)."
- Rule 5: for billing frequency "every six months (180 days) or less (i.e., billing occurs every six months, every year, every other year, etc.)", send a reminder "at least seven days but no more than 30 days prior to the next billing date". It must carry the terms and cancel instructions, with a subject line naming upcoming charges (e.g. "Important Information About Upcoming Charges to Your Account"), and be "distinct from marketing communications".
- Trials (FAQ Q14, Q27): the post-signup reminder before trial end is needed "only ... when the trial is longer than seven days"; "a trial of a digital product for 7 days or less" needs no reminder.
- Taxes may stay undefined, e.g. "$5.99 + tax" (Q28).
- Enforcement: acquirers police compliance, and Mastercard may levy Category A assessments on acquirers (Q12). Merchants must be able to prove that notices are sent (Q11).
- Source for all of the above: local file `E:\Working\Working project\english-learning\docs\subscription-recurring-payments-and-negative-option-billing-merchants–faqs.pdf` (no URL in the file). Mastercard's public rule location: [Mastercard Rules](https://www.mastercard.us/en-us/business/overview/support/rules.html) (not fetched this session).

**Visa (Visa flier "Trial Subscription Updates", 18 Apr 2020)**
- Scope: "From 18 April 2020, globally, merchants selling both physical and digital goods and services who offer free trials or discounted introductory offers as part of a subscription ... must comply". "Visa recommends all subscription ('recurring') merchants adopt these principles."
- Express consent: at enrolment, merchants must require the cardholder to "expressly consent to entering an ongoing subscription service for recurring payments."
- Enrolment copy, by email or SMS, "even if no amount was due". It must include:
  - agreement to the subscription;
  - start date;
  - details of the goods or services;
  - ongoing amount and billing frequency or date;
  - an online cancel link.
- Reminder: "at least seven (7) days before initiating a recurring transaction" if a trial, introductory or promotional period is about to expire, or if the terms change (price or billing period). It must include a link to the online cancellation policy.
- Receipts must show the trial length, a clear statement that the cardholder will be charged unless they cancel, the amount and date of the initial charge (even if zero) and of later charges, and an online cancel link.
- Cancellation: an easy online cancel, "regardless of how the cardholder initially interacted with the merchant".
- Descriptor: the first post-trial charge must carry a trial indicator (e.g. "trial", "free trial") in the Merchant Name field.
- Disputes: the "Misrepresentation" dispute right is expanded. Merchants win only if they prove express agreement and pre-charge electronic notice.
— [Visa: Trial Subscription Updates flier (PDF)](https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/visa-new-subscription-rules-flier.pdf)

### Inferences
- The PDF's Rule 5 text is internally inconsistent. "every six months (180 days) or less" is followed by examples (annual, biennial) that are *less* frequent than six months, so the intended scope is billing intervals of **≥ 6 months**. FAQ Q26 also says "3–7 days", which conflicts with the rule's 7–30 days.
- One schedule satisfies both networks:
  - a reminder exactly **7 days** before trial conversion (Visa ≥ 7 days; Mastercard trial 3–7 days per FAQ);
  - a reminder **7–30 days** before each annual or semi-annual renewal.
- For an English-learning app: keep the trial at **≤ 7 days** if the web side charges cards directly, to reduce Mastercard trial obligations. Visa still requires the 7-day-before reminder for any trial, so the reminder email is needed anyway.
- An in-app push does **not** count; email or SMS is needed. The account system already has email (OTP via SMTP), so these notices can reuse it.
- E-wallet (MoMo, ZaloPay) and VietQR (payOS) payments are not card transactions, so Visa and Mastercard rules don't directly bind them. The same practices still work as consumer-protection hygiene.

### Gaps
- Whether Visa updated these trial rules after 2020, e.g. a 2024–2026 Visa Core Rules revision: not checked; Visa Core Rules were not fetched.
- Mastercard's separate "negative option billing" (trial) rule text is referred to in the PDF but not contained in it.
- NAPAS (domestic card network) rules for recurring or tokenized charges: not researched.
- Vietnamese consumer-protection law on auto-renewal (e.g. the Law on Protection of Consumer Rights 2023): outside this note's scope; not researched here.

## Q5. Cross-platform entitlement (one account on web + iOS + Android) and RevenueCat costs

### Takeaway
The server must be the single source of truth. It stores one `entitlement` per user, fed from three places:
- Apple: App Store Server Notifications plus App Store Server API status calls;
- Google: Real-time developer notifications (RTDN) followed by `purchases.subscriptionsv2.get`, plus **acknowledge within 3 days** or the purchase is auto-refunded;
- the web gateway: webhook or IPN.

Apple requires a subscription to work "across all of the user's devices", and 3.1.3(b) lets web-bought Pro unlock iOS if Pro is also sold as IAP. Grace periods and holds must be modelled: Apple's grace period is 3, 16 or 28 days with billing retry for 60 days; Google's grace period is on by default and account hold lasts 60 days minus the grace period. **RevenueCat** is free up to 2,500 USD monthly tracked revenue (MTR), then 1% of MTR.

### Cited Findings
- Apple, subscriptions on all devices: "the subscription period must last at least seven days and be available across all of the user's devices"; "Subscriptions must work on all of the user's devices where the app is available." — [App Review Guidelines 3.1.2(a)](https://developer.apple.com/app-store/review/guidelines/)
- Apple, web purchases used in the app: allowed "provided those items are also available as in-app purchases within the app". — [3.1.3(b)](https://developer.apple.com/app-store/review/guidelines/)
- Apple, billing issues:
  - Billing Grace Period is configurable at "3, 16, or 28 days" and can apply to all renewals or only paid renewals; the user keeps access while Apple retries;
  - "When a subscription renewal fails, Apple attempts to recover it for 60 days";
  - detection is through the `DID_FAIL_TO_RENEW` App Store Server Notification, StoreKit renewal state, or the "Get All Subscription Statuses" endpoint;
  - since iOS 16.4 a system sheet prompts the user to update payment;
  - renewal extensions: twice per calendar year, each up to 90 days;
  - price increases: Apple notifies subscribers, and some increases need opt-in.
  — [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- Google, source of truth: "call the `purchases.subscriptionsv2.get` API with the purchase token included in the notification. This endpoint ... is considered the source of truth"; `purchases.subscriptions.get` is deprecated. Purchase tokens stay valid until 60 days after expiry. — [Android Developers: Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- Google, acknowledgement: "If you don't acknowledge a new subscription purchase within three days, the user automatically receives a refund, and Google Play revokes the purchase." Google recommends processing on the backend. — [same](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- Google, grace and hold:
  - grace period is on by default, and the user keeps access during it;
  - account hold is on by default, lasting "60 days minus any grace period duration"; the app should block access while on hold;
  - `SUBSCRIPTION_RECOVERED` restores access (the renewal date resets after a hold);
  - `SUBSCRIPTION_REVOKED` means "revoke the user's entitlement immediately";
  - on cancellation, access continues until the end of the billing cycle, and removing it earlier violates policy.
  — [same](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- RevenueCat pricing: "Pay nothing for up to $2,500 in monthly tracked revenue", "Then pay 1% of what you track". Enterprise is custom. Growth tools (Paywalls, web-to-app Funnels) are billed on conversions. — [RevenueCat: Pricing](https://www.revenuecat.com/pricing/)

### Inferences
Recommended model:

```
iOS IAP ──(App Store Server Notifications V2 + Server API)──┐
Android Play Billing ──(RTDN via Pub/Sub → subscriptionsv2.get, ack ≤3d)──┤→ backend `entitlement(user_id, source, state, expires_at)` → quota checks
Web (payOS / MoMo / VNPAY / Paddle) ──(webhook / IPN)──┘
```

- Grant Pro if *any* source is active or in grace. Never let one store's "expired" remove access granted by another source.
- The purchase must be linked to the logged-in account. Without that, a web purchase can't be honoured in the app (3.1.3(b)) and an IAP can't be honoured on the web.
- The "available across all devices" rule implies an iOS purchase must also unlock Pro on the web and Android. A server entitlement makes that automatic.
- Since Pro has **quotas** (e.g. AI questions per period), reset quotas on the period boundary of the active source. Decide what happens when a user holds two sources at once, e.g. IAP and web: block a second purchase in the UI to avoid double billing, in line with Apple 3.1.2(b) "should not ... inadvertently subscribe to multiple variations".
- Build own vs RevenueCat:
  - at pilot scale (MTR < 2,500 USD) RevenueCat costs 0, and it removes the work of receipt validation, the Apple/Google notification parsers and the Flutter purchase plumbing;
  - above that, 1% of MTR, i.e. about 25 USD a month at 2,500 USD MTR;
  - building in-house means implementing the App Store Server API, Google `subscriptionsv2` with Pub/Sub, and acknowledgement, which are well documented but error-prone (refunds, holds, revocations);
  - the existing NestJS backend already needs a web-gateway webhook either way;
  - whether RevenueCat can ingest payOS, MoMo or VNPAY web payments: UNVERIFIED (see Gaps). If not, those flow through the owner's own backend and are merged with RevenueCat data server-side.
- Apple and Google remain the merchant of record for in-app purchases, so they handle refunds and chargebacks there. The backend must still react to refund and revoke notifications, which Google documents as `SUBSCRIPTION_REVOKED`.

### Gaps
- Apple's App Store Server Notifications V2 types for refunds (e.g. `REFUND`) and the use of `appAccountToken` to link a purchase to the user's account: not fetched this session. UNVERIFIED, though both are standard Apple features.
- Whether RevenueCat's MTR counts web purchases from Stripe, Paddle or RevenueCat Web Billing, and whether it supports any Vietnamese gateway: the pricing page doesn't say. UNVERIFIED.
- RevenueCat's own Web Billing runs on Stripe, so it is likely unavailable to a Vietnam-based seller. This is an inference; RevenueCat Web Billing country support was not checked.
- Google Play's rule on honouring web-bought entitlements inside the Android app (see Q2 Gaps).
