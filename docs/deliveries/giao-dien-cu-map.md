# Bản đồ giao diện cũ (trước giao diện mới)

Giao diện web cũ được cất trong tag `archive/giao-dien-cu-2026-11`, commit `50b632e77175d249333add42afdbe07a4381bea3` (= `origin/dev` ngày 10/11/2026).

- Xem một file: `git show archive/giao-dien-cu-2026-11:<path>`
- Lấy lại một file: `git checkout archive/giao-dien-cu-2026-11 -- <path>`

## Màn hình (route → component chính)

| Màn hình | Route | Component |
|---|---|---|
| auth: /account-deleted | `apps/web/src/app/[locale]/app/(auth)/account-deleted/page.app.tsx` | `apps/web/src/features/learner/auth/AccountDeleted.tsx` |
| auth: /forgot-password | `apps/web/src/app/[locale]/app/(auth)/forgot-password/page.app.tsx` | `apps/web/src/features/learner/auth/ForgotPasswordForm.tsx` |
| auth: /google/complete | `apps/web/src/app/[locale]/app/(auth)/google/complete/page.app.tsx` | `apps/web/src/features/learner/auth/GoogleComplete.tsx` |
| auth: /login | `apps/web/src/app/[locale]/app/(auth)/login/page.app.tsx` | `apps/web/src/features/learner/auth/LoginForm.tsx` |
| auth: /register | `apps/web/src/app/[locale]/app/(auth)/register/page.app.tsx` | `apps/web/src/features/learner/auth/RegisterForm.tsx` |
| auth: /reset-password | `apps/web/src/app/[locale]/app/(auth)/reset-password/page.app.tsx` | `apps/web/src/features/learner/auth/ResetPasswordForm.tsx` |
| auth: /verify-email | `apps/web/src/app/[locale]/app/(auth)/verify-email/page.app.tsx` | `apps/web/src/features/learner/auth/VerifyEmailForm.tsx` |
| member: /complete-profile | `apps/web/src/app/[locale]/app/(member)/complete-profile/page.app.tsx` | `apps/web/src/features/learner/auth/CompleteProfile.tsx` |
| member: /group/backlog | `apps/web/src/app/[locale]/app/(member)/group/backlog/page.app.tsx` | `apps/web/src/features/learner/groups/BacklogPage.tsx` |
| member: /group | `apps/web/src/app/[locale]/app/(member)/group/page.app.tsx` | `apps/web/src/features/learner/groups/GroupPage.tsx` |
| member: /groups | `apps/web/src/app/[locale]/app/(member)/groups/page.app.tsx` | `apps/web/src/features/learner/groups/GroupListPage.tsx` |
| member: /lookup | `apps/web/src/app/[locale]/app/(member)/lookup/page.app.tsx` | `apps/web/src/features/learner/lookup/LookupPage.tsx` |
| member: / | `apps/web/src/app/[locale]/app/(member)/page.app.tsx` | `apps/web/src/features/learner/today/TodayPage.tsx` |
| member: /plans/order | `apps/web/src/app/[locale]/app/(member)/plans/order/page.app.tsx` | `apps/web/src/features/learner/plans/OrderReturnPage.tsx` |
| member: /plans | `apps/web/src/app/[locale]/app/(member)/plans/page.app.tsx` | `apps/web/src/features/learner/plans/PlansPage.tsx` |
| member: /practice/history | `apps/web/src/app/[locale]/app/(member)/practice/history/page.app.tsx` | `apps/web/src/features/learner/practice/HistoryPage.tsx` |
| member: /practice | `apps/web/src/app/[locale]/app/(member)/practice/page.app.tsx` | `apps/web/src/features/learner/practice/PracticePage.tsx` |
| member: /practice/session | `apps/web/src/app/[locale]/app/(member)/practice/session/page.app.tsx` | `apps/web/src/features/learner/practice/session/PracticeSession.tsx` |
| member: /practice/weak | `apps/web/src/app/[locale]/app/(member)/practice/weak/page.app.tsx` | `apps/web/src/features/learner/practice/WeakWordsPage.tsx` |
| member: /recall | `apps/web/src/app/[locale]/app/(member)/recall/page.app.tsx` | `apps/web/src/features/learner/recall/RecallSession.tsx` |
| member: /review | `apps/web/src/app/[locale]/app/(member)/review/page.app.tsx` | `apps/web/src/features/learner/review/ReviewSession.tsx` |
| member: /settings/account | `apps/web/src/app/[locale]/app/(member)/settings/account/page.app.tsx` | `apps/web/src/features/learner/settings/AccountPage.tsx` |
| member: /settings/delete-account | `apps/web/src/app/[locale]/app/(member)/settings/delete-account/page.app.tsx` | `apps/web/src/features/learner/settings/DeleteAccountPage.tsx` |
| member: /settings | `apps/web/src/app/[locale]/app/(member)/settings/page.app.tsx` | `apps/web/src/features/learner/settings/SettingsPage.tsx` |
| member: /settings/transactions | `apps/web/src/app/[locale]/app/(member)/settings/transactions/page.app.tsx` | `apps/web/src/features/learner/transactions/TransactionsPage.tsx` |
| member: /topic | `apps/web/src/app/[locale]/app/(member)/topic/page.app.tsx` | `apps/web/src/features/learner/groups/TopicPickerPage.tsx` |
| member: /welcome | `apps/web/src/app/[locale]/app/(member)/welcome/page.app.tsx` | `apps/web/src/features/learner/auth/WelcomeLanguage.tsx` |
| member: /word | `apps/web/src/app/[locale]/app/(member)/word/page.app.tsx` | `apps/web/src/features/learner/word/WordPage.tsx` |

