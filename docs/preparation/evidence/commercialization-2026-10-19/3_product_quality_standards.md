# Product and technical quality standards for a commercial (paid) web + mobile app — state as of 19 Oct 2026

Scope: quality bars beyond legal compliance and app-store payment rules, for a solo-run freemium English-vocabulary
app (NestJS + PostgreSQL + Redis API, Next.js web, Vite/React admin, Flutter mobile not built yet, CEFR-J data,
planned AI-generated practice sentences). Research done 19/10/2026 with web search/fetch; ASVS numbers were counted
from the official ASVS 5.0.0 CSV downloaded from the OWASP GitHub release in this session.

Labels used on every finding: **[RULE]** = required by a law/regulation or by a contractual standard you must sign up
to (e.g. PCI DSS); **[PLATFORM]** = required by Apple / Google / Gmail / an AI provider to use their service;
**[BEST PRACTICE]** = industry standard or recognised guidance, not mandatory; **[RESEARCH]** = academic or market
data. **UNVERIFIED** = could not be confirmed from a primary source this session.

## 1. Security — what OWASP ASVS 5.0, OWASP Top 10:2025, MASVS/MASTG and API Security Top 10 expect; minimum for an app with accounts and payments; pen test; PCI scope with a gateway (SAQ A)

### Takeaway
No law requires ASVS or a pen test for this product; the recognised bar is OWASP ASVS 5.0.0 (the current edition,
released 30 May 2025): Level 1 (70 of 345 requirements) is the stated minimum and what OWASP itself says an
early-stage startup with limited sensitive data may target first, while Level 2 is what "most applications should be
striving" for — and several things people assume are "basic" (password hashing with a KDF, MFA, breached-password
check, secrets vault, security logging, anti-automation, CSP) sit in L2, not L1. If card data only ever touches a
payment gateway, PCI DSS v4.0.1 SAQ A applies: no pen test, but a quarterly external ASV vulnerability scan (11.3.2)
still applies, and the new script-attack eligibility criterion applies only when the gateway's form is embedded
(iframe), not when the user is redirected.

### Cited Findings

