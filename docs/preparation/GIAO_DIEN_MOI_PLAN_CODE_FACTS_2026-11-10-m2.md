# Code facts for M2 "Đăng nhập và tài khoản" (giao diện mới), 10/11/2026

Source: local branch `feat/giao-dien-moi-m1` tip `74f91328`, read with `git show` (working tree not used). Read-only survey.
Path shorthand (all under `apps/web/`):
- `R/` = `src/app/[locale]/app/`
- `A/` = `src/features/learner/auth/`
- `S/` = `src/` (so `S/ui/Button.tsx` = `apps/web/src/ui/Button.tsx`)
Line numbers are lines of that file on the M1 branch.

## 1. Routes

### 1.1 Route tree (auth-related)

| URL | File | Group / layout chain |
|---|---|---|
| `/app/login` | `R/(auth)/login/page.app.tsx` | `layout.app.tsx` -> `(auth)/layout` (AuthGate -> CardFrame) |
| `/app/register` | `R/(auth)/register/page.app.tsx` | same |
| `/app/verify-email` | `R/(auth)/verify-email/page.app.tsx` | same |
| `/app/forgot-password` | `R/(auth)/forgot-password/page.app.tsx` | same |
| `/app/reset-password` | `R/(auth)/reset-password/page.app.tsx` | same |
| `/app/google/complete` | `R/(auth)/google/complete/page.app.tsx` | same |
| `/app/account-deleted` | `R/(auth)/account-deleted/page.app.tsx` | same |
| `/app/complete-profile` | `R/(member)/(onboarding)/complete-profile/page.app.tsx` | `layout` -> `(member)/layout` (RequireSession + HouseAd + AdsenseLoader) -> `(onboarding)/layout` (CardFrame) |
| `/app/welcome` | `R/(member)/(onboarding)/welcome/page.app.tsx` | same |

Count: 7 routes in `(auth)`, 2 in `(member)/(onboarding)` = 9 (matches design §9 M2 table). There are NO `(split)` or `(card)` subgroups yet: `(auth)` has exactly `layout.app.tsx`, `error.app.tsx`, and the 7 route folders (git ls-tree).

### 1.2 Files

- `R/layout.app.tsx:1-25` (root of learner app): `metadata = { robots: { index:false, follow:false } }` (l.9); `await connection()` (l.13, per-request render for CSP nonce); injects `THEME_SCRIPT` (l.17); `<AppIntl><AppProviders><div className="min-h-dvh bg-canvas text-ink">{children}</div></AppProviders></AppIntl>` (l.18-22). Note: old token classes `bg-canvas text-ink`.
- `R/(auth)/layout.app.tsx:5-7`: `return <AuthGate>{children}</AuthGate>`. No metadata, no `dynamic`.
- `R/(auth)/error.app.tsx:1-9`: `'use client'`, renders `<ErrorView retry={retry} />` (from `@/app-chrome/ErrorView`).
- `login/page.app.tsx:5-11`, `register/page.app.tsx`, `forgot-password/page.app.tsx`, `reset-password/page.app.tsx`, `verify-email/page.app.tsx`: `<Suspense><XForm /></Suspense>` (LoginForm / RegisterForm / ForgotPasswordForm / ResetPasswordForm / VerifyEmailForm).
- `google/complete/page.app.tsx:4-6`: `<GoogleComplete />` (no Suspense).
- `account-deleted/page.app.tsx:4-10`: `<Suspense><AccountDeleted /></Suspense>`.
- `(onboarding)/complete-profile/page.app.tsx:5-11`: `<Suspense><CompleteProfile /></Suspense>`.
- `(onboarding)/welcome/page.app.tsx:5-11`: `<Suspense><WelcomeLanguage /></Suspense>`.
- `(member)/layout.app.tsx:11-21`: `RequireSession` wraps `{children}` + `<HouseAd />` + `<AdsenseLoader nonce>`; nonce from `headers()` CSP.
- `(member)/(onboarding)/layout.app.tsx:5-7`: `<CardFrame>{children}</CardFrame>`.
- `(member)/(onboarding)/error.app.tsx`: same `ErrorView` as `(auth)/error`.
- No page in these 9 has `generateMetadata`, `export const metadata`, or `export const dynamic` (grep of the files above; only the root `layout.app.tsx` has `metadata`). Page extension `.app.tsx` per D21.

## 2. `features/learner/auth/*` components

Common: every component is `'use client'`; every form uses `useSubmitOnce` (`S/app-shell/use-submit-once.ts:17`, returns `{submit, busy}`, ignores presses while busy, keeps an Idempotency-Key per press), `useErrorMessage` (`S/app-shell/api/use-error-message.ts:37`), `useSession` (`{state, store}`), and `AuthCard`. `<form noValidate>` everywhere except WelcomeLanguage (`WelcomeLanguage.tsx:46` has no `noValidate`). All submit buttons: `<Button type="submit" variant="sticker" size="lg" isPending={busy} isDisabled={...}>` from `@/app-ui/Button`.

### 2.1 AuthCard.tsx (exports `AuthCard`, `FormError`, `PasswordRule` type, `passwordViolations`, `PasswordRules`, `GoogleButton`)
- `AuthCard({title, intro?, onBack?, banner?, children})` (l.11-45): `<section className="flex flex-col gap-4 rounded-card bg-surface p-6 shadow-sheet md:p-8">`; optional back `<button type="button">` with `ArrowLeft` icon and `t('back')` (l.27-36, namespace `App.auth`); `<h1 className="text-title-lg font-bold text-ink">` (l.38); intro `<p className="text-ui text-muted">` (l.39). OLD tokens (`rounded-card`, `shadow-sheet`, `text-title-lg`, `text-ui`, `text-muted`, `text-primary`).
- `FormError({message})` (l.48-55): `<p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-ui text-danger">`; null if no message.
- `PASSWORD_RULES` (l.57) = `min_length, max_length, uppercase, lowercase, digit, special, same_as_current`. `passwordViolations(error)` (l.61-64): only for `ApiError` with `problem.slug === 'validation-failed'`, filters `problem.violations` to known rules.
- `PasswordRules({rules})` (l.66-76): `<ul role="alert">` of `<li>{t(rule)}</li>`, namespace `App.auth.passwordRules`.
- `GoogleButton({next})` (l.82-100): see section 5. Plain `<button type="button">` (NOT react-aria), classes `min-h-control-touch ... rounded-inner border border-border-strong bg-surface ...` (old tokens), `GoogleMark` inline 4-path SVG (l.103-111).

### 2.2 AuthGate.tsx - see section 3.

### 2.3 LoginForm.tsx (export `LoginForm`, no props)
- Imports (l.3-20): `lucide-react Lock`; `next/link`; `next/navigation useRouter/useSearchParams`; `@/app-shell/*` (problem, use-error-message, locale-prefix `safeNext`, navigate `hardReplace`, session/pending-email `setPendingPassword, writePendingEmail`, session-context, session-store `Notice` type, use-submit-once, use-turnstile); OLD UI: `@/app-ui/Button`, `@/app-ui/TextField`; `./AuthCard`.
- State: email, password, `locked` (init from `?error=account-locked`, l.43), `error`.
- API: `store.login(email.trim(), password, bot.token!)` (l.50) -> `POST /v1/auth/login` body `{email, password, turnstile_token?, client:'web', device_label:'Wordmet Web'}` (`session-store.ts:133-134`, `DEVICE`; body shape asserted in `A/auth.test.tsx:83-87` for register, login analog).
- Turnstile: `const bot = useTurnstile()` (l.46); button disabled while `bot.token === null` (l.121); `bot.reset()` on any failure (l.53); `if (bot.token === null) return` (l.61); `{bot.widget}` rendered between the forgot link and `FormError` (l.119).
- Success: `hardReplace(safeNext(params.get('next'), locale))` (l.56).
- Errors (l.66-74): `ApiError.problem.slug === 'email-not-verified'` -> `writePendingEmail(email.trim())`, `setPendingPassword(password)`, `router.replace('/{locale}/app/verify-email?reason=login[&next=<encoded>]')`; slug `account-locked` -> `setLocked(true)` (renders red box `role="alert"` with `Lock` icon, `login.lockedTitle`/`lockedBody`, l.91-99); else `setError(errorText(failure))` (generic mapping via `App.errors.<slug>`, `invalid-credentials` -> "Email hoặc mật khẩu chưa đúng.").
- Return-from-Google `?error=` (l.23, 120): one of `google-failed|google-unavailable|google-busy|google-email-unverified` shown through `tErrors(returned)` (namespace `App.errors`) inside `FormError`; `account-locked` shows the box; any other value shows nothing (test `auth.test.tsx:517-525`).
- Info banner `role="status"` (l.100-109): `?reset=1` -> `login.passwordReset`; else `state.notice` (`expired|rate-limited|logout-failed`, `NOTICE_KEY` l.25-29) or `?reason=expired|rate-limited` -> `login.expired|rateLimited|logoutFailed`; for `logout-failed` a `Button variant="quiet"` `login.retryLogout` -> `store.retryLogout()`.
- Fields: `TextField label=t('email') type="email" autoComplete="email" spellCheck={false}`; `TextField label=t('password') type="password" autoComplete="current-password"` (l.114-115). No password reveal.
- Forgot link (l.116): `<Link href="/{locale}/app/forgot-password" className="-mt-5.5 -mb-3.5 w-fit py-3.5 ...">` (negative margins to keep 44 px hit area; e2e `landing.spec.ts:832-833` asserts height >= 44 at 390 px).
- Bottom: `<GoogleButton next={safeNext(next, locale)} />` (l.124); "no account" paragraph with link to `/{locale}/app/register`.
- i18n keys read: `App.auth.{email,password,login.title,login.submit,login.forgot,login.noAccount,login.register,login.lockedTitle,login.lockedBody,login.expired,login.rateLimited,login.logoutFailed,login.retryLogout,login.passwordReset}` + `App.auth.google` (via GoogleButton, `t('auth.google')` from `App`) + `App.errors.google-*` + generic `App.errors.*` through `useErrorMessage`.

