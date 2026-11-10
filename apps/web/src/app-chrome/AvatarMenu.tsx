'use client';

import { Flag, LogOut, Moon, ReceiptText, Settings, Sun, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Menu, MenuItem, MenuTrigger, Popover, Separator } from 'react-aria-components';
import { useSession } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';
import { useTheme } from '@/app-shell/theme/ThemeProvider';

/** Copy doc §5.1: family + given name ("Nguyễn Lan"), or the given name alone; English puts the given name first. */
export function displayName(me: Pick<Me, 'given_name' | 'family_name' | 'email'>, locale: string): string {
  const parts = locale === 'vi' ? [me.family_name, me.given_name] : [me.given_name, me.family_name];
  return parts.filter(Boolean).join(' ') || me.email;
}

const ITEM =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-wm-md px-3 py-2 font-wm-sans text-wm-small-strong text-wm-ink outline-none data-focused:bg-wm-accent-soft';
const ICON = 'size-4 text-wm-muted';

/**
 * Figma "Menu ảnh đại diện" (181:316): name and email, then Tài khoản, Cài đặt, Lịch sử giao dịch, Báo lỗi của tôi, Đăng xuất. The
 * theme switch has no place in the new top bar, so it sits here, before Đăng xuất (ruling R7). Báo lỗi goes to the practice history's
 * reports tab until M6 adds /app/settings/reports (ruling R6).
 */
export function AvatarMenu() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const { state, store } = useSession();
  const { resolved, setChoice } = useTheme();
  if (state.status !== 'signed-in') return null;
  const { me } = state;
  const initial = (me.given_name ?? me.email).trim().charAt(0).toUpperCase();
  const toDark = resolved !== 'dark';
  return (
    <MenuTrigger>
      <Button
        aria-label={t('account')}
        className="flex size-9 shrink-0 items-center justify-center rounded-wm-pill bg-wm-accent font-wm-sans text-wm-base-strong text-wm-on-accent outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent"
      >
        {initial}
      </Button>
      <Popover
        placement="bottom end"
        offset={8}
        className="w-72 rounded-wm-modal bg-wm-surface p-2 shadow-wm-pop motion-safe:data-entering:animate-menu-in motion-safe:data-exiting:animate-wm-pop-out"
      >
        <div className="px-3 pb-3 pt-2">
          <p className="truncate font-wm-sans text-wm-base-strong text-wm-ink">{displayName(me, locale)}</p>
          <p className="truncate font-wm-sans text-wm-small text-wm-muted">{me.email}</p>
        </div>
        <Menu className="outline-none" aria-label={t('account')}>
          <Separator className="mx-1 mb-1 border-t border-wm-line" />
          <MenuItem href={`/${locale}/app/settings/account`} className={ITEM}>
            <UserRound aria-hidden className={ICON} />
            {t('menu.account')}
          </MenuItem>
          <MenuItem href={`/${locale}/app/settings`} className={ITEM}>
            <Settings aria-hidden className={ICON} />
            {t('settings')}
          </MenuItem>
          <MenuItem href={`/${locale}/app/settings/transactions`} className={ITEM}>
            <ReceiptText aria-hidden className={ICON} />
            {t('menu.transactions')}
          </MenuItem>
          <MenuItem href={`/${locale}/app/practice/history?tab=reports`} className={ITEM}>
            <Flag aria-hidden className={ICON} />
            {t('menu.reports')}
          </MenuItem>
          <MenuItem onAction={() => setChoice(toDark ? 'dark' : 'light')} className={ITEM}>
            {toDark ? <Moon aria-hidden className={ICON} /> : <Sun aria-hidden className={ICON} />}
            {toDark ? t('themeToDark') : t('themeToLight')}
          </MenuItem>
          <Separator className="mx-1 my-1 border-t border-wm-line" />
          <MenuItem onAction={() => void store?.logout()} className={ITEM}>
            <LogOut aria-hidden className={ICON} />
            {t('logout')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
