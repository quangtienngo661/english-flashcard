'use client';

import { Check, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { displayName } from '@/app-chrome/AvatarMenu';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { createFormat, useFormat } from '@/app-shell/format';
import { hardReplace } from '@/app-shell/navigate';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import type { ThemeChoice } from '@/app-shell/theme/theme';
import { useTheme } from '@/app-shell/theme/ThemeProvider';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { proLastDay } from '@/features/learner/plans/pro-last-day';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { useDesktop } from '@/lib/use-desktop';
import { Segmented } from '@/ui/Segmented';
import { Select } from '@/ui/Select';
import { Switch } from '@/ui/Switch';
import { Skeleton } from '@/ui/Skeleton';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE, TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { useReminders, useSetReminders, useUpdateProfile } from './settings-api';
import { SETTINGS_ROW, SettingsRow, SettingsSection } from './SettingsRows';
import { SettingsToc } from './SettingsToc';
import { ShortcutRows } from './Shortcuts';
import { UsageRows } from './UsageSection';

const SECTIONS = ['personal', 'plan', 'learning', 'notifications', 'shortcuts', 'account'] as const;
const SECTION_TITLE = { personal: 'personal', plan: 'planUsage', learning: 'learning', notifications: 'notifications', shortcuts: 'shortcuts', account: 'account' } as const;

/** A text link of the "Nút chữ" look; `row` is read after the visible text ("Xem Lịch sử giao dịch"), so each link names its row. */
function RowLink({ href, row, tone = 'normal', children }: { href: string; row?: string; tone?: 'normal' | 'delete'; children: string }) {
  return (
    <Link href={href} aria-label={row ? `${children} ${row}` : undefined} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE[tone], 'shrink-0')}>
      {children}
    </Link>
  );
}

/**
 * Cài đặt (Figma 120:4295 / 120:4559, K/50): title, the Mục lục on desktop, then six section cards: personal details, plan and usage,
 * learning, notifications, shortcuts (desktop only) and account.
 */