### 2.4 RegisterForm.tsx (export `RegisterForm({today?: string})`)
- OLD UI imports (l.14-17): `@/app-ui/Button`, `@/app-ui/Checkbox`, `@/app-ui/DateOfBirthField`, `@/app-ui/TextField`.
- Fields: givenName (`maxLength 50`, required check), familyName (optional, `maxLength 50`), `DateOfBirthField` (`label register.birthDate`, `description register.birthDateHint`, `serverError='tooYoung'` when `errors.age`), email (type email; on `errors.email` a `Link` to forgot-password appears, l.128-132), password (`type="password" autoComplete="new-password"`, `description=register.passwordHint` unless password rule errors, l.140), `<PasswordRules rules={errors.password}/>`, `Checkbox` with `t.rich('register.consent', {terms, privacy})` (links to `/{locale}/terms`, `/{locale}/privacy`, `target="_blank"`, l.143-145), `{bot.widget}`, `FormError`, submit, `t('or')` paragraph, `GoogleButton next={`/${locale}/app`}`, "have account" link.
- No "Nhập lại mật khẩu" (confirm) field exists.
- Validation: client side only `givenName.trim()` non-empty (l.63-66 -> `register.givenNameRequired`); password strength is server-only (`validation-failed` + `violations`). The min length shown to the user is text only (`register.passwordHint` "Tối thiểu 8 ký tự, ..."; rule key `min_length` "Cần ít nhất 8 ký tự."). Birth date: `DateOfBirthField` returns null unless a valid 13+ date (`S/app-ui/date-of-birth.ts`).
- Submit disabled while `!consent || birthDate === null || !store || bot.token === null` (l.148).
- API: `store.register({given_name, family_name?, birth_date, email, password, timezone: deviceTimezone(), accept_terms: true, turnstile_token})` (l.40-49) -> `POST /v1/auth/register` + `client:'web', device_label:'Wordmet Web'` (`session-store.ts:148-149`). Returns `{email}`.
- Success: `writePendingEmail(registered.email)`, `setPendingPassword(password)`, `router.replace('/{locale}/app/verify-email')` (client-side nav; password never in URL) (l.55-57).
- Errors (l.70-79): `bot.reset()` in catch (l.52); slug `email-taken` + `problem.extensions.reason === 'account-deleting'` -> email field error `register.accountDeleting`; `email-taken` -> email field error `errorText` ("Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu."); `age-below-minimum` -> `errors.age` (DOB field shows `App.ui.dob.tooYoung`); `validation-failed` with violations -> `PasswordRules`; else `FormError`.
- Keys: `App.auth.{email,password,or,register.{title,subtitle,givenName,familyName,birthDate,birthDateHint,passwordHint,consent,submit,haveAccount,login,givenNameRequired,accountDeleting}, login.forgot, passwordRules.*}`, `App.ui.dob.*` (via DateOfBirthField).

### 2.5 VerifyEmailForm.tsx (export `VerifyEmailForm`, no props) - see also section 6
- OLD UI: `@/app-ui/Button`, `@/app-ui/Toast` (`showToast`; that file just re-exports `@/ui/Toast`, `S/app-ui/Toast.tsx:2`), `@/app-ui/TextField`.
- Source of email: `readPendingEmail()` (sessionStorage key `wordmet-web.pending-email`, `S/app-shell/session/pending-email.ts:1`), password: module variable `readPendingPassword()` (memory only). Missing -> `TextField` for email (type email) and/or password (`autoComplete="current-password"`) are shown (l.159-164).
- API verify: `store.verifyEmail(email, digits.join(''), password)` (l.88) -> `POST /v1/auth/verify-email {email, code, password, client, device_label}` (`session-store.ts:155-156`); no turnstile on this call (test `auth-turnstile.test.tsx:174-182`).
- API resend: `createApiClient({send: store.send}).post('/v1/auth/otp', {purpose:'verify_email', email, turnstile_token: bot.token})` (l.114), then `bot.reset()` in `finally` (l.117), `setResendAt(now+60s)`, `showToast(t('verify.resent'),'success')` (l.121).
- Errors (l.100-107): slug `invalid-otp` -> `verify.wrongCode`; status 429 -> `verify.locked` with `{time: waitText(retryAfterSeconds ?? 60, locale)}` (Intl.NumberFormat unit, `waitText` l.28-31); else `errorText`.
- Success: `clearPendingEmail()`; `hardReplace(destination(me))` where destination = `safeNext(next, locale)` if `me.native_language` else `/{locale}/app/welcome[?next=<encoded safeNext>]` (l.62-63, 93-94).
- Other tab signed in: effect on `state` (l.69-77) -> `clearPendingEmail(); hardReplace(destination(state.me))` unless the page opened signed in (`firstStatus`) or `submitting.current`.
- Leaving page clears memory password: `useEffect(() => () => clearPendingPassword(), [])` (l.66).
- `<AuthCard title=verify.title intro={...} onBack={() => router.back()}>`; intro = `verify.bodyNoEmail` (no pending email) / `verify.loginBody {email}` (`?reason=login`) / `verify.body {email}`.
- Submit: `isDisabled={!complete || !store || !email || !password}` (l.198); label `verify.submit`.
- Turnstile: `useTurnstile()` is used ONLY for resend (l.111); `{bot.widget}` rendered in the form (l.196); resend button disabled when `resendPress.busy || !email || bot.token === null` (l.189).
- Keys: `App.auth.{email,password,back,verify.{title,body,digit,resendIn,resend,submit,resent,bodyNoEmail,loginBody,wrongCode,locked}}`.

### 2.6 ForgotPasswordForm.tsx (export `ForgotPasswordForm`, no props)
- OLD UI: `@/app-ui/Button`, `@/app-ui/TextField`.
- API: `POST /v1/auth/otp {purpose:'reset_password', email: email.trim(), turnstile_token: bot.token}` via `createApiClient({send: store.send})` (l.30). `bot.reset()` on failure (l.32).
- Success: `writePendingEmail(email.trim())`; `hardReplace('/{locale}/app/reset-password')` (l.36-37). No error mapping beyond `errorText`.
- `intro = params.get('reason') === 'change-password' ? forgot.mustChange : forgot.body` (l.52); `onBack={() => hardReplace('/{locale}/app/login')}`.
- Submit disabled: `!store || !email.trim() || bot.token === null`.
- Keys: `App.auth.{email,back,forgot.{title,body,submit,mustChange}}`.

### 2.7 ResetPasswordForm.tsx (export `ResetPasswordForm`, no props; NO Turnstile)
- OLD UI: `@/app-ui/Button`, `@/app-ui/TextField`.
- Fields: optional email `TextField` (only if no pending email, l.56-58), code `TextField label=reset.code inputMode="numeric" autoComplete="one-time-code"` (single text input, no maxLength; `code.replace(/\s/g,'')` before send, l.33), new password (`type="password" autoComplete="new-password"`, `description=reset.hint` unless rule errors), `PasswordRules`, `FormError`. No confirm-password field.
- API: `POST /v1/auth/password/reset {email, code, new_password}` (l.31-35).
- Success: `clearPendingEmail()`; `hardReplace('/{locale}/app/login?reset=1')` (l.36-37).
- Errors: `invalid-otp` -> `errors.code = errorText(failure)` ("Mã xác minh chưa đúng hoặc đã hết hạn."); rule violations -> `PasswordRules`; else `errors.form`.
- Submit disabled: `!store || !email || !code || !password`. `onBack` -> `hardReplace('/{locale}/app/forgot-password')`. No title intro.
- Keys: `App.auth.{email,back,reset.{title,code,newPassword,hint,submit},passwordRules.*}`.

