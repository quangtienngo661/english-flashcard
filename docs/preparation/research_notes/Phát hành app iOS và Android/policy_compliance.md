# Store policy and legal compliance for an English-vocabulary app (Apple App Store, Google Play, Vietnam law), state as of 20/10/2026

Scope: the policy and legal requirements this app's features trigger on each store, what must be built or declared, and the
Vietnam-side legal items that affect publishing. Account enrollment, build/signing, and the Play closed-testing gate belong to the
sibling notes (`apple_app_store.md`, `google_play.md`, `build_pipeline.md`) and are not repeated here.

App context: Flutter client (not built), NestJS API exists; email+password with email OTP; Google login planned (Bước 8); account
deletion planned, not built (`users.status = 'deleting'` reserved); private words and learners' own context sentences; AI-generated
fill-in-the-blank practice (provider not chosen); auto-renewing Pro; ads planned (likely AdMob, no SDK chosen); email reminders
(push maybe later); Vietnamese learners; minimum age not decided; DB stores no terms consent or age (DB3). Solo developer in Vietnam.

Reading conventions:
- Every source below was opened this session (20/10/2026) unless marked **(search summary only)** = only the search engine's summary
  was seen, not the page. Treat those as leads, not facts.
- **(pre-2025, may be stale)** = the rule or date is older than 2025, even if a current page still shows it.
- Vietnamese legal points are **not legal advice**. Most legal text was read through secondary sources (EY Law Vietnam alert, a
  law-text mirror, Vision & Associates); the official gazette text was not opened (thuvienphapluat.vn returned HTTP 403).
- One law-text mirror (hethongphapluat.com) was flagged by the search tool as containing embedded instructions aimed at AI readers;
  those were ignored and only the statute text was used.

---

## 1. Login: Apple Guideline 4.8 (Login Services) and Google's rules, if Google login is offered

### Takeaway
On iOS, adding Google login makes Guideline 4.8 apply: the app must also offer another login service that limits data to name and
email, lets the user hide their email, and does not collect interactions for ads without consent. Sign in with Apple is the usual way
to meet it. An app that uses only its own email+password system is exempt. Google Play has no equivalent rule (none found).

### Cited Findings
- Current 4.8 text: apps that use "a third-party or social login service (such as ... Google Sign-In ...) to set up or authenticate
  the user's primary account with the app must also offer as an equivalent option another login service" that (a) "limits data
  collection to the user's name and email address", (b) "allows users to keep their email address private as part of setting up their
  account", and (c) "does not collect interactions with your app for advertising purposes without consent." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Exemptions in 4.8 include: "Your app exclusively uses your company's own account setup and sign-in systems"; and "an education,
  enterprise, or business app that requires the user to sign in with an existing education or enterprise account." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.1(v): "If your app doesn't include significant account-based features, let people use it without a login." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- If Sign in with Apple is offered: on account deletion, "Apps that support Sign in with Apple should use the Sign in with Apple REST
  API to revoke user tokens. Use server-to-server notification endpoints to process changes for Sign in with Apple accounts." — [Apple: Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Server-to-server notification endpoint is **mandatory only for developers based in the Republic of Korea** (from 1 Jan 2026); the
  notifications cover email-forwarding changes, account deletions in your app, and permanent Apple Account deletions. — [Apple news, 9 Oct 2025](https://developer.apple.com/news/?id=j9zukcr6)
- New Sign in with Apple private-relay addresses will be issued on `private.icloud.com` (previously `privaterelay.appleid.com`)
  "later this year"; developers "should ensure that their account systems, email validation logic, and allowlists accept addresses on
  the new private.icloud.com domain in addition to the existing" one. — [Apple news, 24 Aug 2026](https://developer.apple.com/news/?id=1ptvdtcm)
- Google OAuth ("Sign in with Google"): "If your app utilizes only non-sensitive scopes, it is not mandatory for your app to complete
  the app verification process"; a lighter "brand-verification" exists for showing app name and logo on the consent screen. — [Google Cloud Help: OAuth app verification](https://support.google.com/cloud/answer/13463073)
- Background (not re-researched): `LEGAL_PAGES_RESEARCH_2026-10-11.md` line 71 lists Google's homepage / same-domain privacy-policy /
  verified-domain requirements for the consent screen; `COMMERCIAL_MINIMUM_CHECKLIST_2026-10-19.md` H4 already says "Sign in with
  Apple if Google login". Both consistent with the above.

### Inferences
- The app's own email+password login does not satisfy 4.8 as the "equivalent option": it requires the user's real email, so it fails
  criterion (b). Once Google login ships on iOS, Sign in with Apple (or another service meeting all three criteria) is needed.
- Cheapest compliant options: (a) ship Google login on Android/web only and keep iOS on email+password (4.8 exemption applies);
  (b) ship Google + Sign in with Apple together on iOS. Option (b) adds backend work: Apple identity tokens, REST token revocation on
  deletion, and handling of relay emails for OTP and reminder emails.
- Sign in with Apple users already have an Apple-verified email; the email-OTP verification step may be redundant for them, but
  OTP and reminder emails sent to relay addresses must get through Apple's relay (see Gaps).
- The education exemption in 4.8 does not apply: it covers apps that require an existing school or enterprise account.

### Gaps
- Apple's "Communicating using the Private Email Relay Service" page (registering sender domains so emails reach relay users) was not
  opened this session; whether OTP/reminder email from our SMTP needs domain registration is **unverified**.
- When 4.8 changed from "must offer Sign in with Apple" to "an equivalent privacy-focused service" was not confirmed this session; only
  the current text was read.
- No Google Play policy requiring an alternative login was found; this is an absence of evidence, not a cited rule.

---

## 2. Account deletion: Apple 5.1.1(v) and Google Play's requirement

### Takeaway
Both stores require an in-app way to delete the account and its data (deactivation alone fails). Google also requires a public web
page where users can request deletion without reinstalling, declared in the Data safety form. Deletion may finish later if the user
is told how long it takes; legally required data may be kept if disclosed. Vietnam's Decree 356 sets a 20-day deadline (30 days when
third parties are involved).

