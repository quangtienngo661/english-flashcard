'use client';

import { Flag, LogOut, Moon, ReceiptText, Settings, Sun, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
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
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-wm-control px-3 py-2 font-wm-sans text-wm-small-strong text-wm-ink outline-none data-current:bg-wm-bg data-focused:bg-wm-accent-soft';
const ICON = 'size-4 text-wm-muted';

/** A ref that puts `aria-current="page"` (and `data-current`, for the fill) on the item of the open page. */
function markCurrent(current: boolean) {
  return (element: HTMLElement | null) => {
    if (!element) return;
    element.toggleAttribute('data-current', current);
    if (current) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  };
}

/**
 * Figma "Menu ảnh đại diện" (181:316): name and email, then Tài khoản, Cài đặt, Lịch sử giao dịch, Báo lỗi của tôi, Đăng xuất. Báo lỗi
 * opens /app/settings/reports (ruling R11, M6.8). The theme switch has no place in the new top bar, so it sits here, before Đăng xuất
 * (ruling R12). The item of the open page has `aria-current="page"` and the `--bg` fill (note on 181:316, M7.3).
 */
export function AvatarMenu() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const { state, store } = useSession();
  const { resolved, setChoice } = useTheme();
  const pathname = usePathname();
  if (state.status !== 'signed-in') return null;
  const { me } = state;
  const initial = (me.given_name ?? me.email).trim().charAt(0).toUpperCase();
  const toDark = resolved !== 'dark';
  const pages = [
    { href: `/${locale}/app/settings/account`, icon: UserRound, label: t('menu.account') },
    { href: `/${locale}/app/settings`, icon: Settings, label: t('settings') },
    { href: `/${locale}/app/settings/transactions`, icon: ReceiptText, label: t('menu.transactions') },
    { href: `/${locale}/app/settings/reports`, icon: Flag, label: t('menu.reports') },
  ];
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
        className="w-72 rounded-wm-row bg-wm-surface p-2 shadow-wm-pop motion-safe:data-entering:animate-menu-in motion-safe:data-exiting:animate-wm-pop-out"
      >
        <div className="px-3 pb-3 pt-2">
          <p className="truncate font-wm-sans text-wm-base-strong text-wm-ink">{displayName(me, locale)}</p>
          <p className="truncate font-wm-sans text-wm-small text-wm-muted">{me.email}</p>
        </div>
        <Menu className="outline-none" aria-label={t('account')}>
          <Separator className="mx-1 mb-1 border-t border-wm-line" />
          {pages.map(({ href, icon: Icon, label }) => (
            // React Aria drops `aria-current` from MenuItem props, so the ref sets it on the rendered link.
            <MenuItem key={href} href={href} ref={markCurrent(pathname === href)} className={ITEM}>
              <Icon aria-hidden className={ICON} />
              {label}
            </MenuItem>
          ))}
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