### 2.8 GoogleComplete.tsx (export `GoogleComplete({today?})`)
- OLD UI: `@/app-ui/Button`, `Checkbox`, `DateOfBirthField`, `TextField`; `AuthCard, FormError, GoogleButton`.
- Builds its own `api = createApiClient({send: (path, init) => fetch(apiBaseUrl()+path, {...init, headers:{..., 'X-CSRF-Protection':'1'}})})` (l.34-39) - plain `fetch` with the ticket cookie, NOT `store.send` (so an expired-ticket 401 does not sign anyone out).
- On mount `GET /v1/auth/google/complete` -> `{email, needs_name}`; 401 -> state `expired`, other error -> `error` (l.48-60). States: `loading` (card with "…" l.94), `expired` (title `googleComplete.expiredTitle`, intro `expiredBody`, `GoogleButton next=/{locale}/app`), `error` (FormError), `ready`.
- Ready form: if `needs_name` given/family name fields (`maxLength 50`); `DateOfBirthField`; consent `Checkbox` (same `register.consent` rich text); `FormError`; if `tooYoung` a `Link` to `/{locale}/app/login` (`googleComplete.toLogin`); submit `googleComplete.submit`, disabled `!store || birthDate === null || !consent || (needsName && givenName.trim()==='')`.
- Submit: `POST /v1/auth/google/complete {birth_date, accept_terms:true, timezone, [given_name, family_name?]}` -> `{access_token}`; `store.startFromToken(access_token)`; `hardReplace('/{locale}/app')` (l.63-70).
- Errors: `age-below-minimum` -> `tooYoung` (DOB field `serverError`); 401 -> `expired`; else FormError.
- No Turnstile.
- Keys: `App.auth.{register.{givenName,familyName,birthDate,birthDateHint,consent}, googleComplete.{title,intro,submit,expiredTitle,expiredBody,toLogin}}`.

### 2.9 CompleteProfile.tsx (export `CompleteProfile({today?})`)
- OLD UI: `Button`, `Checkbox`, `DateOfBirthField` (no TextField directly).
- Reads `me` from session: `needsBirth = me?.birth_date === null`; `termsUpdated = me.terms_outdated && me.terms_accepted_at !== null`; `needsTerms = terms_accepted_at === null || terms_outdated` (l.31-34).
- API: `PATCH /v1/me { [birth_date], [accept_terms:true] }` then `store.recheck()` then `hardReplace(safeNext(next, locale))` (l.41-46).
- Errors: `age-below-minimum` -> DOB `serverError`; else FormError. Submit disabled `!store || !me || (needsBirth && birthDate===null) || (needsTerms && !consent)`.
- Title/intro: `complete.updatedTitle/updatedBody` if `termsUpdated`, else `complete.title/body`.
- Keys: `App.auth.{register.{birthDate,birthDateHint,consent}, complete.{title,body,submit,updatedTitle,updatedBody}}`.

### 2.10 WelcomeLanguage.tsx (export `WelcomeLanguage`, no props)
- OLD UI: `@/app-ui/Button`, `@/app-ui/Flag`, `@/app-ui/Select` (items `{id, label, icon: <Flag code/>}` for `vi`, `en`).
- API: `PATCH /v1/me {native_language}`; `store.recheck()`; `hardReplace(safeNext(next, language))` - uses the CHOSEN language as locale (l.28-32).
- Initial value = current URL locale. Keys: `App.auth.welcome.{title,body,language,vi,en,submit}`.

### 2.11 AccountDeleted.tsx (export `AccountDeleted`, no props)
- No API call. `?pending=1` -> `deleteAccount.pendingTitle/pendingBody`, else `doneTitle/doneBody`; one `Link` to `/{locale}/app/login` with `deleteAccount.toLogin` (old link style). Namespace `App.deleteAccount` (not `App.auth`). No test file.

## 3. AuthGate (B8-2 exception)

`A/AuthGate.tsx`:
- l.13: `const OPEN_WHEN_SIGNED_IN = /\/app\/(forgot|reset)-password\/?$/;` - matched against `usePathname()` (l.22). Locale-agnostic (tested for `/vi/...` and `/en/...`).
- l.24-33: `firstStatus` ref holds the first non-`loading` session status; effect redirects only if `state.status === 'signed-in'` AND `firstStatus.current === 'signed-in'` (page opened while signed in); `if (OPEN_WHEN_SIGNED_IN.test(pathname)) return;` (l.31) is the exception; redirect = `hardReplace(safeNext(new URLSearchParams(window.location.search).get('next'), locale))` (l.32).
- l.35: `return <CardFrame>{children}</CardFrame>` - renders children immediately, in every state including `loading` (no spinner/skeleton, no hiding of the form while the session is unknown).
- Imports `CardFrame` from `@/app-chrome/CardFrame` (l.6). So AuthGate currently also owns the frame.
- Tests: `A/AuthGate.test.tsx` (section 7.2).

## 4. Turnstile

- `S/app-shell/use-turnstile.tsx:12-20`: `useTurnstile()` returns `{token: string|null, widget: JSX (<TurnstileWidget ref onToken=setToken/>), reset(): void}`. Imports `TurnstileWidget, TurnstileHandle` from `@/app-ui/TurnstileWidget`.
- `S/app-ui/TurnstileWidget.tsx` (113 lines): exports `FAKE_TURNSTILE_TOKEN = 'fake-turnstile-token'` (l.11), type `TurnstileHandle = {reset(): void}` (l.20), `TurnstileWidget({onToken, ref?})` (l.27). Reads `turnstileSiteKey()` from `@/app-shell/config` (l.5, 29) = `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` trimmed (`S/app-shell/config.ts:10-11`). Blank key: renders `null`, immediately calls `onToken('fake-turnstile-token')` (l.54-57) and `reset()` re-issues the fake token (l.42-45). With key: loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` (l.8, 80-88), renders into a `<div ref>`, options `sitekey, refresh-expired:'auto', callback/expired/error/timeout` (l.61-69); on script error shows `<p role="status" className="text-caption text-muted">` with `App.errors.captcha-unavailable` (l.106-110). Uses OLD token classes. Uses `useTranslations('App.errors')`.
- Importers in `S/` (grep `use-turnstile|TurnstileWidget`): `use-turnstile.tsx` (imports widget); `A/LoginForm.tsx:16`, `A/RegisterForm.tsx:13`, `A/VerifyEmailForm.tsx:15`, `A/ForgotPasswordForm.tsx:12` (hook); tests: `S/app-ui/TurnstileWidget.test.tsx:5`, `A/auth-turnstile.test.tsx:17` (`vi.mock('@/app-ui/TurnstileWidget', ...)`). `ResetPasswordForm`, `GoogleComplete`, `CompleteProfile`, `WelcomeLanguage` do NOT use it.
- Env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (baked at build time; `next.config.ts:5,15` asserts it is set when the learner app is on and the site URL is not local - `S/app-shell/config.ts:18-20`, tests `config.test.ts:43-67`). `apps/web/playwright.config.ts:30` sets it to `1x00000000000000000000AA` for e2e; `e2e/support/mock-api.ts:30-63` answers the Cloudflare script with a stub issuing `'e2e-turnstile-token'` unless `realTurnstile`.
- Design §6 (line ~320) says `TurnstileWidget` moves to `features/learner/auth/` at M2; today it is still `S/app-ui/TurnstileWidget.tsx` (with its test) and the hook is in `S/app-shell/`.

## 5. Google button

- Component: `GoogleButton({next: string})`, `A/AuthCard.tsx:82-100` (plain `<button>`; label `t('auth.google')` = "Tiếp tục với Google"; `GoogleMark` SVG with 4 `<path>`s, `aria-hidden`, l.103-111; test asserts 4 paths `auth.test.tsx:152-159`).
- Navigation: `window.location.assign(new URL('/v1/auth/google/start', apiBaseUrl()))` with search `intent=login&locale=<locale>&next=<next>` (l.90-92). `apiBaseUrl()` from `@/app-shell/config`.
- Used in: LoginForm (`next=safeNext(?next)`), RegisterForm (`next=/{locale}/app`), GoogleComplete expired state (`next=/{locale}/app`).
- No env flag or condition hides it (grep for `NEXT_PUBLIC_GOOGLE|GOOGLE` in `S/` outside tests finds only the URL path). It never touches the sign-out flag (`wordmet-web-logout-pending`; tests `auth.test.tsx:497-504`, `google-complete.test.tsx:106-116`).
- Design §7.5 lists a `GoogleButton` in `ui/` (Figma `34:366`); none exists in `S/ui/`.

## 6. OTP entry (verify-email)

- 6 separate `<input>` boxes (`DIGITS = 6`, `VerifyEmailForm.tsx:22`, l.165-183): `aria-label={t('verify.digit',{n})}` ("Chữ số 1".."Chữ số 6"), `value` one digit, `inputMode="numeric"`, `autoComplete={i===0 ? 'one-time-code' : 'off'}`, `maxLength={2}` (so a typed digit over an existing one can replace it), no `type` attribute (default text), classes `size-12 min-w-0 flex-1 rounded-control border-2 border-border-strong ...` (old tokens).
- `put(index, value)` (l.133-137): keeps last digit of `\D`-stripped input, focuses next box. Backspace on an empty box focuses the previous one (l.139-141). Paste (l.143-149, `onPaste` on every box): strips non-digits, takes first 6, fills all, focuses `min(len, 5)`.
- Submit enabled when all 6 filled (`complete`, l.151) plus `store`, `email`, `password`.
- Resend: `RESEND_AFTER_S = 60` (l.24); clock state `resendAt = Date.now()+60s` at mount (nothing is sent on open), `setInterval` 1 s (l.79-82); while `wait > 0` shows `<p>` `verify.resendIn {seconds}` ("Gửi lại mã sau N giây"), else a `<button type="button">` `verify.resend` (disabled if `resendPress.busy || !email || bot.token === null`). Press -> section 2.5 API; restarts the 60 s countdown; toast `verify.resent`.
- Reset password code is a different, single `TextField` (`ResetPasswordForm`, label "Mã 6 số trong email").
- Design §7.5 lists `OtpField` (Figma "Ô mã" `34:364`); none exists in `S/ui/`.

## 7. Tests

All Vitest files use `// @vitest-environment jsdom` and `renderApp`/`pickDate` from `@/app-ui/test-utils` (except CompleteProfile.test, which builds its own provider). Vitest: `globals: true`, default env node, includes `src/**/*.test.{ts,tsx}` (`vitest.config.ts`).