### Cited Findings
- Apple 5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple: "Offer to delete the entire account record, along with associated personal data. You may include additional options, but
  only offering to temporarily deactivate or disable an account is insufficient." — [Apple: Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Apple: "If your process for account deletion is manual or otherwise takes a reasonable amount of time to complete, this is
  acceptable. Inform the person how long it will take to delete the account and provide a confirmation when the deletion is complete." — [Apple: Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Apple: identity confirmation is allowed, "such as by entering a code from an email or phone number already associated with the
  account", but "apps that make it unnecessarily difficult for someone to delete their account will not pass review"; apps outside
  highly regulated industries "should not require people to make a phone call, send an email, use a chat support flow". — [Apple: Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Apple, subscriptions: "If a person has an auto-renewable subscription, notify them that billing will continue through Apple and ask
  them to cancel their subscription before continuing"; deletion may be scheduled for the subscription's expiry "as long as there's
  also an option to delete the account immediately." — [Apple: Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Apple, retention: "If you're legally required to retain some user information, let people know what information will and won't be
  retained." A website link is allowed if it goes "directly to the page on your website where they can complete the process." — [Apple: Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Google Play: apps that allow account creation must "provide users with an in-app path to delete their app accounts and associated
  data" and a web link where users can request deletion; the web page must name the app or developer as on the store listing, make the
  deletion path "prominently featured and easily discoverable", and not send users back to the app or require reinstalling. — [Play Console Help: account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- Google Play: developers should "complete their requests within a reasonably quick period of time"; data may be retained for security,
  fraud prevention or regulatory compliance but developers must "clearly inform users about your data retention practices"; ask
  service providers that processed the data to delete it too. — [Play Console Help: account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- Google Play User Data policy: "Temporary account deactivation, disabling, or 'freezing' the app account does not qualify as account
  deletion." — [Play Console Help: User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Google Play dates (pre-2025, may be stale, but the rule is current): Data deletion questions due 7 Dec 2023, extension to
  31 May 2024; after that "Non-compliant apps may face additional enforcement actions". Apps must declare in the Data safety form that
  they offer deletion and give the web link. — [Play Console Help: account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- Vietnam, Decree 356/2025: deletion request — perform within 20 days, 30 days if coordination with processors/third parties is needed,
  one extension of up to 20 days; withdrawal of consent / restriction / objection — respond within 2 working days, perform within 15
  days (20 with third parties). — [EY Law Vietnam alert on Decree 356, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)

### Inferences
- What to build (both stores): a "Delete account" item in account settings → re-confirm identity (password or email OTP, both allowed)
  → if an active store subscription exists, show "billing continues through Apple/Google, cancel first" with a link to the store's
  subscription page → delete or queue deletion with a stated timeframe → confirmation email when done. The planned
  `users.status = 'deleting'` + background purge fits Apple's "takes a reasonable amount of time" rule if the UI states the duration.
- For Google, also publish a web page (e.g. on the landing domain) with the request path (form or email), what is deleted, what is
  retained and for how long; put its URL in the Data safety form.
- A purge SLA of ≤ 20 days satisfies Decree 356 and is "reasonably quick" for Google; backups need a stated retention window in the
  privacy policy (backup timing is still `ASSUMPTION` in `LEGAL_PAGES_RESEARCH_2026-10-11.md` line 43).
- Data that can be kept with disclosure: aggregated, non-identifying statistics (already in SR11); payment/transaction records kept for
  tax/accounting law (exact Vietnamese retention period not researched here).

### Gaps
- Exact Vietnamese accounting/tax retention period for transaction records was not researched.
- Whether Apple accepts a deletion flow that requires the user to first cancel the subscription in Settings (versus only being told)
  is not stated beyond "ask them to cancel ... before continuing".

---

## 3. Privacy disclosures: Apple App Privacy labels, privacy manifests, SDK signatures; Google Data safety; privacy-policy content

### Takeaway
Both stores need a public privacy policy (linked in store metadata and inside the app) and a data-collection questionnaire that must
include what SDKs collect. Apple additionally needs privacy manifests for listed SDKs (Flutter itself is listed). Since Nov 2025 Apple
explicitly requires disclosure and explicit permission before personal data goes to a third-party AI; Google applies its rules to
"third-party AI integrations" too.

### Cited Findings
- Apple 5.1.1(i): privacy policy link required "in the App Store Connect metadata field and within the app in an easily accessible
  manner"; it must identify what data is collected, how, and all uses; confirm third parties (analytics, ad networks, SDKs) give "the
  same or equal protection"; and "Explain its data retention/deletion policies and describe how a user can revoke consent and/or request
  deletion of the user's data." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 5.1.2(i) (clarified 13 Nov 2025): "You must clearly disclose where personal data will be shared with third parties, including
  with third-party AI, and obtain explicit permission before doing so." Apps may not require enabling push, location or tracking to
  access functionality. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); change log: [Apple news, 13 Nov 2025](https://developer.apple.com/news/?id=ey6d8onl)
- Apple App Privacy labels: "Collect" = transmitting data off the device and keeping it readable longer than needed to service the
  request in real time; "if you collect data solely for the purpose of app functionality, declare the data on your label"; you must
  include "the practices of third-party partners whose code you integrate". Relevant types: Email Address, User ID, "Other User Content"
  ("Mark 'Other User Content' to represent generic free form text fields"), Product Interaction, Advertising Data, Device ID, Purchase
  History, Crash Data. "Personal Information" under privacy laws is "considered linked to the user". Labels can be updated without an
  app update. — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- Apple privacy manifests and SDK signatures (introduced WWDC23, pre-2025, may be stale but still listed): "You must include the
  privacy manifest for any SDK listed below when you submit new apps ... or when you submit an app update that adds one of the listed
  SDKs"; "Any version of a listed SDK, as well as any SDKs that repackage those on the list, are included." Listed SDKs relevant to a
  Flutter app include **Flutter**, GoogleSignIn, FirebaseMessaging/FirebaseCore and other Firebase components, GoogleUtilities,
  GTMSessionFetcher, GTMAppAuth, shared_preferences_ios, path_provider, package_info_plus, url_launcher, connectivity_plus,
  device_info_plus, flutter_local_notifications, webview_flutter_wkwebview, sqflite, share_plus. Google-Mobile-Ads-SDK is not listed by
  name. — [Apple: Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- Google Play privacy policy: link in Play Console and in the app; "available on an active, publicly accessible and non-geofenced URL
  (no PDFs)", non-editable; must include developer information and a privacy contact, data types accessed/collected/used/shared and
  recipients, secure handling, retention and deletion policy; the entity on the store listing or the app must be named. — [Play Console Help: User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Google Play prominent disclosure: required when collection "may fall outside user expectations"; must be in-app, cannot only be in the
  privacy policy or terms, must immediately precede the consent prompt and need affirmative action. "These requirements also apply to
  third-party AI integrations." — [Play Console Help: User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Google Data safety: "Collect" = transmitting data off the device, including by SDKs; transfers to a **service provider** processing on
  your behalf are not "sharing" (building ad profiles across customers does not qualify); ephemeral in-memory processing must still be
  answered but is not shown; "Other user-generated content" covers "user bios, notes, or open-ended responses"; SDK collection must be
  reflected; "encryption in transit" may be declared only if it covers all user data the app and its SDKs send; the deletion-request
  answer applies if there is a way to request deletion or data is auto-deleted/anonymized within 90 days. — [Play Console Help: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- Google Data safety must be "complete and accurate ... The developer is responsible for the accuracy of the label and keeping this
  information up-to-date", consistent with the privacy policy. — [Play Console Help: User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Play Console App content declarations listed on the overview page: privacy policy, ads, sign-in details (app access), target audience
  and content, permissions declaration, content ratings, COVID-19 apps, news apps (data safety is managed in the same App content area). — [Play Console Help: App content](https://support.google.com/googleplay/android-developer/answer/9859455)

### Inferences
- Likely label entries for this app (both stores): email, user ID, other user content (private words and context sentences), product
  interaction / app interactions (study activity), purchase history (Pro), crash/diagnostics if a crash SDK is added; plus advertising
  data and device ID once AdMob is integrated. All "linked to the user" except anything de-identified before collection.
- AI provider: on Google, an AI API used strictly as a processor under our instructions (no training on our data) can be treated as a
  service provider, so not "shared" — but this depends on the provider's terms. On Apple, 5.1.2(i) requires explicit permission before
  sending personal data to a third-party AI regardless of label category. Learners' context sentences may contain personal data, so the
  Bước 7 feature that builds questions from them needs an explicit opt-in screen; generating questions only from catalog words (no
  personal data in the prompt) avoids the trigger.
- Flutter iOS build: check that each plugin version in `pubspec.lock` ships a `PrivacyInfo.xcprivacy`, and review Xcode's privacy
  report before upload; the app's own code also needs a manifest if it calls required-reason APIs (e.g. UserDefaults via
  shared_preferences — inference, see Gaps).
- Privacy policy and Data safety/App Privacy answers must match each other and the code; a mismatch is a rejection reason on Google.

### Gaps
- Apple's required-reason API documentation and the exact enforcement date were not opened this session (the SDK page links to it but
  does not cover it).
- Whether the Google Mobile Ads iOS SDK ships its own privacy manifest was not verified.
- Whether a privacy policy must be in Vietnamese by law was not verified this session (background `COMMERCIAL_MINIMUM_CHECKLIST` B3 says
  Vietnamese, citing Law 91/2025 and Decree 356; not re-checked).

---

## 4. AI-generated content and user-generated content (Google AI-Generated Content policy, Apple 1.2; private words/sentences)

### Takeaway
Google's AI policy requires an in-app "report/flag offensive AI content" feature for "apps that generate content using AI"; its listed
examples are chatbots and image generators, and its explainer says productivity apps that use AI to improve an existing feature are out
of scope for now — a fill-in-the-blank generator is at the edge, so building the report button is the safe choice (it is already in
the design, K16). Private words that no other user can see are not UGC under Google's definition; Apple's 1.2 wording is broader and
names "AI content creation apps".

### Cited Findings
- Google AI-Generated Content policy: "AI-generated content is content that is created by generative AI models based on user prompts";
  in-scope examples: text-to-text chatbots "in which interacting with the chatbot is a central feature of the app", and AI image/video.
  "Apps that generate content using AI must contain in-app user reporting or flagging features that allow users to report or flag
  offensive content to developers without needing to exit the app." "Developers should utilize user reports to inform content filtering
  and moderation." No effective date shown. — [Play Policy: AI-Generated Content](https://support.google.com/googleplay/android-developer/answer/13985936)
- Google explainer, out of scope "for now": apps that only host AI content; summarization apps where summarization is the only feature;
  "Productivity apps that use AI to improve an existing feature" (email drafting example). Educational apps are not mentioned. — [Play Console Help: Understanding the AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/14094294)
- Google prohibits generative-AI output that facilitates child exploitation, deception, harmful behaviour, bullying, etc., and
  requires "prohibiting and preventing the generation of Restricted Content". — [Play Policy: AI-Generated Content](https://support.google.com/googleplay/android-developer/answer/13985936); [explainer](https://support.google.com/googleplay/android-developer/answer/14094294)
- Google UGC definition: "content that users contribute to an app" and "which is visible to or accessible by at least a subset of the
  app's users"; UGC apps need terms acceptance before posting, in-app reporting and blocking. — [Play Policy: User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937)
- Apple 1.2 (revised 16 Oct 2026): "Apps that enable users to create, generate, upload, share, or otherwise contribute content ... This
  includes social media, user-generated content platforms, and AI content creation apps" must have filtering, a report mechanism with
  timely responses, user blocking, and published contact information; developers who fail to implement safeguards "may be considered in
  violation of the Developer Code of Conduct". — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); change log: [Apple news, 16 Oct 2026](https://developer.apple.com/news/?id=92th7e5i)
- Apple 1.2.1(a) (new Nov 2025) applies to "creator" apps (age-restriction mechanism for content above the app's rating). — [Apple news, 13 Nov 2025](https://developer.apple.com/news/?id=ey6d8onl)
- Vietnam AI Law 134/2025/QH15 takes effect 1 March 2026; deployers must notify the public when AI-created or edited text, audio, images
  or video could confuse people about the authenticity of events or persons; many details depend on implementing decrees. — [Rajah & Tann Asia (search summary only)](https://www.rajahtannasia.com/viewpoints/new-law-on-artificial-intelligence-takes-effect-on-1-march-2026/)

### Inferences
- Google: the app's AI feature is not a chatbot and the learner does not write free prompts, so it is arguably outside the listed scope;
  but "apps that generate content using AI" is literal, and the cost of compliance is a "Report this question" button that works without
  leaving the app — which the design already has for non-AI questions. Recommended: ship it for AI questions from day one, route reports
  into the moderation queue, and use them to tune filtering.
- Apple: the 1.2 list (filter, report, block, contact) is aimed at content posted for others; for a single-user generator the
  practical set is: rule-based checks/filters on AI output (already designed), a report button, and a visible support contact. "Block
  abusive users" has no meaning without user-to-user interaction.
- Private words and context sentences: not UGC for Google (not visible to other users). For Apple, the risk is low as long as nothing
  a learner writes is shown to another learner. Any future feature that publishes learner content (shared word groups, staff promoting a
  learner's word into the catalog with the learner's text) would turn it into UGC on both stores, and possibly a social network under
  Vietnam's Decree 147 (section 9).
- Vietnam AI Law: fill-in-the-blank practice is unlikely to "confuse people about the authenticity of events or persons", but an
  "AI-generated" label on AI questions is cheap and also serves the store policies (background G4 already plans it).

### Gaps
- No official Google or Apple statement on whether a non-chat, education text generator is in scope was found.
- The Vietnam AI Law implementing decrees (labelling technique, scope for text) were not researched.

---

## 5. Ads: AdMob, Apple ATT and SKAdNetwork/AdAttributionKit, consent (UMP; Vietnam), Play Ads declaration and disruptive-ad rules, ads and children

### Takeaway
Most ad details are already in `ADS_INTEGRATION_RESEARCH_2026-10-19.md` (not re-researched). Confirmed this session: Apple requires the
ATT prompt before tracking or reading the IDFA and forbids gating features on it; Google Play requires an accurate "contains ads"
declaration, bans unexpected full-screen interstitials and non-closable ones after 15 s, and ads must fit the content rating. UMP has no
Vietnam message type; Vietnam's PDPL itself requires consent and a refusal option for behavioural/targeted ads.

### Cited Findings
- Apple tracking definition: "linking user or device data collected from your app with user or device data collected from other
  companies' apps, websites, or offline properties for targeted advertising or advertising measurement purposes", or sharing with data
  brokers. ATT is required to track or access the IDFA, including when "Placing a third-party SDK in your app that combines user data
  from your app with user data from other developers' apps ... even if you don't use the SDK for these purposes." Without permission
  the IDFA is all zeros. — [Apple: User privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- Apple: a pre-prompt explanation is allowed "so long as you are transparent"; gating functionality or incentivising tracking consent:
  "No, per the App Review Guidelines: 5.1.2(i)". The page now points to AdAttributionKit for privacy-preserving attribution (SKAdNetwork
  is not mentioned on that page). — [Apple: User privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- Apple news list shows "Updates to App Tracking Transparency in the European Union" (16 Sep 2026) — only relevant if distributed in
  the EU; not opened. — [Apple Developer News](https://developer.apple.com/news/)
- Google Play Ads policy: unexpected full-screen interstitials are not allowed, including at the start of a content segment; video
  interstitials before the splash screen are not allowed; interstitials not closable after 15 s are not allowed (opt-in/rewarded
  excepted); "We don't allow apps that display interstitial ads repeatedly to distract users"; ads "must be appropriate for the content
  rating of your app"; Advertising ID only for ads and analytics, opt-out must be honoured, linking to personal information needs explicit
  consent, privacy notice must disclose it. — [Play Policy: Ads](https://support.google.com/googleplay/android-developer/answer/9857753)
- Play Console Ads declaration: "You must declare whether or not your app contains ads", including "ads delivered through third-party ad
  SDKs"; house ads promoting your other apps count; misrepresenting ads is a policy violation; apps with ads get a "Contains ads" label. — [Play Console Help: App content](https://support.google.com/googleplay/android-developer/answer/9859455)
- AdMob Privacy & messaging message types are tied to GDPR and US state laws; outside EEA/UK/Switzerland, applicable US states and
  Brazil, non-personalised requests are "sent to all bidders, subject to other protections"; no Vietnam-specific message type found. — [AdMob Help (search summary only)](https://support.google.com/admob/answer/10107561)
- Vietnam Law 91/2025: Art. 28(3) processing customer data for advertising requires consent and customers must be able to refuse ad
  content; Art. 28(8)(a) collecting data via website/app tracking for behavioural or targeted ads requires consent; Art. 28(8)(b) allow
  refusal of data sharing and set retention; Art. 29(4) platforms must offer a "không theo dõi" (do-not-track) option or track only with
  consent. — [Law 91/2025/QH15 text (hrspring.vn mirror)](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- Decree 356/2025 moves "dữ liệu theo dõi hành vi, hoạt động sử dụng dịch vụ ... và các dịch vụ khác trên không gian mạng" (behavioural
  tracking data on online services) into **sensitive** personal data. — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- Children: Apple Kids Category apps "should not include third-party analytics or third-party advertising" (narrow exceptions);
  Google: apps whose audience includes under-13s must use Families Self-Certified Ads SDKs for ads to children/unknown-age users, and
  mixed-audience apps need a neutral age screen. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [Play Console Help: Target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159)

### Inferences
- Simplest compliant path for Vietnam launch: serve **non-personalised ads only** (no ATT prompt needed on iOS if the IDFA is never
  requested and the SDK does not track — confirm AdMob's NPA mode behaviour on iOS), declare "contains ads" on Play, label "Advertising
  Data"/"Device ID" honestly. Personalised ads would need: ATT on iOS, an own Vietnam consent screen (UMP does not cover VN) with a
  refusal option and stored proof, and possibly loss of the Decree 356 DPIA exemption because behavioural tracking data is now sensitive
  (section 9).
- No interstitial at app launch or at the start of a study session; place interstitials only at natural breaks (end of a review
  round), and keep "Report ad" / ad attribution clear. Never in notifications (Apple, per background ADS file line 83).

### Gaps
- Whether AdMob NPA requests on iOS still read the IDFV or other identifiers that Apple would count as tracking was not verified.
- AdMob's Families/child-directed settings and SDK minimum versions are in the background ADS file, not re-verified.

---

## 6. Age rating and minors: Apple tiers and Declared Age Range; Google IARC / Target audience / Families; US state laws; Vietnam children's data

### Takeaway
Apple's questionnaire now produces 4+/9+/13+/16+/18+ and, since 18 Jun 2026, a separate Vietnam rating (00+/12+/16+/18+) under Decree
147 Art. 38; a vocabulary app with ads and private UGC lands at the lowest tier (4+ / Vietnam 00+). Google needs the IARC content rating
and a Target audience declaration; choosing any under-13 age group pulls in the Families policy. The US state laws (Texas in force;
Utah, Louisiana, California 2027) act through the App Store / Play account country, so they matter only if the app is offered in the US.
In Vietnam a child is under 16 and a legal representative exercises the child's data rights.

### Cited Findings
- Apple age ratings: 4+, 9+, 13+, 16+, 18+, Unrated (cannot be published); new questionnaire groups: In-App Controls (Parental Controls,
  Age Assurance — "may include: declared age range API ..."), Capabilities (Unrestricted Web Access, User-Generated Content, Social
  Media, Messaging and Chat, Advertising), Chance-Based Activities. UGC, messaging and advertising appear among the items compatible with
  4+. No AI/chatbot question was seen. — [App Store Connect Help: Age ratings](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- Vietnam storefront: "As required by Article 38 of Vietnam Decree 147, apps that have at least one of the following content descriptors
  will display the region-specific age rating": 00+ (includes parental controls, age assurance, UGC, messaging and chat, advertising,
  infrequent contests), 12+, 16+ (unrestricted web access, social media, ...), 18+. — [App Store Connect Help: Age ratings](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/); announced for 18 Jun 2026: [Apple news, 21 May 2026](https://developer.apple.com/news/?id=yrrb45pw)
- Decree 147/2024 Art. 38 itself classifies **online games** by age (enterprises self-classify and display it); effective 25 Dec 2024
  (pre-2025, may be stale). — [LuatVietnam (search summary only)](https://luatvietnam.vn/tin-van-ban-moi/tro-choi-dien-tu-tren-mang-duoc-phan-loai-theo-4-do-tuoi-tu-25-12-2024-186-99866-article.html)
- Apple's new questionnaire had to be completed by 31 Jan 2026, otherwise updates are blocked; developers can set a higher rating than
  assigned. — [9to5Mac, 24 Jul 2025 (search summary only)](https://9to5mac.com/2025/07/24/apple-notifies-developers-of-new-app-store-age-rating-system/). Social-media questions were added 9 Jul 2026, required from Sep 2026. — [Apple Developer News list](https://developer.apple.com/news/)
- Texas SB2420: for new Apple Accounts in Texas, age assurance and parental consent for minors; developers use the Declared Age Range
  API (categories under 13, 13–15, 16–17, 18+), the Significant Change API (PermissionKit), a StoreKit age-rating property and App
  Store Server Notifications. — [Apple news, 4 Nov 2025](https://developer.apple.com/news/?id=2ezb6jhj). Enforcement was suspended Dec 2025, then new Texas accounts became subject from 4 Jun 2026. — [Apple Developer News list (items 8jzbigf4, sg176nne)](https://developer.apple.com/news/)
- Apple, Feb 2026: from 24 Feb 2026 users in Australia, Brazil and Singapore cannot download 18+ apps unless confirmed adults; Utah
  (new accounts from 6 May 2026) and Louisiana (from 1 Jul 2026) age categories shared via the Declared Age Range API; "developers may
  have separate obligations to independently confirm that their users are adults." — [Apple news, 24 Feb 2026](https://developer.apple.com/news/?id=f5zj08ey)
- Utah: one source says HB 498 (18 Mar 2026) delayed developer obligations to 6 May 2027 — **conflicts** with Apple's 6 May 2026 date
  (Apple's date is for its own API rollout). — [ASO World (search summary only)](https://marketingtrending.asoworld.com/en/news/utah-app-store-age-verification-the-may-6-deadline-just-changed-what-developers-need-to-know-right-now/)
- Google Play Age Signals API (beta): returns signals for Brazil users since 17 Mar 2026 and for eligible Texas users with accounts
  created after 28 May 2026; data may be used only "to provide age-appropriate content and experiences in compliance with laws", not for
  "advertising, marketing, user profiling, or analytics". Page updated 20 Jul 2026. — [Android Developers: Play Age Signals overview](https://developer.android.com/google/play/age-signals/overview)
- California AB 1043 (Digital Age Assurance Act): OS providers collect age at device setup and send an age-bracket signal to developers;
  effective 1 Jan 2027; fines up to $2,500 (negligent) / $7,500 (intentional) per child. — [Troutman Privacy (search summary only)](https://troutmanprivacy.com/2025/10/analyzing-californias-digital-age-assurance-act/)
- Google Target audience: must declare target age groups; "If your app is designed primarily for children under 13, you must follow the
  Families policy"; any selected age group that includes children triggers Families requirements; listings that appeal to children may
  be rejected; neutral age screen = e.g. free-entry date of birth, not preset. — [Play Console Help: Target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159)
- Apple 1.3 Kids Category: no links out or purchases outside a parental gate; no third-party analytics/advertising (narrow exceptions);
  must comply with children's privacy laws worldwide. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Vietnam Law 91/2025 Art. 24: the legal representative exercises the data subject's rights on behalf of a child (except Art. 19(1)
  cases); disclosure of private-life information of a child "từ đủ 07 tuổi trở lên" needs consent of both the child and the
  representative. — [Law 91/2025/QH15 text (hrspring.vn mirror)](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- Decree 147/2024: social-network accounts of children under 16 are registered under a parent or guardian (applies to social networks).
  — [Vision & Associates in Vietnam Law Magazine](https://vietnamlawmagazine.vn/new-decree-on-management-provision-and-use-of-internet-services-and-online-information-73525.html)

### Inferences
- If the app is offered only on the Vietnam storefront / Vietnam country on Play, the Texas, Utah, Louisiana and California laws do not
  reach it in practice (they key on US-state accounts); Brazil's Digital ECA and Australia/Singapore rules likewise. Worldwide
  distribution would add the Declared Age Range / Age Signals work and parental-consent handling for US-state minors.
- A 16+ minimum age (proposal Q2 in `LEGAL_PAGES_RESEARCH`) keeps the app out of Google's Families policy and Apple's Kids Category,
  avoids the Vietnam "child" regime (under 16) and parental-consent flows, and simplifies ad SDK choice. To enforce it: a neutral age
  question at sign-up (birth year or "I am 16 or older" unticked), stored with timestamp (fixes DB3), declared target audience 16+ on
  Play (only 16–17 and 18+ groups), no child-appealing store art.
- Store rating will still show 4+ / 00+ (content-based); a self-imposed 16+ age gate in the app is separate from the store rating. If a
  matching store rating is wanted, Apple allows a higher manual rating (secondary source only).

### Gaps
- Whether Apple lets the developer raise the Vietnam-specific rating (00+ → 16+) was not verified.
- Louisiana's current effective status in 2026 and Utah HB 498 were not checked against official state sources.
- No Vietnamese rule specific to children's data in Decree 356 (age verification method, parental-consent form) was found.
- Background `COMMERCIAL_MINIMUM_CHECKLIST` C3 cites "Luật 116/2025 Điều 16 khoản 2" for parent-registered accounts under 16; not
  verified this session.

---

## 7. Education-app specifics (Apple and Google)

### Takeaway
Neither store has special rules for the Education category that this app triggers. The only education carve-out found is Apple 4.8's
exemption for apps requiring an existing school/enterprise account (not applicable). Google's Teacher Approved program is only for apps
whose audience includes children.

### Cited Findings
- Apple 4.8 exemption: "an education, enterprise, or business app that requires the user to sign in with an existing education or
  enterprise account." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 1.3 Kids Category requirements apply only if the developer opts into the Kids Category, and persist in later updates "even if
  you decide to deselect the category". — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Google: apps primarily for children, or for several age groups including children, "are eligible for consideration in the Teacher
  Approved program." — [Play Console Help: Target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159)

### Inferences
- Choose the Education category on both stores without the Kids Category / Families program. Opting into the Kids Category would ban
  third-party ads and analytics and require parental gates for purchases — incompatible with the planned ads and in-app Pro upsell.

### Gaps
- No search was run for Google Play's Education-category-specific metadata rules beyond Target audience; none surfaced.

---

## 8. Notifications: Apple 4.5.4 and Android 13+ permission (and email reminders)

### Takeaway
Push must not be required for the app to work; promotional pushes need explicit in-app opt-in and an in-app opt-out (Apple 4.5.4).
Android 13+ apps targeting API 33+ start with notifications off and must request `POST_NOTIFICATIONS` at runtime. Email reminders (the
current channel) are outside both stores' push rules.

### Cited Findings
- Apple 4.5.4: "Push Notifications must not be required for the app to function, and should not be used to send sensitive personal or
  confidential information. Push Notifications should not be used for promotions or direct marketing purposes unless customers have
  explicitly opted in to receive them via consent language displayed in your app's UI, and you provide a method in your app for a user to
  opt out." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 5.1.2(i): an app "may not require users to enable system functionalities (such as push notifications ...) in order to access
  functionality ... or receive monetary or other compensation". — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Android: apps targeting Android 13 (API 33)+ must declare and request `POST_NOTIFICATIONS`; on new installs "notifications are off by
  default"; best practice is to ask in context after explaining the value. (Android 13 change dates from 2022 — pre-2025, may be stale,
  but the page is current.) — [Android Developers: Notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- Google Play target API: from 31 Aug 2026 new apps and updates must target Android 16 (API 36); extension available to 1 Nov 2026. — [Play Console Help: Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878)

### Inferences
- Study reminders ("you have 12 cards due") are service notifications, but give them an in-app on/off switch anyway; anything about
  Pro offers or discounts is marketing and needs a separate, unticked opt-in (fits Vietnam's per-purpose consent rule, section 9).
- Since the app will target API 36, the runtime permission flow is mandatory on Android; ask after the user sets up a reminder, not at
  first launch.

### Gaps
- Vietnamese anti-spam rules for marketing email/SMS (Decree 91/2020, cited in background C2) were not re-researched.

---

## 9. Vietnam law affecting publishing: PDPL 91/2025 + Decree 356/2025, Decree 147/2024, consumer protection (Law 19/2023, Decree 55/2024), plus AI and e-commerce laws (not legal advice)

### Takeaway
PDPL 91/2025 (effective 1 Jan 2026) and Decree 356/2025 drive most work: per-purpose, provable consent; a Vietnamese-facing privacy
notice; data-subject request deadlines; and, unless exempt, a processing impact assessment (DPIA) and a cross-border transfer
assessment (CTIA) filed with A05 within 60 days — a foreign server or a foreign AI API counts as a cross-border transfer. Household
businesses and micro-enterprises are fully exempt and small enterprises/startups exempt for 5 years, **but not if they process
sensitive data or ≥100,000 data subjects**, and behavioural tracking data is now sensitive. Decree 147 imposes no licence or phone
verification on a private-content education app (social features would change that). Consumer law requires 7-working-day notices
before paid service renewal/expiry and termination at any time.

### Cited Findings
- PDPL Art. 9: consent must be voluntary, based on knowing the data type, purpose, controller and rights; clear and specific in a
  printable/verifiable form; separate per purpose; "Sự im lặng hoặc không phản hồi không được coi là sự đồng ý." — [Law 91/2025/QH15 text (hrspring.vn mirror)](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- Decree 356: consent must be stored and verifiable as to time and content; no default-on consent or misleading choices; consent via app
  settings, email, website etc. is valid. — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- PDPL Art. 20(1): cross-border transfer includes transferring data to foreign organisations and **using overseas platforms to process
  data collected in Vietnam**; Art. 20(2): CTIA dossier sent to the authority within 60 days of the first transfer; done once and updated
  under Art. 22. Art. 21: DPIA within 60 days of first processing. Art. 22: update every six months on changes; immediate update in
  listed cases. — [Law 91/2025/QH15 text (hrspring.vn mirror)](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- Decree 356: DPIA/CTIA review becomes **pre-approval** by A05 (Bộ Công an): A05 assesses within 15 days, the business has 30 days to
  complete a deficient dossier; forms Mẫu 09 and Mẫu 10; dossiers must map controller vs processor roles and include data-flow diagrams;
  update every six months on new purposes or new parties, within 10 days on listed events. — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- Exemptions: PDPL Art. 38(2) small and startup enterprises may choose not to apply Arts. 21, 22 and 33(2) for five years; Art. 38(3)
  household businesses and micro-enterprises exempt from those articles; neither applies to those processing sensitive data, large
  volumes, or providing data-processing services. — [Law 91/2025/QH15 text (hrspring.vn mirror)](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- Decree 356 exemption scope: appointing DPO/DPD and "Nghĩa vụ lập, cập nhật và nộp báo cáo DPIA, CTIA"; small enterprises and startups:
  five years from 1 Jan 2026; household businesses and micro-enterprises: fully exempt; not exempt if they sell data-processing services,
  directly process sensitive data, or have cumulatively processed ≥100,000 data subjects. — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- Decree 356 sensitive data now includes behavioural tracking and online-service usage data ("dữ liệu theo dõi hành vi, hoạt động sử dụng
  dịch vụ viễn thông, mạng xã hội, truyền thông trực tuyến và các dịch vụ khác trên không gian mạng"). — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- Transfers to a processor or third party need a written agreement stating purpose, data subjects, data types, duration, deletion,
  legal basis and responsibilities. — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- Breach: for location and biometric data, notify data subjects within 72 hours of discovery (in addition to notifying A05); breach
  records kept ≥5 years. — [EY Law Vietnam alert, March 2026](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- Penalties, PDPL Art. 8: trading personal data up to 10× the revenue gained; organisations violating cross-border rules up to 5% of the
  prior year's revenue; other violations up to 3 billion VND; individuals half of the organisational maximum. — [Law 91/2025/QH15 text (hrspring.vn mirror)](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- Decree 147/2024 (effective 25 Dec 2024, pre-2025, may be stale): licences/notifications are for general information websites, social
  networks (licence if ≥10,000 monthly visits or >1,000 regular monthly users; notification certificate if smaller), online games,
  mobile telecom content services; phone-number authentication applies to social networks and G1 games; foreign cross-border providers
  notify ABEI at 100,000 monthly Vietnam visits. The summary sets no obligation for ordinary apps. — [Vision & Associates in Vietnam Law Magazine](https://vietnamlawmagazine.vn/new-decree-on-management-provision-and-use-of-internet-services-and-online-information-73525.html)
- Law 19/2023 Art. 42 (continuous service contracts): contract in writing with a copy to the consumer; standard-form content incl. fees
  and calculation; notify the consumer about paying to continue at least 7 working days before the service expires, and of the contract
  end at least 7 working days before; unless agreed otherwise the consumer may terminate at any time and pays only for the part used. — [Law 19/2023 Art. 42 text (hethongphapluat.com mirror)](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023/dieu-42)
- Vietnam AI Law 134/2025 effective 1 Mar 2026 (see section 4). — [Rajah & Tann Asia (search summary only)](https://www.rajahtannasia.com/viewpoints/new-law-on-artificial-intelligence-takes-effect-on-1-march-2026/)
- E-commerce Law 122/2025/QH15 effective 1 Jul 2026, with implementing Decree 248/2026/NĐ-CP (dated 30 Jun 2026, effective 1 Jul 2026);
  MOIT said the draft decree keeps registration/notification of e-commerce websites and apps before service starts. — [search summary only: thuvienphapluat Law 122/2025](https://thuvienphapluat.vn/van-ban/Thuong-mai/Luat-Thuong-mai-dien-tu-2025-so-122-2025-QH15-662035.aspx?tab=7); [Tạp chí Kinh tế Tài chính (search summary only)](https://thuehaiquan.tapchikinhtetaichinh.vn/tao-khuon-kho-phap-ly-dong-bo-cho-thi-truong-thuong-mai-dien-tu-149665.html)

### Inferences
- Cross-border: hosting the API/DB abroad, or calling a foreign AI API with learner data, or sending email via a foreign SMTP service,
  each looks like "using overseas platforms to process data collected in Vietnam" → CTIA within 60 days of the first transfer unless
  exempt. Keeping personal data out of AI prompts (catalog words only) narrows but does not remove this if the server is abroad.
- Exemption depends on (a) the legal form: household business or micro-enterprise = fully exempt; small enterprise/startup = 5 years;
  an unregistered individual is not named in either summary; (b) not processing sensitive data. If study-activity history counts as
  "behavioural tracking ... on other online services", every learning app processes sensitive data and the exemption would be lost —
  this reading is uncertain and is the single most important question for a lawyer. Personalised ads would make the "behavioural
  tracking" reading much more likely.
- Also note the possible inconsistency: the PDPL Art. 38 summary exempts Arts. 21, 22, 33(2) (DPIA, updates, DPO) but does not list
  Art. 20 (CTIA), while EY's Decree 356 summary lists CTIA among exempted duties. Check the decree text.
- Consumer law vs store billing: Apple/Google run the renewal, but the developer is still the service provider to the consumer; sending
  own reminder emails ≥7 working days before each renewal and before expiry is low-cost and covers Art. 42 (background D4 already plans
  it). Termination "at any time, pay only for what was used" conflicts with store subscriptions that run to period end without pro-rata
  refunds — a legal question, not solvable in code.
- Decree 147: no licence, no Vietnamese phone verification as long as there are no social features (public word lists, comments,
  leaderboards with user names). Matches background F3.

### Gaps
- Decree 55/2024 (consumer protection decree) was not researched this session; background B2 cites its Art. 6 on standard-form contract
  presentation.
- Whether a subscription-selling app (sales through Apple/Google IAP only) must notify MOIT under the new e-commerce regime was not
  verified; Decree 248/2026's text was not opened.
- Official gazette text of Law 91/2025 and Decree 356/2025 was not opened (403 on thuvienphapluat); all PDPL points come from a mirror
  and EY's alert.
- Whether a Vietnamese-language privacy notice is legally mandatory was not verified.
- The 72-hour breach-notice duty to A05 for all data (background C6) was not re-verified; EY's alert only mentions the new duty to notify
  data subjects for location/biometric data.

---

## 10. Consolidated checklist: what must be built or declared, per store and for Vietnam

### Takeaway
Seven things must exist in the product before first submission (privacy policy page, in-app deletion + web deletion page, per-purpose
consent with stored proof, age gate decision, AI report button, Sign in with Apple if Google login is on iOS, store-honest ads setup),
plus store questionnaires (App Privacy, privacy manifests, age rating; Data safety, ads, target audience, IARC) and two Vietnam
filings decisions (DPIA/CTIA or a documented exemption). Sources are in sections 1–9.

### Cited Findings
Build (product/back-end):
- B1 Public privacy policy (HTML, not PDF, not geofenced), linked in App Store Connect, Play Console and inside the app; contents per
  Apple 5.1.1(i) and Google User Data policy (data, uses, third parties incl. SDKs and AI, retention/deletion, how to withdraw consent,
  developer contact). — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- B2 In-app account deletion (not deactivation), with stated timeframe and completion confirmation, subscription warning, optional OTP
  re-auth; web deletion-request page for Google; purge ≤20 days for Vietnam. — [Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/); [Google](https://support.google.com/googleplay/android-developer/answer/13327111); [EY on Decree 356](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- B3 Consent records: per purpose, unticked by default, timestamp + policy version stored, withdrawable (fixes DB3); separate explicit
  permission before sending personal data to a third-party AI; separate consent (and refusal option) for any tracking-based ads. — [Law 91/2025 Art. 9, 28, 29](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/); [Apple 5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/)
- B4 Minimum-age decision + neutral age question at sign-up, stored. — [Google Target audience](https://support.google.com/googleplay/android-developer/answer/9867159); [Law 91/2025 Art. 24](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/)
- B5 In-app "report this AI question" without leaving the app; filters on AI output; visible support contact. — [Play AI policy](https://support.google.com/googleplay/android-developer/answer/13985936); [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/)
- B6 If Google login on iOS: Sign in with Apple, token revocation on deletion, accept both relay domains. — [Apple 4.8](https://developer.apple.com/app-store/review/guidelines/); [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/); [Apple news 1ptvdtcm](https://developer.apple.com/news/?id=1ptvdtcm)
- B7 Ads: no launch/segment-start interstitials, closable ≤15 s, rating-appropriate; ATT before any IDFA/tracking; no feature gating on
  ATT. — [Play Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753); [Apple user privacy](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- B8 Notifications optional; marketing pushes behind opt-in with in-app opt-out; Android `POST_NOTIFICATIONS` runtime request. — [Apple 4.5.4](https://developer.apple.com/app-store/review/guidelines/); [Android](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- B9 Renewal/expiry reminder emails ≥7 working days before; cancellation path. — [Law 19/2023 Art. 42](https://hethongphapluat.com/luat-bao-ve-quyen-loi-nguoi-tieu-dung-2023/dieu-42)

Declare (Apple App Store Connect):
- A1 App Privacy label incl. third-party SDK data; privacy manifests for listed SDKs (Flutter, GoogleSignIn, Firebase, common plugins). — [Apple app privacy](https://developer.apple.com/app-store/app-privacy-details/); [Apple SDK list](https://developer.apple.com/support/third-party-SDK-requirements/)
- A2 Age rating questionnaire (new 2025 questions + social-media questions from Sep 2026); Vietnam rating is derived automatically. — [ASC age ratings](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/); [Apple news list](https://developer.apple.com/news/)
- A3 Build with iOS 26 SDK (required since 28 Apr 2026). — [Apple Developer News list (ueeok6yw)](https://developer.apple.com/news/)

Declare (Google Play Console, App content):
- G1 Privacy policy URL; Data safety (incl. SDKs, deletion questions + web link); Ads ("contains ads"); app access (test login for
  review); Target audience and content; IARC content rating; target API 36 from 31 Aug 2026. — [App content](https://support.google.com/googleplay/android-developer/answer/9859455); [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469); [Target API](https://support.google.com/googleplay/android-developer/answer/11926878)

Vietnam:
- V1 DPIA (Art. 21) and, if any server/AI/email provider is abroad, CTIA (Art. 20) within 60 days of first processing/transfer, A05
  pre-approval — or document why an exemption applies (household business/micro: full; small/startup: 5 years; lost if sensitive data or
  ≥100,000 subjects). — [Law 91/2025](https://hrspring.vn/van-ban-phap-luat/91-2025-qh15-625628/); [EY on Decree 356](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- V2 Written data-processing agreements with processors (hosting, email, AI). — [EY on Decree 356](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf)
- V3 No social features unless a Decree 147 notification/licence is obtained. — [Vietnam Law Magazine](https://vietnamlawmagazine.vn/new-decree-on-management-provision-and-use-of-internet-services-and-online-information-73525.html)

### Inferences
- Consistency with background files: no direct contradiction found. Points that agree: deletion within 20 days and consent-withdrawal
  2 working days/15 days (background C4, ADS §5.4); behavioural tracking data now sensitive (ADS line 212); UMP has no Vietnam message
  (ADS line 216); Sign in with Apple needed with Google login (H4); Vietnam rating 00+/12+/16+/18+ under Decree 147 Art. 38 (H6);
  target API 36 from 31 Aug 2026 and Xcode 26 from 28 Apr 2026 (H7); 7-working-day renewal notice (D4); avoid social features (F3).
- Nuance to add to the background: (1) Decree 147 Art. 38 is the online-games classification article; Apple applies its scale to all
  apps on the Vietnam storefront. (2) The Decree 356 DPIA/CTIA exemption is lost when processing sensitive data, and behavioural tracking
  is now sensitive — this interacts with the ads plan (ADS §8.4 options) and with the household-business route (checklist A1).
  (3) Apple's account-deletion page explicitly allows "manual or ... reasonable amount of time", so the planned asynchronous purge is
  acceptable if the UI states the time.

### Gaps
- Not covered here by design: subscription/IAP metadata rules (3.1.1/3.1.2, Play Subscriptions policy), store tax/merchant setup, Play
  closed testing — see sibling notes and background H2/H3/H8.
- A lawyer should confirm: sensitive-data reading of study history; exemption for an unregistered individual; CTIA exemption scope;
  e-commerce notification for an IAP-only app; consumer-law refund rule vs store subscriptions.
