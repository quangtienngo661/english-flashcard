'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { displayName } from '@/app-chrome/AvatarMenu';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { createFormat } from '@/app-shell/format';
import { hardReplace } from '@/app-shell/navigate';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import type { ThemeChoice } from '@/app-shell/theme/theme';
import { useTheme } from '@/app-shell/theme/ThemeProvider';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { Segmented } from '@/app-ui/Segmented';
import { Switch } from '@/app-ui/Switch';
import { showToast } from '@/app-ui/Toast';
import type { AppLocale } from '@/i18n/routing';
import { useReminders, useSetReminders, useUpdateProfile } from './settings-api';
import { ShortcutList } from './Shortcuts';
import { UsageRows } from './UsageSection';

/** Turned on with M4b (Lịch sử giao dịch, D18). */
export const SHOW_TRANSACTIONS = true;

const LINK = 'shrink-0 text-ui font-semibold text-primary underline-offset-2 hover:underline';

/** K/50, copy doc §12 (points 3, 6): personal details, plan and usage, learning, notifications, shortcuts, account. */
export function SettingsPage() {
  const t = useTranslations('App.settings');
  const tCommon = useTranslations('App.common');
  const tPlan = useTranslations('App.chrome.plan');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const errorText = useErrorMessage();
  // Birth dates and the reminder time are calendar values, not instants: shown as written, in no time zone.
  const calendar = createFormat(locale, 'UTC');
  const { state, store } = useSession();
  const { choice, setChoice } = useTheme();
  const entitlements = useEntitlements();
  const config = useAppConfig();
  const reminders = useReminders();
  const setReminders = useSetReminders();
  const updateProfile = useUpdateProfile();

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

  const account = `/${locale}/app/settings/account`;
  const methods = me.sign_in_methods ?? ['password'];

  return (
    <AppShell variant="sub" back={{ href: `/${locale}/app`, label: tCommon('back') }}>
      <PageTitle>{t('title')}</PageTitle>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Section title={t('personal')}>
          <Row title={t('fullName')} detail={displayName(me, locale)} action={<Link href={account} className={LINK}>{t('edit')}</Link>} />
          <Row
            title={t('birthDate')}
            detail={me.birth_date ? calendar.date(`${me.birth_date}T00:00:00Z`, 'full') : '—'}
            action={<Link href={account} className={LINK}>{t('edit')}</Link>}
          />
          <Row title={t('email')} detail={me.email} />
        </Section>

        <Section title={t('planUsage')}>
          <Row
            title={t('currentPlan')}
            detail={entitlements.data ? tPlan(entitlements.data.plan) : '…'}
            href={`/${locale}/app/plans`}
            action={
              <span className="shrink-0 text-ui font-semibold text-primary underline-offset-2 group-hover:underline">
                <span className="hidden md:inline">{t('seePlans')}</span>
                <ChevronRight aria-hidden className="size-5 text-muted md:hidden" />
              </span>
            }
          />
          <UsageRows />
        </Section>

        <Section title={t('learning')}>
          <Row
            title={t('language')}
            detail={t('languageHint')}
            action={
              <Choice
                label={t('language')}
                value={locale}
                onChange={(next) => void changeLanguage(next)}
                options={[{ id: 'vi', label: 'Tiếng Việt' }, { id: 'en', label: 'English' }]}
              />
            }
          />
          <Row
            title={t('theme')}
            detail={t('themeHint')}
            action={
              <Choice<ThemeChoice>
                label={t('theme')}
                value={choice}
                onChange={setChoice}
                options={[
                  { id: 'light', label: t('themeLight') },
                  { id: 'dark', label: t('themeDark') },
                  { id: 'system', label: t('themeSystem') },
                ]}
              />
            }
          />
        </Section>

        <Section title={t('notifications')}>
          <li className="py-4">
            <Switch
              label={t('reminders')}
              description={t('remindersHint', { time: calendar.time(`2026-01-01T${config.data?.reminders.send_time ?? '20:00'}:00Z`) })}
              isSelected={reminders.data?.enabled ?? false}
              isDisabled={!reminders.data || reminderPress.busy}
              onChange={() => void toggleReminders()}
            />
          </li>
        </Section>

        <div className="hidden md:block">
          <Section title={t('shortcuts')}>
            <li className="py-4">
              <ShortcutList />
            </li>
          </Section>
        </div>

        <Section title={t('account')}>
          {SHOW_TRANSACTIONS && (
            <Row
              title={t('transactions')}
              href={`/${locale}/app/settings/transactions`}
              action={<ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />}
            />
          )}
          <Row
            className="hidden md:flex"
            title={t('logout')}
            detail={t('logoutHint')}
            action={
              <Button variant="quiet" onPress={() => void store?.logout()}>
                {t('logout')}
              </Button>
            }
          />
          <Row title={t('signInMethods')} detail={methods.map((m) => t(m === 'google' ? 'methodGoogle' : 'methodPassword')).join(' · ')} />
          {/* A Google-only account has no password: the way to get one is "forgot password" (IR7). */}
          {!methods.includes('password') && (
            <Row
              title={t('setPassword')}
              detail={t('setPasswordHint')}
              href={`/${locale}/app/forgot-password`}
              action={<ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />}
            />
          )}
          {/* Staff do not delete themselves: an admin does it for them (D18). */}
          {me.staff_role !== null ? (
            <Row title={t('deleteAccount')} detail={t('deleteAccountStaff')} />
          ) : (
            <Row
              title={t('deleteAccount')}
              href={`/${locale}/app/settings/delete-account`}
              action={<ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />}
            />
          )}
        </Section>
        {/* M/90: on phones sign-out is the last, full-width button. */}
        <Button variant="quiet" size="lg" className="w-full md:hidden" onPress={() => void store?.logout()}>
          {t('logout')}
        </Button>
      </div>
    </AppShell>
  );
}

/** K/50 shows a pill switch; M/90 shows the current value and a chevron that opens the same choice in a sheet. */
function Choice<T extends string>(props: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (id: T) => void }) {
  const [open, setOpen] = useState(false);
  const current = props.options.find((o) => o.id === props.value)?.label ?? '';
  return (
    <>
      <div className="hidden md:block">
        <Segmented {...props} />
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-ui text-muted outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
      >
        {current}
        <ChevronRight aria-hidden className="size-5" />
      </button>
      {open && (
        <Dialog isOpen onOpenChange={setOpen} title={props.label}>
          <Segmented
            {...props}
            onChange={(id) => {
              props.onChange(id);
              setOpen(false);
            }}
          />
        </Dialog>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-caption font-semibold text-muted">{title}</h2>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface px-4 md:px-5">{children}</ul>
    </section>
  );
}

function Row({ title, detail, action, className = 'flex', href }: { title: string; detail?: string; action?: ReactNode; className?: string; href?: string }) {
  if (href)
    // The whole row is the link when it has one destination (audit 26/10/2026 #10).
    return (
      <li>
        <Link
          href={href}
          className="group flex min-h-control-touch items-center justify-between gap-3 rounded-inner py-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-ui font-semibold text-ink">{title}</span>
            {detail && <span className="break-words text-caption text-muted">{detail}</span>}
          </div>
          {action}
        </Link>
      </li>
    );
  return (
    <li className={`${className} flex-wrap items-center justify-between gap-3 py-4`}>
      <div className="flex min-w-0 flex-col">
        <span className="text-ui font-semibold text-ink">{title}</span>
        {detail && <span className="break-words text-caption text-muted">{detail}</span>}
      </div>
      {action}
    </li>
  );
}