### 7.1 `A/auth.test.tsx` (536 lines). Mocks: `@/app-shell/navigate` (`hardReplace`), `next/navigation` (`useRouter {replace, push, back}`, `useSearchParams`, `usePathname -> /vi/app/login`). Timeout 20 s.
Helper `fillRegister` (l.49-55) queries: `textbox "Tên"`, `textbox "Họ (không bắt buộc)"`, `getByLabelText 'Ngày sinh'` (via `pickDate` -> `fireEvent.change` on the labelled input), `textbox "Email"`, `getByLabelText 'Mật khẩu'`.

RegisterForm:
1. l.59 "no field shows a placeholder": `container.querySelectorAll('input, textarea')`, count > 3, none has a `placeholder` attribute. (Breaks if a new design adds placeholders; the 6 OTP boxes are not in this form.)
2. l.66 register -> `replace('/vi/app/verify-email')`; `checkbox`, button `"Tạo tài khoản"`; asserts sessionStorage has exactly 1 item (`wordmet-web.pending-email` = `'lan@example.com'`, the email the API returned, not the typed `Lan@Example.COM`), password in memory `Aa1!aaaa`, request body toEqual `{given_name:'Lan', family_name:'Nguyễn', birth_date:'2008-05-14', email:'Lan@Example.COM', password, timezone:'Asia/Ho_Chi_Minh', accept_terms:true, client:'web', device_label:'Wordmet Web', turnstile_token:'fake-turnstile-token'}` (l.83-87). `toEqual` on the body: adding a field (e.g. `password_confirm`) to the request would break it; a confirm field must be UI-only.
3. l.90 K/01b: under-13 date shows text `Bạn cần đủ 13 tuổi để dùng Wordmet.`; consent ticked; button `"Tạo tài khoản"` disabled; no request.
4. l.99 409 `email-taken`: text `Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu.`; `textbox "Email"` has `aria-invalid="true"` and `toHaveAccessibleDescription(hint)` (error tied to input); `link "Quên mật khẩu?"` `href=/vi/app/forgot-password`; no navigation; pending password null.
5. l.114 400 `age-below-minimum` -> text `Bạn cần đủ 13 tuổi để dùng Wordmet.`.
6. l.122 password violations `uppercase, special` -> texts `Cần một chữ hoa.`, `Cần một ký tự đặc biệt.`.
7. l.133 double click on button "Tạo tài khoản" -> 1 request.
8. l.527 (Google block) 409 `email-taken` + `extensions.reason 'account-deleting'` -> text `Tài khoản này đang được xóa, thử lại sau.`.

LoginForm:
9. l.152 Google button `getByRole('button',{name:/Google/})` contains an `svg` with `aria-hidden="true"` and 4 `path`s.
10. l.167 E2: `?next=/vi/app/settings`; fills `textbox Email`, `getByLabelText 'Mật khẩu'` ("pw"), button `"Đăng nhập"` -> `hardReplace('/vi/app/settings')`.
11. l.174 (it.each next null / long query) 403 `email-not-verified` -> `replace('/vi/app/verify-email?reason=login[&next=...]')`; sessionStorage 1 item with trimmed email `Lan@Example.COM`; memory password `pw`; store still signed-out; URL contains neither email nor password.
12. l.190 401 `invalid-credentials` -> text `Email hoặc mật khẩu chưa đúng.`.
13. l.196 E8 403 `account-locked` -> text `Tài khoản đang bị khóa`; `textbox Email` keeps value.
14. l.203 E3 `?reason=expired` -> text `Bạn cần đăng nhập lại.`.
15. l.209 E4 three 429 refreshes -> text regex `/quá nhiều yêu cầu/`.

VerifyEmailForm (`setup` wraps in `<AuthGate>`, l.228-230):
16. l.232 shows text `Mã đã gửi tới lan@example.com. Mã có hiệu lực 10 phút.`; no `textbox Email`, no label `Mật khẩu`.
17. l.240 no pending email: `textbox Email` present; after 60 s (fake timers) button `"Gửi lại mã"` is disabled until an email is typed; resend body `{purpose:'verify_email', email:'new@example.com', turnstile_token:'fake-turnstile-token'}`; typed password; code via `typeCode` (click `textbox "Chữ số 1"` then `keyboard('481205')`); button `"Xác minh"` -> `hardReplace('/vi/app')`.
18. l.261 (it.each x5) destinations: language null -> `/vi/app/welcome[?next=%2Fvi%2Fapp%2Fsettings]`, `'vi'` -> `/vi/app` or next; external next -> `/vi/app`; `verifyEmail` called with `('lan@example.com','481205','Aa1!aaaa')`; body toMatchObject `{email, code, password, client:'web'}`; pending email/password cleared.
19. l.281 after reload password field (`findByLabelText 'Mật khẩu'`) supplies password.
20. l.293 400 `invalid-otp` -> text `Mã hoặc mật khẩu không đúng, hoặc mã đã hết hạn. Nếu email đã được xác nhận, hãy đăng nhập.`; stays; pending email kept.
21. l.302 (vi/en) 429 `Retry-After 75` -> texts `Bạn đã nhập sai mã quá nhiều lần. Thử lại sau 2 phút, hoặc dùng Quên mật khẩu ở trang đăng nhập.` / `Too many wrong codes. Try again in 2 minutes, or use Forgot password on the sign-in page.`; boxes named `Chữ số 1` / `Digit 1`, button `Xác minh` / `Verify`; no link `/Quên mật khẩu|Forgot password/`.
22. l.316 503 `mail-unavailable` -> `getByRole('alert')` has some text.
23. l.324 resend: 60 s countdown text `Gửi lại mã sau 60 giây`; after 61 s dblClick `button "Gửi lại mã"` -> 1 request, body `{purpose,email,turnstile_token}`, no Authorization header; countdown text back to `Gửi lại mã sau 60 giây`.
24. l.343 no link `/Gõ nhầm email/`.
25. l.349 opened signed in -> AuthGate `hardReplace('/vi/app')` once.
26. l.355 another tab signs in (store.bootstrap) -> `hardReplace` to `/vi/app/settings` or welcome?next=..., once.
27. l.367 double submit via `fireEvent.submit(form)` x2 -> `verifyEmail` once.
28. l.381 StrictMode keeps memory password; unmount clears it, keeps email.
29. l.394 `?reason=login` -> text `Bạn cần xác nhận email trước khi vào app. Mã đã được gửi tới lan@example.com.`.
30. l.400 boxes: `userEvent.paste('48 1205')` -> `getAllByRole('textbox')` values join to `481205` (so the 6 boxes MUST be the only textboxes in `setup()`), last box `Chữ số 6` focused; two Backspaces -> `Chữ số 5` focused. A single-input/OTP-component redesign breaks 16-18, 20-23, 26-27, 29-30 (all use `textbox "Chữ số N"` or `typeCode`).