**ASVS 5.0 (edition, levels)**
- [BEST PRACTICE] ASVS latest stable version is 5.0.0 — [OWASP ASVS project page](https://owasp.org/www-project-application-security-verification-standard/). GitHub release `v5.0.0_release` was published 2025-05-30; the repo's `latest` release tag (republished 2026-10-15) still ships only `5.0.0` files, i.e. no 5.0.1/5.1 exists as of this research — [GitHub releases API, OWASP/ASVS](https://api.github.com/repos/OWASP/ASVS/releases) (checked in-session with `curl`).
- [BEST PRACTICE] ASVS 5.0 has ~350 requirements in 17 chapters; it was launched at Global AppSec EU Barcelona, 30 May 2025 — [ASVS 5.0 "What is the ASVS" chapter](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x03-What-is-the-ASVS.md); [SoftwareMill summary](https://softwaremill.com/whats-new-in-asvs-5-0/).
- Counted from the official CSV (`OWASP_Application_Security_Verification_Standard_5.0.0_en.csv`): 345 requirements; level at which each first applies: L1 = 70, L2 = 183, L3 = 92 — [ASVS 5.0.0 CSV, GitHub release asset](https://github.com/OWASP/ASVS/releases/download/v5.0.0_release/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv).
- Level definitions (official text): L1 = "minimum requirements", ~20% of requirements, first-layer defences against common attacks with no preconditions, deliberately few to lower the barrier; L2 = "Most applications should be striving to achieve this level", L1+L2 ≈ 70% of all requirements; L3 = highest assurance, the final ~30%, mostly defence-in-depth — [ASVS 5.0 "What is the ASVS"](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x03-What-is-the-ASVS.md).
- ASVS does not prescribe a level; the organisation decides by risk. Its own example: an early-stage startup collecting limited sensitive data may focus on Level 1 initially, while a bank would struggle to justify less than L3 — [ASVS 5.0 "What is the ASVS"](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x03-What-is-the-ASVS.md).
- ASVS states Level 1 is "not necessarily penetration testable" by an external black-box tester without access to documentation or code; ASVS is designed so requirements can be turned into automated unit/integration tests (e.g. login brute force, account enumeration) — [ASVS 5.0 "What is the ASVS"](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x03-What-is-the-ASVS.md).
- ASVS excludes backups and DNS from its scope (they are external processes), so they must be covered by ops guidance (see section 3) — [ASVS 5.0 "What is the ASVS"](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x03-What-is-the-ASVS.md).

**ASVS 5.0 Level 1 items most relevant to accounts + payments (from the CSV)** — [ASVS 5.0.0 CSV](https://github.com/OWASP/ASVS/releases/download/v5.0.0_release/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv)
- Auth: V6.1.1 document how rate limiting / anti-automation defend against credential stuffing and brute force; V6.3.1 implement those controls; V6.2.1 passwords ≥ 8 chars (15 strongly recommended); V6.2.4 check new passwords against at least the top 3,000 common passwords; V6.2.5 no composition rules; V6.2.7 allow paste/password managers; V6.2.2–6.2.3 users can change password, change requires current password; V6.3.2 no default accounts (root/admin); V6.4.1 activation codes random, short-lived, single-use; V6.4.2 no password hints / secret questions.
- Session/tokens: V7.2.1 verify tokens on a trusted backend; V7.2.3 reference tokens ≥128 bits CSPRNG; V7.2.4 new session token on (re)authentication; V7.4.1 logout/expiry makes the session unusable; V7.4.2 kill all sessions when the account is disabled or deleted; V9.1.1–9.1.3 and V9.2.1 JWT signature check, algorithm allowlist, trusted keys, `exp`/`nbf` enforced.
- Access control: V8.2.1 function-level and V8.2.2 object-level authorization (IDOR/BOLA); V8.3.1 enforced server-side.
- Injection/output: V1.2.4 parameterised queries/ORM; V1.2.1–1.2.3 context output encoding; V1.3.2 no `eval`; V3.2.2 render text with safe functions.
- Browser/transport: V3.3.1 cookies `Secure` + `__Host-`/`__Secure-` prefix; V3.4.1 HSTS max-age ≥ 1 year; V3.4.2 CORS allow-origin fixed or allowlisted; V3.5.3 sensitive actions not via GET; V12.1.1 only TLS 1.2/1.3; V12.2.1–12.2.2 TLS everywhere external, publicly trusted certificates; V14.2.1 no secrets/tokens in URLs or query strings.
- Dependencies: V15.1.1 document risk-based remediation time frames for vulnerable third-party components; V15.2.1 no component past those time frames.
- Other: V13.4.1 no `.git` exposed; V15.3.1 return only needed fields; V5.2.1 upload size limits; V14.3.1 clear authenticated data from client storage on logout; V10.4.x OAuth server rules (only if you run your own authorization server).

**ASVS 5.0 items that are Level 2, not Level 1 (often assumed "basic")** — [ASVS 5.0.0 CSV](https://github.com/OWASP/ASVS/releases/download/v5.0.0_release/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv)
- V11.4.2 store passwords with an approved, computationally intensive KDF (password hashing function); V6.2.12 check passwords against breached-password sets; V6.2.9 allow ≥ 64-char passwords; V6.3.3 MFA (or combination of factors) to access the app.
- V6.5.1–6.5.5 OTP/out-of-band codes single-use, CSPRNG, ≥ 20 bits entropy (6 random digits suffice), defined lifetime (out-of-band max 10 min); V6.6.3 rate-limit code-based out-of-band auth against brute force.
- V2.4.1 anti-automation against excessive calls (data exfiltration, quota exhaustion, rate-limit abuse).
- V13.3.1 secrets management solution (key vault) for backend secrets; V13.3.2 least-privilege access to secrets; V13.4.2 debug modes off in production.
- V16.x all security logging: V16.2.5 do not log data above its protection level (e.g. credentials, payment details); V16.3.1 log all authentication attempts; V16.3.2 log failed authorization; V16.4.2 logs protected from tampering; V16.4.3 logs shipped to a separate system; V16.5.1 generic error messages (no stack traces); V16.5.2–16.5.3 degrade gracefully, fail closed.
- V3.4.3 Content-Security-Policy; V3.3.2 SameSite cookies; V7.3.1–7.3.2 inactivity and absolute session timeouts; V7.5.1 re-auth before changing email/MFA; V7.5.2 user can view and terminate active sessions; V12.3.1 TLS also for internal connections (DB, Redis, monitoring); V14.2.3 sensitive data not sent to trackers.

**OWASP Top 10 (web) — latest edition**
- [BEST PRACTICE] Current edition is OWASP Top 10:2025: A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging and Alerting Failures, A10 Mishandling of Exceptional Conditions. The official page calls itself a "standard awareness document" (not a verification standard) — [OWASP Top 10:2025](https://top10.owasp.org/2025).
- Release timing: announced Nov 2025 at OWASP Global AppSec (Washington, D.C.) and finalised Jan 2026 per Parasoft; Fastly described the Nov 2025 version as a release candidate. The official page gives no date — [Parasoft](https://parasoft.com/blog/owasp-top-10/); [Fastly](https://www.fastly.com/blog/new-2025-owasp-top-10-list-what-changed-what-you-need-to-know). Exact final date: UNVERIFIED from OWASP itself.

**OWASP API Security Top 10**
- [BEST PRACTICE] Current edition is still 2023 (no newer edition listed): API1 Broken Object Level Authorization, API2 Broken Authentication, API3 Broken Object Property Level Authorization, API4 Unrestricted Resource Consumption, API5 Broken Function Level Authorization, API6 Unrestricted Access to Sensitive Business Flows, API7 SSRF, API8 Security Misconfiguration, API9 Improper Inventory Management, API10 Unsafe Consumption of APIs — [OWASP API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x11-t10).
- API4:2023 explicitly treats a missing or badly set **spending limit on paid third-party services** (email, SMS, per-request APIs) as a vulnerability; its example is a scripted SMS "forgot password" flow running up provider fees — [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/). Directly relevant to OTP email and AI calls.

**OWASP MASVS / MASTG (mobile)**
- [BEST PRACTICE] MASVS current version is v2.1.0 (GitHub release 2024-01-18), which added the MASVS-PRIVACY group; v2.0.0 (2023-04-01) removed the L1/L2/R levels from MASVS itself — [GitHub releases API, OWASP/masvs](https://api.github.com/repos/OWASP/masvs/releases) (checked in-session); [MASVS v2.0.0 release news](https://mas.owasp.org/news/2023/04/01/masvs-v200-release/); [GitHub releases page](https://github.com/OWASP/owasp-masvs/releases).
- MASVS control groups: STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY — [mas.owasp.org/MASVS](https://mas.owasp.org/MASVS/).
- Levels now live as MAS Testing Profiles: L1 Essential Security, L2 Advanced Security, R Resilience (anti-reverse-engineering), P Privacy — [MAS Testing Profiles](https://mas.owasp.org/MASTG/0x03b-Testing-Profiles/); [MASTG test instructions](https://mas.owasp.org/contributing/writing-content/mastg-test.instructions/). Example of profile difference: MASVS-STORAGE-1 allows unencrypted internal storage at L1 but requires encryption at L2 — [Approov guide](https://approov.io/blog/a-practical-guide-to-owasp-masvs-v2) (secondary).
- The OWASP/mastg GitHub repo shows a release tagged `v2.0.0` published 2026-06-30 — [GitHub releases API, OWASP/mastg](https://api.github.com/repos/OWASP/mastg/releases) (checked in-session; content of that release not reviewed).

**Minimum for accounts + payments, and pen testing**
- [RULE — PCI DSS] SAQ A (PCI DSS v4.0.1, revision r1) took effect 31 March 2025; it removed requirements 6.4.3 (payment-page script inventory) and 11.6.1 (change/tamper detection) and added an eligibility criterion that the merchant confirms its site is not susceptible to script attacks; 11.3.2 (regular external vulnerability scans) still applies — [Adyen SAQ A eligibility](https://docs.adyen.com/development-resources/pci-dss-compliance-guide/saq-a-eligibility); [Report URI FAQ](https://blog.report-uri.com/pci-dss-4-0-1-saq-a-and-client-side-security-a-plain-english-faq/). Integrity360 gives 1 April 2025 instead of 31 March — [Integrity360](https://insights.integrity360.com/important-update-on-pci-dss-saq-a-eligibility-criteria) (conflict noted; 31 March is more widely cited).
- [RULE — PCI DSS] PCI SSC FAQ 1588 (Feb 2025): the script criterion can be met with techniques like 6.4.3/11.6.1 or with written confirmation from a PCI-compliant payment provider; it applies **only** to merchants embedding the provider's payment form (e.g. iframe), **not** to merchants that redirect to the provider's site or fully outsource payment (e.g. emailed payment link) — [PCI SSC FAQ 1588](https://pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/how-does-an-e-commerce-merchant-meet-the-saq-a-eligibility-criteria-for-scripts).
- [RULE — PCI DSS] SAQ A merchants must still do quarterly external vulnerability scans (11.3.2) of the e-commerce system, scope possibly limited for online payment integrations — [Adyen vulnerability scanning](https://docs.adyen.com/development-resources/pci-dss-compliance-guide/vulnerability-scanning-regulation); [DashDevs ASV guide](https://dashdevs.com/blog/approved-scanning-vendor-guide/) (secondary).
- [RULE — PCI DSS] SAQ A has no penetration-testing (11.4) or segmentation-testing requirement — [Software Secured PCI pentest guide](https://www.softwaresecured.com/guides-and-checklists/pci-dss-pentesting-guide) (secondary; official SAQ A requirement table not read this session, see a copy of the official SAQ A v4.0.1 r1 at [UMSystem](https://www.umsystem.edu/sites/default/files/media/fa/treasurer/PCI-DSS-v4_0_1-SAQ-A-r1.docx)).
- [PLATFORM] Apple App Review requires on-device testing and rejects binaries that crash or show obvious technical problems; requires a demo account and a running back end for login apps — [App Store Review Guidelines 2.1](https://developer.apple.com/app-store/review/guidelines/). No platform source found that requires a pen test.

### Inferences
- **Pen test before launch: not required** by any rule found for this product (SAQ A has none; Apple/Google do not ask). Practical bar for a solo developer: self-assess against ASVS 5.0 L1 + the selected L2 items below, run an automated scan (e.g. OWASP ZAP baseline) against staging, and turn the auth/IDOR checks into automated tests (ASVS explicitly suggests this). A paid third-party pen test becomes "expected" when B2B/school customers, investors or an acquirer ask for it — inference, not a sourced rule.
- **Smallest acceptable security bar (solo, accounts + subscriptions):** ASVS 5.0 L1 in full, plus these L2 items because the product holds accounts and spends money per request: V11.4.2 password KDF (argon2id/bcrypt), V6.2.12 breached-password check, V6.5.x/V6.6.3 OTP single-use + expiry + rate limit, V2.4.1 anti-automation, V13.3.1 secrets out of the repo in a managed secret store, V16.2.5 no secrets/OTP/tokens in logs, V16.3.1 log auth events, V16.5.1 generic errors, V3.4.3 CSP, V7.5.2 session list/revoke, V13.4.2 debug off. **Mature company:** full L2, MFA (V6.3.3) at least for staff/admin, SBOM and dependency-confusion protections (V15.2.4, L3), annual third-party pen test, bug-bounty/VDP.
- For **mobile (Flutter, not built yet)**: target MAS profile L1 (+P for privacy); L2 only if storing sensitive data on device; R (anti-tamper) is not needed for a vocabulary app.
- **Payments:** if subscriptions on mobile go through Apple/Google in-app purchase, card data never touches the app, so PCI scope for mobile is effectively the store's (inference). For web with a Vietnamese gateway (VNPay/MoMo/etc.), prefer a **redirect** flow: it keeps SAQ A and avoids the script-attack criterion entirely (FAQ 1588). An embedded iframe form brings in the script criterion. Quarterly ASV scan still applies under SAQ A — check with the acquirer/gateway whether they require you to submit an SAQ at all at small volumes (UNVERIFIED for Vietnamese gateways).

### Gaps
- Official OWASP date for the final Top 10:2025 release not found on owasp.org (secondary sources only).
- Official SAQ A v4.0.1 r1 requirement table not read directly (PCI SSC document library PDF not fetched); the "no 11.4 pen test in SAQ A" point rests on secondary sources.
- Whether Vietnamese payment gateways/acquirers actually require small merchants to file SAQ A and ASV scans: not researched.
- Content of MASTG v2.0.0 (June 2026) not reviewed.

## 2. Privacy engineering — practical minimum beyond the legal text

### Takeaway
Privacy engineering expectations come from three places: ASVS data-protection items (mostly L2), platform rules
(Apple: disclose and get explicit permission before sharing personal data with a third-party AI; Google Play and
Apple: in-app account deletion, plus a web deletion link on Play), and AI-provider data terms (e.g. Gemini's free
tier lets Google use and human-review prompts). The smallest acceptable implementation: data inventory, no personal
data in URLs/logs/trackers, in-app + web account deletion that deletes data, a stated retention period, and a paid
(no-training) AI tier with no personal data in prompts.

### Cited Findings
- [BEST PRACTICE] ASVS 5.0 L1: no sensitive data in URLs/query strings (V14.2.1); clear authenticated data from client storage on logout (V14.3.1). L2: classify all sensitive data into protection levels (V14.1.1) with documented protection requirements incl. retention and logging (V14.1.2, V14.2.4); don't send sensitive data to untrusted parties such as user trackers (V14.2.3); `Cache-Control: no-store` for sensitive responses (V14.3.2) — [ASVS 5.0.0 CSV](https://github.com/OWASP/ASVS/releases/download/v5.0.0_release/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv).
- [BEST PRACTICE] MASVS v2.1.0 added a PRIVACY control group and a dedicated "P" testing profile for mobile — [MASVS releases](https://github.com/OWASP/owasp-masvs/releases); [MAS Testing Profiles](https://mas.owasp.org/MASTG/0x03b-Testing-Profiles/).
- [PLATFORM — Apple] 5.1.1(v): apps that support account creation must offer account deletion within the app; 5.1.1(i): privacy policy link in App Store Connect and inside the app; 5.1.2(i): must clearly disclose where personal data is shared with third parties, **including third-party AI**, and obtain explicit permission first — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- [PLATFORM — Google Play] Apps that allow account creation must provide an in-app path to delete the account and associated data **and** a web link to request deletion without the app; the link goes in the Data safety form; data kept for security/fraud/regulatory reasons must be disclosed; enforcement incl. removal applied after 31 May 2024 — [Play Console Help: account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).
- [PLATFORM — Google Gemini API] On unpaid services Google uses submitted content and responses to improve products and human reviewers may read them; Google says not to submit sensitive or personal information to unpaid services; paid services are not used to improve products; apps offered to users in the EEA, Switzerland or UK must use paid services only (terms effective 23 Mar 2026) — [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms).
- [RULE — Vietnam, for context only] The Personal Data Protection Law 91/2025/QH15 and Decree 356/2025 took effect 1 Jan 2026 (replacing Decree 13/2023); small businesses/start-ups get a 5-year grace on DPIA filing and DPO appointment unless they process sensitive data, provide data-processing services, or reach a scale threshold (Tilleke cites 100,000 data subjects) — [Tilleke & Gibbins](https://www.tilleke.com/insights/new-decree-provides-guidance-for-vietnams-personal-data-protection-law/?page=2); [Conventus Law](https://conventuslaw.com/report/vietnams-new-personal-data-protection-law-what-businesses-need-to-know/); [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html). One Tilleke page gives a conflicting 1 Sep 2026 date for a decree — conflict noted; legal detail belongs to the legal-compliance research track.

### Inferences
- **Smallest acceptable (solo):** a one-page data inventory (what personal data, where stored, retention, who receives it: email provider, AI provider, analytics, payment gateway); log redaction for email/OTP/tokens/raw answers (already a project convention per CLAUDE.md, SR logging rule); account deletion in-app and via a web form that actually deletes or anonymises learning data; data export on request (manual is acceptable at small scale); AI calls on a paid tier, with prompts that contain only the word/sense, never user identity; a consent/disclosure screen before any learner text goes to an AI provider (Apple 5.1.2(i)). **Mature company:** DPIA, DPO, automated DSAR export, retention jobs, vendor DPAs, privacy reviews per feature.

### Gaps
- NIST Privacy Framework current version not checked.
- Whether learners' own private words / context sentences count as "personal data" under Decree 356 not analysed (legal track).

## 3. Reliability and operations — SLOs, backups/RPO/RTO, monitoring, error tracking, incident response, status page, staging, migration safety

### Takeaway
There is no rule or platform requirement for uptime for a consumer subscription app; the recognised guidance (Google
SRE) is to pick a few user-facing SLIs, set a realistic SLO from current performance over a 4-week window (never
100%), and — for data — test restores, because backups are worthless until a restore has been done. Smallest
acceptable for a solo product: one availability SLO measured from outside, error tracking (Sentry's free tier is
enough), daily automated PostgreSQL backups with a quarterly restore test, a written incident checklist, a staging
environment, and expand-and-contract migrations.

### Cited Findings
- [BEST PRACTICE] Google SRE Workbook: 100% reliability is the wrong target; each extra "nine" costs more while its benefit approaches zero; express an SLI as good events / total events; keep ≤ 5 SLIs; count HTTP 5xx as failures; measure as close to the user as practical; if you have no other data, start from current performance rounded down; use a 4-week rolling window; agree an error-budget policy. Its worked example uses 97% availability and latency targets of 90% < 450 ms and 99% < 900 ms; 99.9% appears only as an error-budget illustration — [SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/).
- [BEST PRACTICE] Google SRE Book, Data Integrity: "no one really wants to make backups; what people really want are restores"; design backups around required restore speed and acceptable data loss (i.e. RTO and RPO); you only know you can recover if you actually do so — run recovery tests continuously, automate them, alert when they stop succeeding; defence in depth = soft deletion first, backups second, data validation third; replication is not recoverability because it copies corruption and deletions — [SRE Book: Data Integrity](https://sre.google/sre-book/data-integrity/).
- [BEST PRACTICE] NIST SP 800-61 Rev. 3 (final, April 2025), "Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile", replaces Rev. 2 and organises incident response around the CSF 2.0 functions (Govern, Identify, Protect, Detect, Respond, Recover) — [NIST news release](https://nist.gov/news-events/news/2025/04/nist-revises-sp-800-61-incident-response-recommendations-and-considerations); [Xantrion summary](https://www.xantrion.com/articles/navigating-the-new-nist-incident-response-lifecycle-a-holistic-approach).
- [BEST PRACTICE] Prisma documents the expand-and-contract pattern for schema changes on populated, in-use columns (add new field → deploy code writing both, reading old → migrate data → switch reads → drop old) to avoid downtime between migration and code deploy — [Prisma: customizing migrations](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/customizing-migrations); [Prisma data guide: expand and contract](https://www.Prisma.io/dataguide/types/relational/expand-and-contract-pattern).
- [BEST PRACTICE] Error tracking cost floor: Sentry's free Developer plan includes 1 user, 5k errors, 30-day lookback, 5M tracing spans, 50 session replays, 5 GB logs; Team plan $29/month (or $26/month annually) — [Sentry pricing](https://sentry.io/pricing/) (fetched 19/10/2026; whether 5k errors is per month not stated on the fetched text).
- [BEST PRACTICE] ASVS 5.0 L2 requires the app to keep operating securely when an external resource fails (circuit breakers, graceful degradation, V16.5.2) and to fail closed (V16.5.3); and to defend against loss of availability from resource-heavy functionality (V15.2.2) — [ASVS 5.0.0 CSV](https://github.com/OWASP/ASVS/releases/download/v5.0.0_release/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv).

### Inferences
- **Smallest acceptable (solo):**
  - SLO: one availability SLI (non-5xx share of API requests, measured at the load balancer/edge) with a modest target such as 99.5% per 4 weeks, plus an external uptime check on `/health` that alerts by email/phone. 99.5% ≈ 3.6 h of downtime per 30 days (arithmetic). The specific number is a judgement call, not a sourced industry standard.
  - Backups: managed Postgres with daily automated backups + point-in-time recovery if the host offers it; an off-provider copy; a **restore drill** to a scratch database at least quarterly and before launch, with the measured restore time written down. State RPO (e.g. ≤ 24 h, or ≤ 5 min with PITR) and RTO (e.g. ≤ 4 h) in a doc — illustrative targets, not sourced.
  - Monitoring/alerting: error tracking (Sentry free), uptime check, alerts on queue backlog (BullMQ) and AI-spend spikes.
  - Incident response: a one-page checklist (detect → communicate → mitigate → post-mortem) and a place to post status; a hosted status page is optional at pilot scale — a pinned notice on the landing page or social channel is the minimum (best-practice judgement, no source requires a status page).
  - Staging: a separate environment with its own database and secrets that runs the same migrations before production.
  - Migrations: forward-only, expand-and-contract for renames/type changes, backup taken immediately before each production migration.
- **Mature company:** multiple SLOs with error-budget policy, on-call rotation, PITR with tested RPO minutes, multi-AZ, hosted status page, formal post-mortems, game days.

### Gaps
- No authoritative source found for "typical uptime of consumer subscription apps" (vendor blogs only; not used).
- No source found that a status page is expected by consumers or required by platforms.

## 4. Performance — Core Web Vitals thresholds, Google Play Android vitals, Apple expectations

### Takeaway
Web: the current Core Web Vitals are LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile, split mobile vs
desktop (INP replaced FID in 2024). Android: Google Play's "bad behaviour" thresholds are 1.09% user-perceived crash
rate and 0.47% user-perceived ANR rate overall (8% per phone model); exceeding them can reduce store visibility and
show a warning on the listing. Apple publishes no numeric threshold but rejects apps that crash in review and
measures hangs (≥ 250 ms) in Xcode Organizer. Platform SDK floors also apply: Play target API 36 from 31 Aug 2026,
Apple Xcode 26 / iOS 26 SDK since 28 Apr 2026.

### Cited Findings
- [BEST PRACTICE / affects Google Search ranking signals] Core Web Vitals "good" thresholds: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, measured at the 75th percentile of page loads, segmented by mobile and desktop; INP became a stable Core Web Vital in 2024 — [web.dev: Web Vitals](https://web.dev/articles/vitals).
- "Poor" thresholds: LCP > 4000 ms, INP > 500 ms, CLS > 0.25; between good and poor is "needs improvement" — [web.dev: Defining the Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds).
- [PLATFORM — Google Play] Core vitals: user-perceived crash rate and user-perceived ANR rate (all apps), excessive partial wake locks (all apps), memory metrics. Bad-behaviour thresholds: crash rate 1.09% overall / 8% per phone model / 4% per watch model; ANR rate 0.47% overall / 8% per phone model / 5% per watch model; excessive partial wake locks 5% overall. Exceeding them may reduce visibility and add a store-listing warning; Play evaluates a 28-day average daily. Memory/bitmap thresholds may affect visibility from February 2027 — [Android vitals](https://developer.android.com/topic/performance/vitals).
- Per-phone-model 8% thresholds and store-listing warnings were introduced in 2022 (warnings from 30 Nov 2022) — [Android Developers Blog, Oct 2022](https://android-developers.googleblog.com/2022/10/raising-bar-on-technical-quality-on-google-play.html).
- [PLATFORM — Google Play] From 31 Aug 2026 new apps and app updates must target Android 16 (API level 36); existing apps must target API 35+ to stay available to new users on newer Android; extension possible to 1 Nov 2026 — [Android: target API level requirements](https://developer.android.com/google/play/requirements/target-sdk) (via search summary of the official page).
- [PLATFORM — Apple] Since 28 Apr 2026, apps uploaded to App Store Connect must be built with Xcode 26+ against the iOS 26 (and sibling) SDKs — [Apple: upcoming requirements](https://www.developer.apple.com/news/upcoming-requirements/) (via search summary).
- [PLATFORM — Apple] Guideline 2.1: Apple rejects binaries that crash or exhibit obvious technical problems — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- [BEST PRACTICE — Apple tooling] Xcode Organizer shows hang rate, hitch rate and hang reports from a statistical sample (also via MetricKit) — [Apple: Analyzing responsiveness issues in your shipping app](https://developer.apple.com/documentation/xcode/analyzing-responsiveness-issues-in-your-shipping-app.md). Apple tools report hangs from 250 ms ("micro hangs"), > 500 ms treated as a proper hang — [WWDC23 session 10248](https://developer.apple.com/videos/play/wwdc2023/10248); hang rate counts only pauses > 250 ms — [Datadog docs](https://docs.datadoghq.com/real_user_monitoring/error_tracking/mobile/ios/) (secondary).

### Inferences
- **Smallest acceptable (solo):** web pages (landing + learner screens) pass all three CWV at p75 on mobile in PageSpeed Insights/CrUX (or Lighthouse lab data before there is field traffic); API p95 latency target written down (e.g. < 500 ms for non-AI endpoints, illustrative); Flutter app: crash-free sessions tracked (Firebase Crashlytics or Sentry), staying well under 1.09% crash / 0.47% ANR, no main-thread work > 250 ms on common flows; keep up with the yearly Play target-API and Apple SDK deadlines. **Mature company:** RUM dashboards, performance budgets in CI, per-device monitoring.
- AI-generated practice in-request (project decision) will dominate latency; set a separate, looser latency SLO and a loading state for AI endpoints (inference).

### Gaps
- Apple's own wording of the hang-rate definition (250 ms) not retrieved from developer.apple.com directly.
- No official Apple numeric crash/hang threshold exists in sources found (absence is itself the finding, but not proven).

## 5. Accessibility — WCAG 2.2 AA, Vietnam requirements, European Accessibility Act

### Takeaway
WCAG 2.2 Level AA (W3C Recommendation 5 Oct 2023; also ISO/IEC 40500:2025, announced 21 Oct 2025) is the de-facto
bar. In Vietnam it is **not mandatory for a private app**: Circular 26/2020/TT-BTTTT makes web accessibility standards
mandatory only for state bodies, press agencies and public-service organisations (and only WCAG 1.0 is mandatory for
them; WCAG 2.0/2.1 are recommended), while other organisations are "encouraged". The European Accessibility Act
applies from 28 June 2025 to e-commerce services offered to EU consumers via websites and mobile apps, but
microenterprises providing services (< 10 staff and ≤ €2 M turnover or balance sheet) are exempt — so it does not bind
this project unless it grows past that size and sells to EU consumers.

### Cited Findings
- [BEST PRACTICE] WCAG 2.2 became a W3C Recommendation on 5 Oct 2023. New criteria: 2.4.11 Focus Not Obscured (Minimum) AA; 2.4.12 Focus Not Obscured (Enhanced) AAA; 2.4.13 Focus Appearance AAA; 2.5.7 Dragging Movements AA; 2.5.8 Target Size (Minimum) AA; 3.2.6 Consistent Help A; 3.3.7 Redundant Entry A; 3.3.8 Accessible Authentication (Minimum) AA; 3.3.9 Accessible Authentication (Enhanced) AAA. 4.1.1 Parsing was removed. WCAG 3 is still a draft — [W3C: What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).
- [BEST PRACTICE] WCAG 2.2 approved as ISO/IEC 40500:2025 (W3C announcement 21 Oct 2025); one national store lists approval 24 Sep 2025, BSI lists publication 31 Oct 2025 — [W3C news](https://www.w3.org/WAI/news/2025-10-21/wcag22-iso); [BSI](https://knowledge.bsigroup.com/products/information-technology-w3c-web-content-accessibility-guidelines-wcag-2-2) (date discrepancy noted).
- [RULE — Vietnam] Law on Persons with Disabilities No. 51/2010/QH12, Art. 43, sets ICT responsibilities and **encourages** organisations to develop and apply IT for persons with disabilities, with tax/loan incentives (Art. 43(3)) — [Luật Minh Khuê analysis](https://luatminhkhue.vn/quy-dinh-cua-phap-luat-hien-hanh-ve-cong-nghe-thong-tin-va-truyen-thong-doi-voi-nguoi-khuyet-tat-thuc-tien-thuc-hien-o-viet-nam.aspx); [Luật Hoàng Anh](https://luathoanganh.vn/chinh-sach-xa-hoi/cong-nghe-thong-tin-va-truyen-thong-lien-quan-den-nguoi-khuyet-tat-duoc-quy-dinh-nhu-the-nao-lha9955.html) (secondary; official text not read).
- [RULE — Vietnam] Circular 26/2020/TT-BTTTT (23 Sep 2020, effective 1 Jan 2021, replacing Circular 28/2009/TT-BTTTT): website standards are **mandatory** for state bodies building sites with state budget, press agencies, and organisations providing public/administrative services (Art. 2.2–2.4, 5.1); **other organisations and individuals are encouraged** to apply them (Art. 5.2). Appendix group 3: WCAG 1.0 mandatory for the bodies in Art. 2.2–2.3; ISO/IEC 40500:2012 (WCAG 2.0), WCAG 2.1 and ATAG 2.0 recommended; no conformance level specified — [caselaw.vn: Thông tư 26/2020/TT-BTTTT](https://caselaw.vn/van-ban-phap-luat/374305-thong-tu-so-26-2020-tt-btttt-ngay-23-09-2020-cua-bo-truong-bo-thong-tin-va-truyen-thong-quy-dinh-ve-viec-ap-dung-tieu-chuan-cong-nghe-ho-tro-nguoi-khuyet-tat-tiep-can-su-dung-san-pham-dich-vu-thong-tin-va-truyen-thong).
- [RULE — EU] Directive (EU) 2019/882 (EAA): applies to services provided to consumers after 28 June 2025, including e-commerce services and e-books (Art. 2(2)); "e-commerce services" = services provided at a distance through websites and mobile device-based services, by electronic means, at the consumer's request, with a view to concluding a consumer contract (Art. 3(30)); microenterprises providing services are exempt from the accessibility requirements (Art. 4(5)); microenterprise = fewer than 10 persons and annual turnover or balance-sheet total ≤ €2 M (Art. 3(23)) — [EUR-Lex: Directive 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj).
- EAA practical benchmark is EN 301 549 (corresponding to WCAG 2.1 AA); the microenterprise exemption should be read restrictively and covers services only — [e-include.eu](https://e-include.eu/web-accessibility/european-accessibility-act/); [accessible.org](https://accessible.org/top-10-eaa-questions/) (secondary).
- [PLATFORM] Apple's App Review Guidelines (as fetched) contain no accessibility conformance requirement; no Google Play accessibility mandate was found either (absence based on the sections read).

### Inferences
- **Smallest acceptable (solo):** treat WCAG 2.2 AA as the design target for learner-facing web and the Flutter app, and verify the cheap, high-impact items: colour contrast, keyboard/focus visibility (2.4.7, 2.4.11), 24×24 px targets (2.5.8), labels on form inputs, no drag-only interactions in flashcards (2.5.7), login that allows paste/password managers (3.3.8 — also matches ASVS V6.2.7), screen-reader labels on flashcard controls, text resize. Run an automated checker (axe/Lighthouse) in CI and one manual screen-reader pass (TalkBack/VoiceOver) before launch. Publish a short accessibility statement. **Mature company:** formal WCAG 2.2 AA audit, VPAT/EN 301 549 conformance report (needed for school/government procurement).
- Vietnamese schools or public-sector buyers would fall under Circular 26/2020 obligations themselves; a B2B/B2G sale may therefore pull in WCAG requirements contractually (inference).

### Gaps
- Official text of Law 51/2010 Art. 43 not read directly (secondary analyses only); whether Circular 26/2020 has been replaced after the 2025 ministry merger (MIC → Ministry of Science and Technology) was not checked.
- No current TCVN standard for web accessibility was found.

## 6. Support and trust — contact channel, response time, refunds, ToS/privacy policy, pricing page, data export/deletion, email deliverability (SPF/DKIM/DMARC, Gmail/Yahoo bulk-sender rules)

### Takeaway
Platform rules set the floor: Apple requires an easy contact path via the Support URL, a privacy policy in-app and in
metadata, clear description of what a subscription gives before purchase, and in-app account deletion; Google Play
requires in-app + web account deletion. Mobile refunds are largely the store's business (Google refunds within 48 h,
developer after; Apple handles IAP refunds). For email, every sender to Gmail must have SPF or DKIM, valid PTR, TLS and
a spam rate < 0.3%; bulk senders (> 5,000/day, status permanent once reached) need SPF + DKIM + DMARC (p=none OK),
alignment and one-click unsubscribe for marketing mail; Gmail moved to rejecting non-compliant traffic from November
2025.

### Cited Findings
- [PLATFORM — Apple] 1.5: the app and its Support URL must include an easy way to contact the developer; 3.1.2(a): auto-renewable subscriptions must provide ongoing value, last ≥ 7 days and be available across the user's devices; 3.1.2(c): clearly describe what the user gets for the price before asking to subscribe; 5.1.1(i) privacy policy link; 5.1.1(v) in-app account deletion; 1.2: AI content-creation apps need content filtering, a reporting mechanism with timely responses, the ability to block abusive users, and published contact information — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- [PLATFORM — Google Play] In-app + web account deletion with associated data — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/13327111).
- [PLATFORM — Google Play] Google may refund within 48 hours of purchase; after 48 hours the developer's own policy and law apply and the developer can refund; a monthly subscription cancelled within 48 hours may be refunded for that month — [Google Play Help: refunds](https://support.google.com/googleplay/answer/2479637?hl=en). Refunds after 48 h are deducted from the developer payout (2017 report, may be outdated) — [9to5Google](https://9to5google.com/2017/02/23/google-play-refund-48-hour-developer-payouts/).
- [PLATFORM — Apple] For in-app purchases only Apple issues refunds; developers point users to reportaproblem.apple.com — [Apple Developer Forums thread](https://developer.apple.com/forums/thread/123329) (community answer, not Apple policy text; UNVERIFIED from Apple documentation).
- [PLATFORM — Gmail] All senders (from Feb 2024): SPF or DKIM; valid forward and reverse DNS (PTR); TLS; spam rate in Postmaster Tools < 0.3%; RFC 5322 format; don't impersonate Gmail From headers. Bulk senders (> 5,000 messages/day): SPF **and** DKIM **and** DMARC (policy may be `none`), From domain aligned with SPF or DKIM, one-click unsubscribe (List-Unsubscribe + List-Unsubscribe-Post, RFC 8058) plus visible unsubscribe link for marketing/subscribed mail. Guideline: keep spam < 0.10%, never ≥ 0.30%. DKIM key ≥ 1024 bits, 2048 recommended — [Gmail email sender guidelines](https://support.google.com/a/answer/81126).
- [PLATFORM — Gmail] Bulk-sender status is permanent once reached ("doesn't have an expiration date"); transactional messages (e.g. password reset) are excluded from one-click unsubscribe; one-click unsubscribe deadline 1 June 2024; from November 2025 Gmail is "ramping up its enforcement" with temporary and permanent rejections of non-compliant traffic — [Gmail sender guidelines FAQ](https://support.google.com/a/answer/14229414).
- [PLATFORM — Yahoo] All senders: SPF or DKIM, spam rate < 0.3%, valid forward/reverse DNS, RFC 5321/5322. Bulk senders: SPF and DKIM, DMARC at least `p=none` that passes, relaxed alignment acceptable, one-click unsubscribe (RFC 8058 POST recommended), visible unsubscribe link, honour unsubscribes within 2 days; enforcement rolled out from Feb 2024 — [Yahoo Sender Hub best practices](https://senders.yahooinc.com/best-practices/).
- Microsoft Outlook.com reportedly applies similar bulk rules with `550 5.7.515` rejections — [Red Sift guide](https://redsift.com/guides/bulk-email-sender-requirements) (secondary; Microsoft primary source not read — UNVERIFIED).

### Inferences
- **Smallest acceptable (solo):**
  - Contact: a support email on the website, in-app "Help/Contact" (Apple 1.5), and an FAQ page; a stated response target (e.g. within 2 business days) — the target value is a judgement, not sourced.
  - Pages: Terms of Service, Privacy Policy, a public pricing page that lists free vs paid features, price, billing period, auto-renewal and how to cancel; a refund policy page for web payments (mobile refunds follow the stores).
  - Account: in-app + web deletion; data export on request (manual is OK at pilot scale).
  - Email: send from a custom domain via a reputable provider (not a personal Gmail SMTP — the project's own open question on "personal-Gmail SMTP viability"), with SPF + DKIM (2048-bit) + DMARC `p=none` with reporting, aligned From domain, PTR/TLS handled by the provider, transactional mail (OTP/reset) separated from any marketing mail. Do this even below 5,000/day, because the all-sender rules already require SPF or DKIM and < 0.3% spam, and the extra steps are cheap.
- **Mature company:** help-desk tool with SLAs, in-app chat, self-serve data export, DMARC at `p=reject`, BIMI, dedicated IPs.

### Gaps
- No authoritative source found for what response time paying consumer-app users expect (vendor surveys only; not used).
- Google Play's developer contact-information requirement was not fetched (believed to require a contact email — UNVERIFIED).
- Apple's official refund-handling documentation not retrieved.

## 7. Content and IP — licensing risk for word lists, definitions, example sentences, audio; copyright of AI-generated text

### Takeaway
CEFR-J Wordlist v1.6 may be used commercially free of charge **with proper acknowledgement**, and may be modified
into another list if properly cited (Tono Laboratory, TUFS, keeps copyright; paid consultation for supervision
services; no warranty). The Octanove C1/C2 extension is CC BY-SA 4.0 (share-alike). Wiktionary is CC BY-SA 4.0 + GFDL
(commercial OK, but attribution + share-alike on adaptations). Princeton WordNet allows commercial use with its
copyright notice; Open English WordNet is CC BY 4.0. No reuse licence was found for Oxford 3000/5000, Oxford Learner's
Dictionaries content or Cambridge's English Vocabulary Profile — treat them as all-rights-reserved. Purely AI-generated
text is not copyrightable in the US and, from 1 Apr 2026, not in Vietnam without a significant human creative
contribution; providers like Google do not claim ownership of outputs.

### Cited Findings
- [RULE — licence terms] CEFR-J Wordlist (Version 1.6): usable for research and commercial purposes with proper acknowledgement of the source; free of charge for research, education and commercial use with proper citation; consult in advance (costs charged) for commercial work involving supervision or similar services; copyright belongs to Tono Laboratory, Tokyo University of Foreign Studies; modifying it to create another wordlist is allowed but it must be properly cited; citation format includes "Compiled by Yukio Tono, Tokyo University of Foreign Studies" (JP format: 『CEFR-J Wordlist Version 1.6』 東京外国語大学投野由紀夫研究室, URL, download date); provided free with no liability, may contain errors; redistribution not addressed — [CEFR-J download page](https://www.cefr-j.org/download.html).
- [RULE — licence terms] The Open Language Profiles redistribution states CEFR-J vocabulary and grammar profiles are free for research and commercial use with proper citation; the Octanove C1/C2 extension is under CC BY-SA 4.0 — [openlanguageprofiles/olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj).
- [RULE — licence terms] Wiktionary original text is dual-licensed CC BY-SA 4.0 and GFDL; reusers must attribute and license adaptations under the same/compatible licence; GFDL route needs authorship acknowledgement and access to the wiki text (link back); externally sourced material inside entries may carry other terms — [Wiktionary:Copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) (page flagged as outdated; licence statements are the core terms). Wikimedia terms: CC BY-SA 4.0 permits commercial use if terms are followed — [Wikimedia content reuse](https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse).
- [RULE — licence terms] Creative Commons: a **collection** (separate works assembled, each distinguishable) is not an **adaptation**; ShareAlike binds adaptations; the line can be subjective — [CC Certificate 4.4 Remixing](https://certificates.creativecommons.org/cccerteducomments/chapter/4-4-remixing-cc-licensed-work/); [CCGA LibGuide](https://libguides.ccga.edu/CC/adaptations) (secondary; official CC FAQ not retrieved).
- [RULE — licence terms] Princeton WordNet: may be used in commercial applications; use, copy, modify, distribute for any purpose without fee provided the copyright notice and disclaimer are kept on all copies; Princeton's name may not be used in advertising; Princeton advises legal review for commercial use; notice text "WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved." — [WordNet: License and Commercial Use](https://wordnet.princeton.edu/node/10) (page returned 403 to direct fetch; content from the search index snippet of that page and the mirrored licence at [mankier wnlicens(7)](https://www.mankier.com/7/wnlicens)).
- [RULE — licence terms] Open English WordNet is released under CC BY 4.0 — [Oxford Text Archive record, 2024 version](https://ota.ox.ac.uk/llds/xmlui/handle/20.500.14106/2571-2024); [en-word.net](https://en-word.net/lemma/wn).
- Oxford 3000 list is © Oxford University Press (updated Jan 2019); no reuse terms found — [Oxford Learner's Dictionaries Oxford 3000](https://www.oxfordlearnersdictionaries.com/wordlist/english/oxford3000/) (terms-of-use page returned 403; UNVERIFIED).
- Cambridge English Vocabulary Profile: run by Cambridge University Press and Cambridge English; licensed commercial use appears to happen via partnerships (e.g. Text Inspector); Cambridge dictionary data licensing via a request form — [Text Inspector EVP](https://textinspector.com/help/lexis-evp/); [Cambridge Dictionary API blog](https://dictionary-api.cambridge.org/index.php/blog/99-english-profile-levels) (no terms found; UNVERIFIED).
- [RULE — licence terms] Lingua Libre pronunciation recordings (uploaded to Wikimedia Commons) are CC BY-SA 4.0 — [Lingua Libre (Wikipedia)](https://en.wikipedia.org/wiki/Lingua_Libre). Forvo commercial/API terms: not found.
- [RULE — US] US Copyright Office Part 2 report (29 Jan 2025): AI outputs are protectable only where a human author determined sufficient expressive elements; prompts alone are not enough; human arrangement/modification of output or human work perceptible in the output can be protected; no new legislation needed — [Copyright Office NewsNet 1060](https://copyright.gov/newsnet/2025/1060.html); [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/us-copyright-office-releases-part-2-of-artificial-intelligence-report-clarifying-copyrightability-of-generative-ai-outputs).
- [RULE — Vietnam] Amended IP Law 131/2025/QH15 (passed 10 Dec 2025, effective 1 Apr 2026) recognises AI matters for the first time; Decree 134/2026 (new Art. 5a) gives copyright to AI-assisted works only with a significant and decisive human creative contribution; purely AI-generated works get no copyright; a person who only supplies prompts is not the author but may still use and commercially exploit the output — [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-amends-intellectual-property-law-key-changes-for-businesses.html); [Conventus Law](https://conventuslaw.com/featured-content/artificial-intelligence-ai-and-vietnams-amended-ip-law-importance-of-the-human-factor/); [Rajah & Tann](https://www.rajahtannasia.com/viewpoints/vietnams-intellectual-property-framework-enters-a-new-era-advanced-international-standards-ai-governance-and-specialised-ip-adjudication/) (secondary; decree text not read).
- [PLATFORM — Google] Gemini API: Google won't claim ownership of generated content but may generate the same or similar content for others; you're responsible for your use of generated content and must comply with laws that may require attribution — [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms).

### Inferences
- **Smallest acceptable (solo):** keep a "data sources & licences" register (source, version, licence, attribution text, where shown); show a credits/attributions page in app and web (CEFR-J citation in the required format; WordNet notice; CC BY/BY-SA credits); keep CC BY-SA content (Wiktionary definitions, Octanove C1/C2, Lingua Libre audio) **separate and per-item attributed** so the product is a collection, and release any adapted BY-SA text under BY-SA; do **not** copy Oxford/Cambridge definitions, example sentences, audio or level tags without a written licence; write or AI-generate own definitions/examples and have a human edit them (which also helps copyright under the Vietnam rule). For CEFR-J specifically, email Tono Lab with the commercial use description for written confirmation (cheap insurance; their page invites consultation for supervision-type services).
- AI-generated sentences are likely not protectable as such, so competitors could copy them; human editing/curation of the published catalogue is what creates protectable value (inference from the US and Vietnam rules).
- **Mature company:** licensed dictionary data (paid OUP/Cambridge/Collins licences), legal review, contributor licence agreements.

### Gaps
- Oxford Learner's Dictionaries and Cambridge EVP terms of use not retrieved (403/404).
- Forvo and TTS-provider audio output licences not researched.
- Whether the CEFR-J "no redistribution statement" permits shipping the full list inside a paid app download (vs. using it internally) is not addressed on the official page.
- Anthropic and OpenAI output-ownership terms were not fetched this session.

## 8. AI features — safeguards for AI-generated learning content; provider terms (commercial use, users under 18); disclosure; cost caps

### Takeaway
The recognised baseline is the OWASP Top 10 for LLM Applications 2025 (misinformation, improper output handling,
prompt injection, unbounded consumption) plus provider rules. Provider terms differ sharply on minors: Google's Gemini
API forbids use in apps "likely to be accessed" by under-18s; Anthropic allows it but its minors guidelines require
telling users they are talking to an AI and recommend age verification, moderation and monitoring; OpenAI's consumer
terms allow 13–17 with parental permission (API-specific minors policy not verified). Vietnam's AI Law (in force
1 Mar 2026) requires notifying the public when AI-generated content could cause confusion about real events or
persons and machine-readable labels on AI audio/image/video. Smallest acceptable: rule-based validation + human review
before AI content enters the shared catalogue, a visible "AI-generated" label, a report button, per-user quotas and a
provider-side monthly spend cap.

### Cited Findings
- [BEST PRACTICE] OWASP Top 10 for LLM Applications 2025: LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain, LLM04 Data and Model Poisoning, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector and Embedding Weaknesses, LLM09 Misinformation, LLM10 Unbounded Consumption; prior edition v1.1 dated 11 Apr 2024; no 2026 edition listed — [OWASP GenAI LLM Top 10](https://genai.owasp.org/llm-top-10/).
- [BEST PRACTICE] OWASP API4:2023 treats missing spending limits on paid third-party APIs as a vulnerability — [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).
- [PLATFORM — Anthropic] Usage Policy (page fetched 19/10/2026 shows effective date 12 Nov 2026, i.e. an announced upcoming version): products that let minors (under 18) interact with API-built products must follow additional guidelines and law; consumer-facing chatbots must disclose they are AI at least at the start of each session or in the interface; "Education and credentials" is a high-risk area only for admissions, exam grading that determines admission/graduation/licensure, misconduct and suspension decisions — those need qualified human review and AI disclosure — [Anthropic Usage Policy](https://www.anthropic.com/legal/aup).
- [PLATFORM — Anthropic] Guidelines for organisations serving minors: organisations **must disclose** to users that they interact with an AI system; recommended measures: age verification, content moderation/filtering, monitoring and reporting, educational guidance for minors, Anthropic's child-safety system prompt; comply with child-safety/privacy laws and state compliance publicly; no prior approval required, but Anthropic audits and may suspend accounts with high violation rates — [Anthropic support: serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors).
- [PLATFORM — Anthropic] Spend limits are monthly caps at organisation level, with optional lower per-workspace limits; usage tiers rise automatically — [Anthropic rate limits docs](https://docs.anthropic.com/en/api/rate-limits); [Anthropic spend limits API reference](https://platform.claude.com/docs/en/api/cli/beta/organization/spend_limits/set.md).
- [PLATFORM — Google] Gemini API (effective 23 Mar 2026): users must be 18+, and the API may not be used in an app "directed towards or is likely to be accessed by" individuals under 18; free tier data may be used for product improvement and human-reviewed; EEA/CH/UK apps must use paid services — [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms).
- [PLATFORM — OpenAI] OpenAI consumer terms: minimum age 13, under-18s need parent/guardian permission (per ConductAtlas tracker of OpenAI terms; a 26 May 2026 change reportedly removed parental-liability wording) — [ConductAtlas: OpenAI Terms of Use](https://conductatlas.com/platform/openai/openai-terms-of-use/age-restriction-and-parental-consent/) (third-party tracker; openai.com usage-policies page returned 403 — API/developer minors rules UNVERIFIED).
- [PLATFORM — Apple] AI content-creation apps fall under 1.2 UGC rules (filtering, reporting with timely response, blocking, contact info); data shared with third-party AI needs disclosure and explicit permission (5.1.2(i)) — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- [RULE — Vietnam] Law on Artificial Intelligence No. 134/2025/QH15 (passed 10 Dec 2025, effective 1 Mar 2026): providers must add machine-readable markers to AI-generated audio, images and video; deployers must clearly notify the public when AI-created/edited text, audio, images or video could cause confusion about the authenticity of events or persons; details via government decrees; AI systems already operating before the effective date get 12 months (18 months for health, education, finance) — [Rajah & Tann](https://www.rajahtannasia.com/viewpoints/new-law-on-artificial-intelligence-takes-effect-on-1-march-2026/); [Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/02/vietnam-artificial-intelligence-law-foundation-and-outlook) (secondary; law text and decrees not read).
- [RULE — EU, only if serving EU users] AI Act Art. 50 transparency obligations apply from 2 Aug 2026 and were not delayed by the Digital Omnibus (Regulation (EU) 2026/1744); legacy generative systems got until 2 Dec 2026 for Art. 50(2) machine-readable marking — [McCann FitzGerald](https://www.mccannfitzgerald.com/knowledge/technology-and-innovation/one-month-to-go-eu-ai-act-transparency-compliance); [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force) (secondary; sources partly conflict on wording).
- [RESEARCH] L2 learners preferred GenAI example sentences over corpus examples in most of 400 pairwise comparisons, but GenAI also produced unsuitable sentences; authors propose a hybrid (GenAI rewrites authentic corpus examples) — [Degraeuwe & Goethals, SLTC 2024](https://ecp.ep.liu.se/index.php/sltc/article/view/1042).
- [RESEARCH] OxfordEval (NAACL 2024): automatic win-rate metric against Oxford dictionary examples aligned with human judgement; best model > 85.1% win rate vs 39.8% for prior generated sentences — [arXiv 2404.06224](https://arxiv.org/html/2404.06224v1). LLM dictionary examples degrade for lower-resourced languages and human raters disagree a lot — [Merx et al., arXiv 2410.03182](https://arxiv.org/pdf/2410.03182v1).

### Inferences
- **Provider choice is constrained by audience age:** Vietnamese English learners include high-school students; Gemini API terms rule it out for an app likely used by under-18s unless the app enforces 18+. Anthropic is usable with AI disclosure + moderation; OpenAI needs its developer terms checked. This is a material input to the still-open AI-provider choice (project CLAUDE.md: "no provider is chosen yet").
- **Smallest acceptable (solo):**
  - Accuracy: AI sentences pass deterministic checks (target word/inflection present — already the project's rule-based grading design, length, banned-word list, profanity filter) and, for anything entering the shared catalogue, a human (editor) approval step; learner-facing generated items carry a "Báo lỗi / Report" button and an "AI-generated" label (Apple 1.2, Anthropic disclosure, Vietnam AI-law spirit).
  - Safety: provider moderation endpoint or a second-pass classifier on output; never render AI output as HTML (LLM05 / ASVS V3.2.2); no user personal data in prompts.
  - Cost: per-user and per-day quotas in the app (entitlements module), a global daily cap (ER14 in project specs), **and** a provider-side monthly spend limit, plus an alert at e.g. 50%/80% (OWASP API4/LLM10).
  - Disclosure: state AI use in the ToS/privacy policy and in the UI.
- **Mature company:** evaluation sets with measured error rates per release, red-teaming, model-version pinning with regression tests, human QA sampling of generated content.

### Gaps
- OpenAI usage-policies page (403) and OpenAI API minors rules not read.
- Vietnam AI Law implementing decrees on labelling text (vs audio/image/video) not found; whether a vocabulary-practice sentence "could cause confusion about authenticity" is a legal question for the legal track.
- No controlled study found on vocabulary gains from LLM-generated vs human-written example sentences.

## 9. EdTech-specific quality expectations — evidence of learning effectiveness (spaced repetition), retention metrics

### Takeaway
Spaced (distributed) practice and practice testing are the two learning techniques with the strongest evidence
(Dunlosky et al. 2013 "high utility"; Cepeda et al. 2006 meta-analysis), so a spaced-review claim is defensible in
general terms — but a claim that *this app* improves retention needs the app's own data. Education apps have some of
the lowest retention of any category (Day-30 roughly 2–3% in vendor benchmarks, vs ~5–7% cross-category), so D1/D7/D30
retention and review-completion rates are the metrics to track from the pilot.

### Cited Findings
- [RESEARCH] Cepeda et al. (2006), Psychological Bulletin: meta-analysis of 839 assessments from 317 experiments in 184 articles on distributed practice in verbal recall; the inter-study interval that maximises retention grows as the retention interval grows — [PubMed 16719566](https://pubmed.ncbi.nlm.nih.gov/16719566/); [USF Digital Commons](https://digitalcommons.usf.edu/psy_facpub/1771/).
- [RESEARCH] Dunlosky et al. (2013) rated distributed practice and practice testing as high-utility techniques; Donoghue & Hattie's 2021 meta-analysis of those ten techniques also found distributed practice and practice testing most effective, with practice testing even better when spaced; caveat: most studies measured surface/factual outcomes — [Donoghue & Hattie 2021, Frontiers in Education](https://www.frontiersin.org/articles/10.3389/feduc.2021.581216/full).
- A secondary summary claims spaced study gave ~10% better recall than massed study across 254 studies (figures conflict with the journal abstract; do not reuse) — [Digital Promise](https://digitalpromise.org/2015/02/07/five-learning-strategies-that-work/).
- [RESEARCH — market, secondary] Education apps: Day 1 retention ~14–15%, Day 30 ~2–3% (attributed to Business of Apps) — [Passion.io benchmarks](https://passion.io/blog/mobile-app-retention-benchmarks-for-creators-course-coaching-apps); Day-30 ~2% for Education — [Educational App Store](https://www.educationalappstore.com/blog/education-app-market). OneSignal 2024 reported education D30 of 8.02% (methodology differs; conflict noted) — via [Passion.io](https://passion.io/blog/mobile-app-retention-benchmarks-for-creators-course-coaching-apps). Cross-industry 2025–2026 averages: ~25–26% D1, 11–13% D7, 5–7% D30 — [Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/) (secondary aggregation of Adjust/AppsFlyer/Statista).

### Inferences
- **Smallest acceptable (solo):** marketing copy says "uses spaced repetition, a method backed by decades of memory research" with a link to sources — not "learn 2× faster" or "remember 90%" without own data; instrument the pilot to measure D1/D7/D30 retention, share of due reviews completed, and recall accuracy on reviews at increasing intervals (that is the app's own effectiveness evidence); pilot success thresholds (open item Q-D in project docs) can be benchmarked against the ~2–3% education D30 figure. **Mature company:** controlled efficacy studies (A/B on scheduling algorithm), published efficacy reports, third-party evaluation.
- Advertising-claim substantiation is a legal question in Vietnam (consumer protection/advertising law) — not researched here.

### Gaps
- No primary (first-party) education-category retention report was retrieved; numbers are vendor-blog aggregations.
- No source found on what Vietnamese learners or app reviewers specifically expect as "evidence of effectiveness".
- Duolingo-style published efficacy studies (e.g. half-life regression paper) were not fetched.