## Layout

- `apps/web/src/app/[locale]/app/layout.app.tsx`
- `apps/web/src/app/[locale]/app/(auth)/layout.app.tsx`
- `apps/web/src/app/[locale]/app/(member)/layout.app.tsx`

## Chrome (`src/app-chrome/`)

- `apps/web/src/app-chrome/AppFooter.tsx`
- `apps/web/src/app-chrome/AppShell.tsx`
- `apps/web/src/app-chrome/AvatarMenu.tsx`
- `apps/web/src/app-chrome/Logo.tsx`
- `apps/web/src/app-chrome/MobileTabBar.tsx`
- `apps/web/src/app-chrome/PageTitle.tsx`
- `apps/web/src/app-chrome/PlanChip.tsx`
- `apps/web/src/app-chrome/SearchStrip.tsx`
- `apps/web/src/app-chrome/ThemeToggle.tsx`
- `apps/web/src/app-chrome/TopBar.tsx`
- `apps/web/src/app-chrome/chrome.test.tsx`
- `apps/web/src/app-chrome/nav.ts`
- `apps/web/src/app-chrome/theme-toggle-button.test.tsx`

## `src/app-ui/`

- `apps/web/src/app-ui/Button.tsx`
- `apps/web/src/app-ui/Checkbox.tsx`
- `apps/web/src/app-ui/DateOfBirthField.tsx`
- `apps/web/src/app-ui/Dialog.tsx`
- `apps/web/src/app-ui/Flag.tsx`
- `apps/web/src/app-ui/Locked.tsx`
- `apps/web/src/app-ui/PronunciationLine.tsx`
- `apps/web/src/app-ui/Segmented.tsx`
- `apps/web/src/app-ui/Select.tsx`
- `apps/web/src/app-ui/SpeakButtons.test.tsx`
- `apps/web/src/app-ui/SpeakButtons.tsx`
- `apps/web/src/app-ui/States.tsx`
- `apps/web/src/app-ui/StreakToast.tsx`
- `apps/web/src/app-ui/Switch.tsx`
- `apps/web/src/app-ui/TextField.tsx`
- `apps/web/src/app-ui/Toast.tsx`
- `apps/web/src/app-ui/TurnstileWidget.test.tsx`
- `apps/web/src/app-ui/TurnstileWidget.tsx`
- `apps/web/src/app-ui/audio-player.ts`
- `apps/web/src/app-ui/date-of-birth.test.ts`
- `apps/web/src/app-ui/date-of-birth.ts`
- `apps/web/src/app-ui/pronounce.test.tsx`
- `apps/web/src/app-ui/speech-test-support.ts`
- `apps/web/src/app-ui/speech.test.ts`
- `apps/web/src/app-ui/speech.ts`
- `apps/web/src/app-ui/streak-toast.test.tsx`
- `apps/web/src/app-ui/test-utils.tsx`
- `apps/web/src/app-ui/toast.test.tsx`
- `apps/web/src/app-ui/ui-kit.test.tsx`