WelcomeLanguage:
31. l.413 click `button /Ngôn ngữ/` (the Select trigger), `option "English"`, button `"Tiếp tục"` -> `hardReplace('/en/app/settings')`; PATCH body toEqual `{native_language:'en'}`.

Forgot/Reset:
32. l.425 `textbox Email`, button `"Gửi mã"` -> `hardReplace('/vi/app/reset-password')`; pending email stored; body toEqual `{purpose:'reset_password', email, turnstile_token:'fake-turnstile-token'}`.
33. l.434 `textbox "Mã 6 số trong email"`, `getByLabelText 'Mật khẩu mới'`, button `"Đổi mật khẩu"` -> `hardReplace('/vi/app/login?reset=1')`; body toEqual `{email, code:'481205', new_password}`. (A confirm field "Nhập lại mật khẩu mới" would need the label not to collide: `getByLabelText('Mật khẩu mới')` is a substring-of-label match? `getByLabelText` with a string is an exact full-string match by default, so "Nhập lại mật khẩu mới" does not collide; the shorter label "Mật khẩu" in Login/Register tests is also exact, but any new label equal to "Mật khẩu" in the same form would make `getByLabelText` throw on multiple matches.)
34. l.449 no pending email: `textbox Email` asked and sent (toMatchObject).
35. l.461 pending email: no `textbox Email`, `textbox "Mã 6 số trong email"` present.

Google block (`window.location.assign` mocked, `href: 'http://localhost/vi/app/login'`):
36. l.477 B8E46 button `"Tiếp tục với Google"` -> assign URL origin+path `http://localhost:3000/v1/auth/google/start`, params `{intent:'login', locale:'vi', next:'/vi/app/word?id=1'}`.
37. l.486 `next=//evil.example` -> `/vi/app`; RegisterForm Google button -> `/vi/app`.
38. l.497 P21 sign-out flag `wordmet-web-logout-pending` untouched.
39. l.506 (it.each x4) `?error=google-failed|google-unavailable|google-busy|google-email-unverified` -> exact vi texts (see section 9).
40. l.517 `?error=account-locked` -> text `Tài khoản đang bị khóa`; `?error=something-else` -> `queryByRole('alert')` is null (so no other element may carry `role="alert"` on the login page by default).

### 7.2 `A/AuthGate.test.tsx` (78 lines). Mocks `navigate`, `next/navigation` (`usePathname`, `useRouter`).
- l.18 signed in on `/vi/app/login` -> `hardReplace('/vi/app')`.
- l.27 (it.each `/vi/app/forgot-password`, `/en/app/reset-password`) signed in: `getByText('form')` stays, `hardReplace` not called (after `store.state.status === 'signed-in'`).
- l.43 register on the page keeps signed-out, child `form` stays, no redirect.
- l.65 login on the page -> signed-in, no redirect.
Children are plain `<p>form</p>`; the tests don't touch CardFrame markup, but `renderApp` does not provide `AppIntl`/locale beyond `NextIntlClientProvider`, which CardFrame's `useLocale()` and `AppLogo`'s `useTranslations('App.chrome')` need (both present in messages).

### 7.3 `A/CompleteProfile.test.tsx` (78 lines). Own `render` with `NextIntlClientProvider locale="vi" messages={{App}}` + `SessionProvider` (no ThemeProvider, no QueryClient). Mocks `navigate`, `next/navigation {useSearchParams: next=/vi/app/settings}` (no `useRouter`/`usePathname`). Uses message values (`t.complete.*`, `t.register.birthDate`), not literals:
- l.43 only consent: no text `t.register.birthDate`; button `t.complete.submit` disabled; click `checkbox`; PATCH body toEqual `{accept_terms:true}`; `replace('/vi/app/settings')`.
- l.54 outdated terms: `heading t.complete.updatedTitle`, text `updatedBody`, no birth date, PATCH `{accept_terms:true}`.
- l.67 first consent keeps `heading t.complete.title`, no `updatedBody`.
- l.73 `birth_date: null`: no `checkbox`, text `t.register.birthDate` (the label) present. (Note `getByText(label)` requires the label text be in its own element.)

### 7.4 `A/auth-turnstile.test.tsx` (183 lines). Mocks `@/app-ui/TurnstileWidget` (replaces component; emits `tok-1`, `tok-2`...), `navigate`, `next/navigation`. Asserts: login 401 -> `widget.resets` 1 and second press token `tok-2` (l.73); 429 resets (l.88); successful login does not reset (l.95); `emit(null)` disables button `Đăng nhập`, `emit('tok-new')` enables (l.103); double click -> 1 request (l.113); register `email-taken` -> tokens `['tok-1']`, resets 1 (l.126, uses `textbox Tên`, `Ngày sinh`, `Email`, `Mật khẩu`, checkbox, button `Tạo tài khoản`); forgot failure -> reset, success -> no reset (l.141, 150); verify resend with token and reset (l.166); verify submit sends no `turnstile_token` (l.174). Because it mocks the module path `@/app-ui/TurnstileWidget`, moving the widget file (design: to `features/learner/auth/`) requires updating the `vi.mock` path in this file and in `S/app-ui/TurnstileWidget.test.tsx` (which also imports `./TurnstileWidget` and `renderApp`).

### 7.5 `A/google-complete.test.tsx` (117 lines). Mocks `navigate`, `next/navigation`; stubs global `fetch` and sets `process.env.NEXT_PUBLIC_API_BASE_URL = BASE`.
- l.36 `needs_name:true`: text `/minh@gmail.com/`, `getByLabelText 'Tên'`; button `"Tạo tài khoản"` disabled until name typed (after `pickDate('Ngày sinh','2000-05-12')` + `checkbox`).
- l.47 `needs_name:false`: no label `Tên`.
- l.54 POST body toEqual `{birth_date:'2000-05-12', accept_terms:true, timezone:any, given_name:'Minh', family_name:'Trần'}`, header `X-CSRF-Protection: 1`, store signed-in, `replace('/vi/app')`; labels `Tên`, `Họ (không bắt buộc)`.
- l.72 under 13 -> `link "Về trang đăng nhập"` `href=/vi/app/login`.
- l.86 401 on GET -> text `Phiên đăng ký đã hết hạn`, `button "Tiếp tục với Google"`, zero `/v1/auth/refresh` calls.
- l.94 401 on POST -> same text.
- l.106 button assigns `${BASE}/v1/auth/google/start?intent=login&locale=vi&next=%2Fvi%2Fapp`; sign-out flag kept.

### 7.6 Other unit tests touching this code
- `S/app-ui/TurnstileWidget.test.tsx` (widget behaviour, script URL, fake token), `S/app-ui/date-of-birth.test.ts`, `S/app-ui/ui-kit.test.tsx` (old `app-ui` kit), `S/app-shell/config.test.ts` (site key assert), `S/ui/{actions,fields,overlays}.test.tsx` (new kit), `S/app-chrome/{chrome,error-view,layouts,theme-toggle-button}.test.tsx`.