export function SettingsPage() {
  const t = useTranslations('App.settings');
  const tPlan = useTranslations('App.chrome.plan');
  const tCommon = useTranslations('App.common');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const errorText = useErrorMessage();
  const format = useFormat();
  // Birth dates and the reminder time are calendar values, not instants: shown as written, in no time zone.
  const calendar = createFormat(locale, 'UTC');
  const desktop = useDesktop();
  const { state, store } = useSession();
  const { choice, setChoice } = useTheme();
  const entitlements = useEntitlements();
  const config = useAppConfig();
  const reminders = useReminders();
  const setReminders = useSetReminders();
  const updateProfile = useUpdateProfile();
  const toc = useMemo(() => SECTIONS.map((id) => ({ id, title: t(SECTION_TITLE[id]) })), [t]);

  const reminderPress = useSubmitOnce(async (key) => setReminders(!reminders.data?.enabled, key));

  if (state.status !== 'signed-in') return null;
  const { me } = state;

  async function changeLanguage(next: AppLocale) {
    if (next === locale) return;
    try {
      await updateProfile({ native_language: next });
      await store?.recheck();
      hardReplace(pathname.replace(/^\/(vi|en)(?=\/|$)/, `/${next}`));
    } catch (error) {
      showToast(errorText(error), 'danger');
    }
  }

  async function toggleReminders() {
    try {
      await reminderPress.submit();
    } catch (error) {
      showToast(errorText(error), 'danger');
    }
  }

  const methods = me.sign_in_methods ?? ['password'];
  const title = (id: (typeof SECTIONS)[number]) => t(SECTION_TITLE[id]);

  // "Pro · tới hết 07/02/2027": the plan in ink, the last day muted (Figma row 4); the plan name alone when no end is known.
  // Loading: a skeleton bar, read as "Đang tải…" rather than an ellipsis.
  let plan: ReactNode = (
    <div>
      <Skeleton className="h-5 w-40" />
      <span className="sr-only">{tCommon('loading')}</span>
    </div>
  );
  if (entitlements.data) {
    const lastDay = entitlements.data.plan === 'free' ? null : proLastDay(entitlements.data);
    plan = lastDay ? (
      <p className="text-wm-muted">
        {t.rich('planUntil', {
          plan: tPlan(entitlements.data.plan),
          date: format.date(lastDay, 'numeric'),
          b: (chunks) => <span className="font-semibold text-wm-ink">{chunks}</span>,
        })}
      </p>
    ) : (
      <p>{tPlan(entitlements.data.plan)}</p>
    );
  }

  return (
    <>
      <PageTitle>{t('title')}</PageTitle>
      <div className="flex gap-8">
        <SettingsToc entries={toc} />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SettingsSection id="personal" title={title('personal')}>
            <SettingsRow
              label={t('fullName')}
              value={displayName(me, locale)}
              control={<RowLink href={`/${locale}/app/settings/account`} row={t('fullName')}>{t('edit')}</RowLink>}
            />
            <SettingsRow label={t('birthDate')} value={me.birth_date ? calendar.date(`${me.birth_date}T00:00:00Z`, 'numeric') : '—'} />
            <SettingsRow label={t('email')} value={me.email} />
          </SettingsSection>

          <SettingsSection id="plan" title={title('plan')}>
            <SettingsRow
              label={t('currentPlan')}
              value={plan}
              control={<RowLink href={`/${locale}/app/plans`}>{t('seePlans')}</RowLink>}
            />
            <UsageRows />
          </SettingsSection>

          <SettingsSection id="learning" title={title('learning')}>
            <SettingsRow
              label={t('language')}
              hint={t('languageHint')}
              control={
                <Select
                  label={t('language')}
                  hideLabel
                  size="sm"
                  className="flex w-36 flex-col"
                  value={locale}
                  onChange={(next) => void changeLanguage(next as AppLocale)}
                  items={[{ id: 'vi', label: t('languageVi') }, { id: 'en', label: t('languageEn') }]}
                />
              }
            />
            <SettingsRow
              label={t('theme')}
              hint={t('themeHint')}
              wide
              control={
                <Segmented<ThemeChoice>
                  label={t('theme')}
                  value={choice}
                  onChange={setChoice}
                  compact
                  fullWidth={!desktop}
                  options={[
                    { id: 'light', label: t('themeLight') },
                    { id: 'dark', label: t('themeDark') },
                    { id: 'system', label: t('themeSystem') },
                  ]}
                />
              }
            />
          </SettingsSection>

          <SettingsSection id="notifications" title={title('notifications')}>
            <div className={SETTINGS_ROW}>
              <Switch
                label={t('reminders')}
                description={t('remindersHint', { time: calendar.time(`2026-01-01T${config.data?.reminders.send_time ?? '20:00'}:00Z`) })}
                isSelected={reminders.data?.enabled ?? false}
                isDisabled={!reminders.data || reminderPress.busy}
                onChange={() => void toggleReminders()}
              />
            </div>
          </SettingsSection>

          <div className="hidden md:block">
            <SettingsSection id="shortcuts" title={title('shortcuts')}>
              <ShortcutRows />
            </SettingsSection>
          </div>

          <SettingsSection id="account" title={title('account')}>
            <SettingsRow
              label={t('signInMethods')}
              value={
                <ul aria-label={t('signInMethods')} className="flex flex-wrap gap-x-4 gap-y-1">
                  {methods.map((m) => (
                    <li key={m} className="flex items-center gap-1.5 font-wm-sans text-wm-small-strong text-wm-pass">
                      <Check aria-hidden className="size-3.5 shrink-0" />
                      {t(m === 'google' ? 'methodGoogle' : 'methodPassword')}
                    </li>
                  ))}
                </ul>
              }
            />
            {/* A Google-only account has no password: the way to get one is "forgot password" (IR7, B8-2). */}
            {!methods.includes('password') && (
              <SettingsRow
                value={<span className="font-wm-sans text-wm-caption text-wm-muted">{t('setPasswordHint')}</span>}
                control={<RowLink href={`/${locale}/app/forgot-password`}>{t('setPassword')}</RowLink>}
              />
            )}
            <SettingsRow label={t('transactions')} control={<RowLink href={`/${locale}/app/settings/transactions`} row={t('transactions')}>{t('view')}</RowLink>} />
            <SettingsRow label={t('reports')} control={<RowLink href={`/${locale}/app/settings/reports`} row={t('reports')}>{t('view')}</RowLink>} />
            <SettingsRow
              label={t('logout')}
              hint={t('logoutHint')}
              control={
                <TextButton onPress={() => void store?.logout()}>
                  <LogOut aria-hidden className="size-4" />
                  {t('logout')}
                </TextButton>
              }
            />
            {/* Staff do not delete themselves: an admin does it for them (D18). */}
            {me.staff_role !== null ? (
              <SettingsRow value={<span className="text-wm-muted">{t('deleteAccountStaff')}</span>} />
            ) : (
              <SettingsRow control={<RowLink href={`/${locale}/app/settings/delete-account`} tone="delete">{t('deleteAccount')}</RowLink>} />
            )}
          </SettingsSection>
        </div>
      </div>
    </>
  );
}