## `src/components/`

- `apps/web/src/components/interactive/Reveal.tsx`
- `apps/web/src/components/interactive/reveal.test.tsx`
- `apps/web/src/components/landing/ExercisesSection.tsx`
- `apps/web/src/components/landing/Faq.tsx`
- `apps/web/src/components/landing/FinalCta.tsx`
- `apps/web/src/components/landing/Hero.tsx`
- `apps/web/src/components/landing/LandingHeader.tsx`
- `apps/web/src/components/landing/MetOutside.tsx`
- `apps/web/src/components/landing/Plans.tsx`
- `apps/web/src/components/landing/ReviewTiming.tsx`
- `apps/web/src/components/landing/WhyForget.tsx`
- `apps/web/src/components/landing/copy.test.ts`
- `apps/web/src/components/landing/copy.ts`
- `apps/web/src/components/landing/exercises/ExerciseGallery.tsx`
- `apps/web/src/components/landing/exercises/check.test.ts`
- `apps/web/src/components/landing/exercises/check.ts`
- `apps/web/src/components/landing/exercises/exercise-gallery.test.tsx`
- `apps/web/src/components/landing/exercises/exercise-set.ts`
- `apps/web/src/components/landing/fill.ts`
- `apps/web/src/components/landing/forgetting-curve.test.ts`
- `apps/web/src/components/landing/forgetting-curve.ts`
- `apps/web/src/components/landing/header-hero.test.tsx`
- `apps/web/src/components/landing/sections.test.tsx`
- `apps/web/src/components/landing/showcase/AddWordDemo.tsx`
- `apps/web/src/components/landing/showcase/AppShowcase.tsx`
- `apps/web/src/components/landing/showcase/GroupsDemo.tsx`
- `apps/web/src/components/landing/showcase/LookupDemo.tsx`
- `apps/web/src/components/landing/showcase/PracticeDemo.tsx`
- `apps/web/src/components/landing/showcase/ReviewCardDemo.tsx`
- `apps/web/src/components/landing/showcase/showcase.test.tsx`
- `apps/web/src/components/landing/test-utils.tsx`
- `apps/web/src/components/landing/why-forget.test.tsx`
- `apps/web/src/components/layout/Logo.tsx`
- `apps/web/src/components/layout/SiteFooter.tsx`
- `apps/web/src/components/layout/SkipLink.tsx`
- `apps/web/src/components/sections/LegalDocument.test.tsx`
- `apps/web/src/components/sections/LegalDocument.tsx`
- `apps/web/src/components/sections/LegalDraft.tsx`
- `apps/web/src/components/sections/SourcesList.test.tsx`
- `apps/web/src/components/sections/SourcesList.tsx`
- `apps/web/src/components/seo/JsonLd.tsx`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/ButtonLink.tsx`
- `apps/web/src/components/ui/Container.tsx`
- `apps/web/src/components/ui/ui.test.tsx`

## Design tokens

- `packages/design-tokens/theme.css`
- `packages/design-tokens/dark.css`
- `packages/design-tokens/island.css`
- `packages/design-tokens/dark-pastel.css`

## Thư mục tính năng (mọi file con của một màn hình)

Mỗi component ở bảng trên kéo theo các file trong thư mục tính năng của nó. Liệt kê: `git ls-tree -r --name-only archive/giao-dien-cu-2026-11 -- apps/web/src/features/learner/<thư mục>`.

- `apps/web/src/features/learner/add-word`
- `apps/web/src/features/learner/ads`
- `apps/web/src/features/learner/auth`
- `apps/web/src/features/learner/groups`
- `apps/web/src/features/learner/house-ad`
- `apps/web/src/features/learner/lookup`
- `apps/web/src/features/learner/plans`
- `apps/web/src/features/learner/practice`
- `apps/web/src/features/learner/recall`
- `apps/web/src/features/learner/review`
- `apps/web/src/features/learner/settings`
- `apps/web/src/features/learner/today`
- `apps/web/src/features/learner/transactions`
- `apps/web/src/features/learner/word`