### 7.7 Playwright (all in `apps/web/e2e`, project `desktop` 1440 and `mobile` 390 unless noted; `mockApi` from `e2e/support/mock-api.ts`; copy from `e2e/copy.ts` = messages)
- `e2e/app/m1.spec.ts`:
  - l.10-52 sign-up -> code -> language -> Today: `goto /vi/app/register`; `textbox givenName`, `getByLabel birthDate` fill `2008-05-14`, `textbox email`, `getByLabel password`, `getByRole('checkbox').check({force:true})`, button `register.submit`; expect URL `/vi/app/verify-email$`, text `lan@example.com` visible, `getByLabel(password)` count 0, click `textbox 'Chữ số 1'`, `keyboard.type('481205')`, button `verify.submit`; URL `/vi/app/welcome$`; button `welcome.submit`; URL `/vi/app$`; register body toMatchObject `{accept_terms:true, client:'web', birth_date:'2008-05-14'}`, verify body `{email, code, password, client}`; zero `/v1/auth/otp` calls.
  - l.54-78 sign-in unverified -> `/vi/app/verify-email?reason=login$`, text `verify.loginBody` with email, verify -> `/vi/app$`.
  - l.80-96 E2: `goto /vi/app/settings` -> `login?next=%2Fvi%2Fapp%2Fsettings$`; sign in -> settings heading.
  - l.104-111 E8 locked: text `login.lockedTitle`.
  - l.124-151 axe on `login, register, forgot-password, reset-password?email=lan%40example.com, verify-email, verify-email?reason=login` (signed out) and `'' , settings, settings/account, welcome` (signed in), vi/en x light/dark: `seriousViolations` empty, `scrollWidth <= innerWidth`, level-1 heading visible (`getByRole('heading',{level:1}).first()`), member pages `data-theme` equals scheme. Pages `complete-profile`, `google/complete`, `account-deleted` are NOT covered by axe.
- `e2e/app/b8-set-password.spec.ts` (l.10-43): signed in as Google-only learner, goes to settings then `/vi/app/forgot-password$` (stays, AuthGate B8-2), `heading forgot.title`, `textbox email`, button `forgot.submit` -> `/vi/app/reset-password$`; OTP body toMatchObject `{purpose:'reset_password', email}`; `textbox reset.code`, `getByLabel reset.newPassword`, button `reset.submit` -> `/vi/app/login?reset=1$`, text `login.passwordReset`; reset body toEqual `{email, code:'482913', new_password:'Aa1!aaaa'}` (only l.1-43 read; the reset submit at l.33-40 is inside a block I did not read in full).
- `e2e/app/overflow.spec.ts` l.22-29: for vi/en, visits `/login, /register, /forgot-password, /reset-password` signed out; `heading level 1` visible; `scrollWidth <= innerWidth`.
- `e2e/csp.spec.ts`: l.51-58 real Turnstile on `/vi/app/login`: `button login.submit` enabled within 45 s, zero `window.__cspViolations`; l.63-95 `/vi/app` and `/vi/app/login` carry one nonce policy and every `<script>` has the nonce (exceptions: theme script by hash, Turnstile script, l.74-80); l.97-103 no CSP violation on `/vi` and `/vi/app/login`.
- `e2e/landing.spec.ts`: l.64-71 hero signup link `href=/vi/app/register` and click lands on `/vi/app/register$`; l.158-170 dark theme persists to `/vi/app/login$` (`html[data-theme=dark]`); **l.550-563 LR43: at 1440x900 for `/vi/app/login` and `/vi/app/register`: `heading level 1` ancestor `xpath=ancestor::section[1]` is visible, `page.locator('aside')` count 0, and the section's horizontal centre is within 2 px of 720 (card centred, no side panel)**; l.822-834 at 390 px the `link login.forgot` height >= 44.
- `e2e-shots/shots.spec.ts` (needs `SHOTS_EMAIL`/`SHOTS_PASSWORD`, not in CI): l.7 `SIGNED_OUT = ['login','register','forgot-password']`; l.43-52 shoots them for vi/en x light/dark x 390/1024/1440; l.53-58 signs in through `/vi/app/login` with `textbox 'Email'`, `getByLabel 'Mật khẩu'`, `button 'Đăng nhập'`, expects URL `/app$`. (The working tree has uncommitted edits to this file; branch version used here.)
- Not touching auth routes: `e2e/a11y.spec.ts`, `chrome.spec.ts`, `locale.spec.ts`, `privacy.spec.ts`, `seo.spec.ts`, `visual.spec.ts`, `e2e/app/{m2..m5b,cai-thien-*}.spec.ts` (grep for login/register/verify-email/forgot/reset-password/google/complete/complete-profile/welcome/account-deleted/auth in `e2e/` and `e2e-shots/` returns only the files above, plus `support/mock-api.ts` which defines `signedInAs`).

## 8. M1 building blocks available for M2

### 8.1 `S/ui/*` (all new tokens `wm-*`)
- `TextField` (`ui/TextField.tsx:8-71`): props `label, value, onChange, type?: 'text'|'email'|'password'|'date', min?, max?, name?, autoComplete?, placeholder?, description?, error?, isDisabled?, isReadOnly?, isRequired?, maxLength?, showCount?, spellCheck?, inputMode?: 'text'|'numeric'|'email', onBlur?, autoFocus?`. React Aria `TextField` + `Label` + `Input` + `FieldError` (red message with `CircleAlert` icon, l.55-58) + description via `<Text slot="description">`. `isInvalid={error !== undefined}` so the error is tied to the input (aria-invalid). NO password reveal/eye toggle, no `onKeyDown`/`onPaste`, no `maxLength` per-box OTP, no `aria-label` without a visible label. Uses `useTranslations('App.common')` (only for `charCount`).
- `Button` (`ui/Button.tsx`): `variant: 'primary' | 'secondary' | 'pass' | 'danger'` (default `primary`), `size: 'md' | 'lg'`, `isPending`, `className`, plus React Aria button props (`onPress`, `type`, `isDisabled`...). **No `sticker`, `quiet`, `ink`, `ghost` variants** (the auth forms use `sticker` and `quiet`). `isPending` behaves like the old one (press ignored, `type` forced to `button`, `aria-busy`, spinner). Exports `BUTTON_BASE`, `BUTTON_VARIANT`, `BUTTON_DISABLED`.
- `ButtonLink` (`ui/ButtonLink.tsx`): `next/link` props + `variant`, `size`; same classes as Button.
- `TextButton` (`ui/TextButton.tsx`): `tone: 'add'|'normal'|'muted'|'delete'`, React Aria Button (an action, not a link); has min-h-11 on phones.
- `Checkbox` (`ui/Checkbox.tsx`): `{isSelected, onChange, children, isDisabled?, isInvalid?}`; stops link presses inside the label from toggling the box (needed by the consent text).
- `Select` (`ui/Select.tsx`): `{label, hideLabel?, items: {id,label,icon?,suffix?}[], value, onChange(id), isDisabled?, placeholder?, error?, display?, className?}`; React Aria Select with a popover listbox.
- `Card` (`ui/Card.tsx`): `{as?: 'div'|'section'|'article'|'li', className?, children}` -> `rounded-wm-xl bg-wm-surface p-5 shadow-wm-card`.
- Also in `S/ui/`: `Dialog`, `DotGridBackground`, `Kbd`, `ProBadge`, `Segmented`, `Skeleton`, `Switch`, `Tag`, `Toast` (`showToast(text, tone: 'neutral'|'success'|'danger')`), `field-styles.ts`. NOT in `S/ui/`: `Flag`, `DateOfBirthField`/date-of-birth, `TurnstileWidget`, `OtpField`, `Field`, `GoogleButton`, any password-with-reveal input.
- Old kit still present and imported by auth: `S/app-ui/{Button,Checkbox,DateOfBirthField,Flag,Select,TextField,Toast}.tsx`; the old `app-ui/Button` has variants `sticker|primary|quiet|ink|danger|ghost` and old tokens. Only `app-ui/Toast.tsx` is a re-export shim of `@/ui/Toast`. Outside `features/learner/auth` there are 101 more imports of `@/app-ui/(Flag|DateOfBirthField|date-of-birth|test-utils|TurnstileWidget|Select|Checkbox|TextField|Button)` in `S/` (grep count; includes tests).

### 8.2 `S/app-chrome/`
- `CardFrame.tsx:10-24` `CardFrame({children})`: `<main id="main" tabIndex={-1} className="relative isolate flex min-h-dvh flex-col items-center px-4 py-8 outline-none md:justify-center">`, `<DotGridBackground />`, a `Link href=/{locale}` wrapping `<AppLogo />` (top-left absolute from md), and `<div className="w-full max-w-md rounded-wm-2xl bg-wm-surface p-6 shadow-wm-card md:p-8">{children}</div>`.
- `Logo.tsx`: `Logo({tone?: 'navy'|'surface'})` (old look, kept for landing until M8) and `AppLogo()` (l.22-31, "wordmet." Bricolage, full stop in accent, `aria-label` = `App.chrome.brand`).
- `ErrorView.tsx:7-15` `ErrorView({retry})`: `<div role="alert">`, `<h1>` `App.common.errorPageTitle`, `<Button onPress={retry}>` `App.common.retry` (new `ui/Button`, primary).
- Others: `AppChrome, AddFab, AvatarMenu, BackLink, MobileTabBar, PageColumns, PageTitle, PhoneHeader, PlanChip, SearchStrip, ThemeToggle, TopBar, nav.ts`.

### 8.3 `renderApp` helper
- `S/app-ui/test-utils.tsx:15-51` (NOT under `ui/` or `src/test`): `renderApp(ui, { locale?: 'vi'|'en' = 'vi', me?: Me = makeMe(), routes?: Record<string, Route> = {}, instantWaits?: boolean = false, chrome?: boolean = false })` returns `{...RenderResult, store, client, ...f}` where `f` is `makeFetch(...)` (`calls`, `count(method, path)`, `fetch`). Wraps in `NextIntlClientProvider (messages={{App}}, timeZone UTC)` > `QueryClientProvider` > `SessionProvider` > `ThemeProvider` (and `AddWordProvider > AppChrome` when `chrome`). Default routes: `POST /v1/auth/refresh` -> `tokenResponse('tok-1')` (so default = SIGNED IN), `GET /v1/me` -> `me`. Auth tests override with `signedOut = {'POST /v1/auth/refresh': () => problem(401,'invalid-token')}`.
- Also exports `pickDate(label, iso)` (l.54-56): `fireEvent.change(getByLabelText(label), {target:{value: iso}})`.
- Imports `@/app-shell/*`, `@/app-chrome/AppChrome`, `@/features/learner/add-word/add-word-context` (so it may not be moved into `ui/` non-test code; ESLint exempts `src/ui/**/*.test.*` only).
- `S/app-shell/session/test-support` exports `BASE, makeFetch, makeMe, tokenResponse, problem, rateLimited, Route`.

### 8.4 ESLint folder rules (`apps/web/eslint.config.mjs:9-22`, `no-restricted-imports` deny-lists)
| Files | Banned import groups |
|---|---|
| `src/ui/**` (tests excepted) | `@/features/*`, `@/app-shell/*`, `@/app-chrome/*`, `@/site/*` |
| `src/site/**` | `@/features/*`, `@/app-chrome/*` |
| `src/app-chrome/**` | `@/site/*` |
| `src/features/learner/**` | `@/site/*` |
So `features/learner/auth` MAY import `@/ui/*`, `@/app-ui/*`, `@/app-chrome/*`, `@/app-shell/*`, `@/lib/*`, `@/i18n/*`. Nothing forbids `features` -> old `app-ui`. `ui/` may NOT import `@/app-shell/*` (so a `ui/` GoogleButton using `apiBaseUrl` from `@/app-shell/config`, or `ui/TurnstileWidget`, would be a lint error; hence design §6 puts the widget in `features/learner/auth/`).

## 9. Messages (vi.json / en.json)

Flatten comparison of `apps/web/messages/vi.json` vs `en.json` on the M1 branch: 0 keys only in vi, 0 keys only in en (whole file); ICU placeholder/tag sets for every `App.auth.*`, `App.deleteAccount.*`, `App.ui.dob.*` key are identical in both files.

Namespaces the auth components read: `App.auth` (all, below), `App.auth.passwordRules`, `App.auth.welcome`, `App.auth.googleComplete`, `App.deleteAccount` (only `pendingTitle, pendingBody, doneTitle, doneBody, toLogin` by AccountDeleted), `App.errors` (via `useErrorMessage`, plus `google-*` directly in LoginForm, `captcha-unavailable` in the widget), `App.ui.dob` (via DateOfBirthField), `App.common` (new TextField `charCount`, ErrorView), `App.chrome.brand` (AppLogo).

`App.auth` (vi):
- `back` "Quay lại" · `email` "Email" · `password` "Mật khẩu" · `google` "Tiếp tục với Google" · `or` "Hoặc"
- `register.title` "Tạo tài khoản" · `.subtitle` "Ôn từ vựng theo lịch, bắt đầu từ chính những từ bạn gặp." · `.givenName` "Tên" · `.givenNamePlaceholder` "Lan" (unused in src) · `.familyName` "Họ (không bắt buộc)" · `.familyNamePlaceholder` "Nguyễn" (unused) · `.birthDate` "Ngày sinh" · `.birthDateHint` "Wordmet dành cho người từ 13 tuổi." · `.passwordHint` "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt." · `.consent` "Tôi đồng ý với <terms>Điều khoản sử dụng</terms> và <privacy>Chính sách bảo mật</privacy>." · `.submit` "Tạo tài khoản" · `.haveAccount` "Đã có tài khoản?" · `.login` "Đăng nhập" · `.givenNameRequired` "Nhập tên của bạn." · `.accountDeleting` "Tài khoản này đang được xóa, thử lại sau."
- `passwordRules.min_length` "Cần ít nhất 8 ký tự." · `.max_length` "Tối đa 128 ký tự." · `.uppercase` "Cần một chữ hoa." · `.lowercase` "Cần một chữ thường." · `.digit` "Cần một chữ số." · `.special` "Cần một ký tự đặc biệt." · `.same_as_current` "Mật khẩu mới phải khác mật khẩu cũ."
- `login.title` "Đăng nhập" · `.forgot` "Quên mật khẩu?" · `.submit` "Đăng nhập" · `.noAccount` "Chưa có tài khoản?" · `.register` "Đăng ký" · `.lockedTitle` "Tài khoản đang bị khóa" · `.lockedBody` "Bạn chưa đăng nhập được vào tài khoản này. Liên hệ đội Wordmet nếu bạn cần mở lại." · `.expired` "Bạn cần đăng nhập lại." · `.rateLimited` "Wordmet đang nhận quá nhiều yêu cầu từ trình duyệt này nên bạn cần đăng nhập lại." · `.logoutFailed` "Chưa đăng xuất xong vì mất kết nối. Đăng nhập lại hoặc thử đăng xuất lần nữa." · `.retryLogout` "Đăng xuất lần nữa" · `.passwordReset` "Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới."
- `verify.title` "Nhập mã 6 số" · `.body` "Mã đã gửi tới {email}. Mã có hiệu lực 10 phút." · `.digit` "Chữ số {n, number}" · `.resendIn` "Gửi lại mã sau {seconds, number} giây" · `.resend` "Gửi lại mã" · `.submit` "Xác minh" · `.resent` "Đã gửi mã mới." · `.bodyNoEmail` "Nhập email bạn đã đăng ký và mã 6 số trong thư. Mã có hiệu lực 10 phút." · `.loginBody` "Bạn cần xác nhận email trước khi vào app. Mã đã được gửi tới {email}." · `.wrongCode` "Mã hoặc mật khẩu không đúng, hoặc mã đã hết hạn. Nếu email đã được xác nhận, hãy đăng nhập." · `.locked` "Bạn đã nhập sai mã quá nhiều lần. Thử lại sau {time}, hoặc dùng Quên mật khẩu ở trang đăng nhập."
- `forgot.title` "Quên mật khẩu" · `.body` "Nhập email của bạn. Nếu email này có tài khoản, Wordmet gửi mã đặt lại tới đó." · `.submit` "Gửi mã" · `.mustChange` "Tài khoản này cần mật khẩu mới trước khi dùng tiếp. Nhập email để nhận mã đặt lại."
- `reset.title` "Đặt mật khẩu mới" · `.code` "Mã 6 số trong email" · `.newPassword` "Mật khẩu mới" · `.hint` "Đổi xong, mọi thiết bị khác sẽ bị đăng xuất." · `.submit` "Đổi mật khẩu"
- `googleComplete.title` "Hoàn tất đăng ký" · `.intro` "Bạn sắp tạo tài khoản Wordmet bằng {email}. Còn vài thông tin nữa." · `.submit` "Tạo tài khoản" · `.expiredTitle` "Phiên đăng ký đã hết hạn" · `.expiredBody` "Bạn cần chọn lại tài khoản Google để tiếp tục." · `.toLogin` "Về trang đăng nhập"
- `complete.title` "Bổ sung thông tin tài khoản" · `.body` "Trước khi học tiếp, Wordmet cần ngày sinh của bạn và việc bạn đồng ý với điều khoản." · `.submit` "Tiếp tục" · `.updatedTitle` "Điều khoản đã được cập nhật" · `.updatedBody` "Wordmet vừa đăng bản mới của Điều khoản sử dụng và Chính sách bảo mật. Hãy đọc và đồng ý để tiếp tục học."
- `welcome.title` "Bạn đọc nghĩa của từ bằng ngôn ngữ nào?" · `.body` "Giao diện cũng dùng ngôn ngữ này. Đổi lại được trong Cài đặt." · `.language` "Ngôn ngữ" · `.vi` "Tiếng Việt" · `.en` "English" · `.submit` "Tiếp tục"

No keys exist yet for: "Nhập lại mật khẩu" / "Nhập lại mật khẩu mới" (confirm fields), a mismatch error, a show/hide-password label.

`App.deleteAccount` used here: `doneTitle` "Tài khoản của bạn đã được xóa." · `doneBody` "Cảm ơn bạn đã học cùng Wordmet. Thư xác nhận đã gửi tới email của bạn." · `pendingTitle` "Tài khoản đang được xóa" · `pendingBody` "Việc xóa đang hoàn tất, có thể mất tới một giờ. Bạn không cần làm gì thêm." · `toLogin` "Về trang đăng nhập".

`App.ui.dob`: `placeholder` "dd/mm/yyyy" (unused) · `invalid` "Ngày sinh không hợp lệ. Chọn lại ngày." · `tooYoung` "Bạn cần đủ 13 tuổi để dùng Wordmet." · `future` "Ngày sinh không thể sau hôm nay."

`App.errors` used by auth flows (vi): `invalid-credentials` "Email hoặc mật khẩu chưa đúng." · `email-taken` "Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu." · `age-below-minimum` "Bạn cần đủ 13 tuổi để dùng Wordmet." · `invalid-otp` "Mã xác minh chưa đúng hoặc đã hết hạn." · `account-locked` "Tài khoản đang bị khóa. Liên hệ đội Wordmet nếu bạn cần mở lại." · `mail-unavailable` "Chưa gửi được email. Thử lại sau ít phút." · `captcha-failed` "Chưa xác minh được bạn không phải máy. Hãy thử lại." · `captcha-unavailable` "Chưa kiểm tra chống bot được lúc này. Hãy thử lại sau ít phút." · `rate-limited` "Bạn thao tác hơi nhanh. Thử lại sau {seconds, number} giây." · `validation-failed` "Thông tin chưa hợp lệ. Xem lại các ô được đánh dấu." · `google-failed` "Đăng nhập bằng Google chưa thành công. Hãy thử lại." · `google-unavailable` "Đăng nhập bằng Google đang tạm thời không dùng được. Hãy dùng email và mật khẩu." · `google-busy` "Có quá nhiều lượt đăng nhập bằng Google từ mạng này. Đợi một phút rồi thử lại, hoặc dùng email và mật khẩu." · `google-email-unverified` "Google chưa xác minh email này, nên chưa đăng nhập được. Hãy xác minh email ở Google rồi thử lại." · `generic` "Có lỗi xảy ra. Thử lại sau." · `csrf-header-required`, `password-change-required`, `profile-incomplete`, `email-already-verified`, `invalid-token` ("Bạn cần đăng nhập lại.") also exist. `email-not-verified` has no message key (handled by redirect). Mapping: `useErrorDetails` (`S/app-shell/api/use-error-message.ts:16-35`): 429 -> `errors.rate-limited` with `retryAfterSeconds ?? 10`; ApiError -> `errorMessageKey(problem)` (slug in `KNOWN_ERROR_SLUGS`, `S/app-shell/api/problem.ts:35`, else `errors.generic`); `TypeError`/`NetworkError` -> `offline.message`.

`App.common` used: `charCount`, `errorPageTitle` "Không tải được trang này.", `retry` "Thử lại".

## 10. Surprises

1. **`(split)` / `(card)` do not exist and `AuthGate` draws the frame.** `(auth)/layout.app.tsx` is `<AuthGate>`, and `AuthGate` itself returns `<CardFrame>` (`A/AuthGate.tsx:35`). Design §5.4 says `AuthGate` stays in `(auth)/layout` and `(split)`/`(card)` hold the frames. M2 must move `CardFrame` out of `AuthGate` (and test `AuthGate.test.tsx` renders it without a frame requirement) and add the two sub-layouts; `login/` and `register/` move into `(split)`, the other five into `(card)`. `/app/complete-profile` and `/app/welcome` are already in `(member)/(onboarding)` with `CardFrame` (not in `(auth)`), as design §5.4 says.
2. **Double card today.** `CardFrame` already draws the white rounded shadowed box (`ui` tokens, `max-w-md`), and each form's `AuthCard` draws a second `<section>` with `rounded-card bg-surface p-6 shadow-sheet` inside it. `AuthCard` and every form still use the OLD UI kit (`@/app-ui/{Button,TextField,Checkbox,DateOfBirthField,Select,Flag}`) and old tokens; M1 only changed the frame.
3. **Owner decision LR43 (03/11/2026) contradicts the design's `(split)` navy panel.** `e2e/landing.spec.ts:550-563` pins "no `<aside>`, card centred at 1440" for `/vi/app/login` and `/register`, and locates the card via `heading.ancestor::section[1]`. Design §5.4/§9 M2 reintroduces a two-column layout with a navy panel for login/register (Figma `35:308`, `35:405`). That e2e test (and its comment "Owner 03/11/2026: ... drop the navy panel") will fail or must be rewritten; also `AuthCard` is the `<section>` it targets.
4. **`ui/Button` lacks `sticker`/`quiet`.** All 9 forms use `variant="sticker"` (and LoginForm `variant="quiet"` for "Đăng xuất lần nữa"). New `ui/Button` variants are `primary|secondary|pass|danger`; switching imports needs a variant mapping (sticker -> primary, quiet -> secondary/`TextButton`).
5. **Components the design table (§7.5) lists but that do not exist in `S/ui/`:** `Field`, `OtpField`, `GoogleButton`, and also no password-reveal input, `DateOfBirthField`, `Flag`. `ui/TextField` is the old `TextField` API re-skinned (comment: "Same props as app-ui/TextField").
6. **`renderApp` is in `S/app-ui/test-utils.tsx`**, not a shared test folder; the 5 auth test files import `@/app-ui/test-utils`. If `app-ui/` is deleted at M8, they need the new path; `renderApp` defaults to a SIGNED-IN session (refresh route returns a token) so auth tests must override.
7. **OTP is 6 `<input>`s whose accessible names are "Chữ số N"**; unit tests (`auth.test.tsx` 16-30, `auth-turnstile.test.tsx`), e2e `m1.spec.ts:40` and the axe pages rely on that name, on `maxLength={2}` overwrite behaviour, on paste and Backspace navigation, and test 30 counts `getAllByRole('textbox')` to be exactly the 6 boxes. An `OtpField` must keep those names/behaviours or all of them change.
8. **Confirm-password fields are new and the request must not change.** Register test 2 and e2e `b8-set-password.spec.ts:43` assert exact request bodies with `toEqual`; reset test 33 too. A "Nhập lại mật khẩu" field must be UI-only. Tests use `getByLabelText('Mật khẩu')` / `('Mật khẩu mới')`; a second field labelled exactly the same text would make these ambiguous (a different label like "Nhập lại mật khẩu" is OK because string matching is exact).
9. **Placeholder rule is pinned:** `auth.test.tsx:59-64` fails if any `input`/`textarea` in `RegisterForm` has a `placeholder` (owner 03/11/2026). Unused message keys `givenNamePlaceholder`, `familyNamePlaceholder`, `ui.dob.placeholder` still exist in vi/en.
10. **`AuthGate` renders children while the session is `loading`** and only redirects after the first answer; there is no loading state to restyle. B8-2 regex is `/\/app\/(forgot|reset)-password\/?$/`; `GoogleComplete` and `AccountDeleted` are inside `(auth)` too, so a signed-in visitor of `/app/google/complete` or `/app/account-deleted` is redirected into the app by AuthGate (only when the page opened already signed in).
11. **Turnstile in design §9 "giữ như hiện nay" vs §6 "move to `features/learner/auth/`":** both are in the same design; the widget file, its test, the hook (`app-shell/use-turnstile.tsx`) and the `vi.mock('@/app-ui/TurnstileWidget')` in `auth-turnstile.test.tsx:17` all reference the old path. `ResetPasswordForm` and `GoogleComplete` have no bot check; resend on verify-email does.
12. **`AccountDeleted` has no test file**, and `complete-profile`, `google/complete`, `account-deleted` are not in the axe page list (`m1.spec.ts:124-125`; `welcome` is).
13. **`AuthCard` back button is a plain `<button>`; `onBack` for `VerifyEmailForm` is `router.back()`** (history-dependent), forgot/reset use `hardReplace` to a fixed page.
14. **Minor copy oddity noticed (not a code error):** `LoginForm` forgot link uses negative margins `-mt-5.5 -mb-3.5` to get a 44 px hit area while visually tight; e2e `landing.spec.ts:832` pins the 44 px height.
15. **`AuthCard` shows the title as `<h1>`**; the axe/overflow e2e tests locate the page with `heading level 1`; the new design's title must remain an `h1` for those, and the verify/forgot/reset pages must have exactly one (they use `.first()`).
