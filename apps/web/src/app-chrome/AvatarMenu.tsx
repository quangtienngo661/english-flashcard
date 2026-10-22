'use client';

import { Crown, LogOut, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { useSession } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';
import { PlanChip } from './PlanChip';

/** Copy doc §5.1: family + given name ("Nguyễn Lan"), or the given name alone; English puts the given name first. */
export function displayName(me: Pick<Me, 'given_name' | 'family_name' | 'email'>, locale: string): string {
  const parts = locale === 'vi' ? [me.family_name, me.given_name] : [me.given_name, me.family_name];
  return parts.filter(Boolean).join(' ') || me.email;
}

const ITEM =
  'flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft';

/** K/90: the avatar opens name, email, Cài đặt, Gói học (with the plan), Đăng xuất. */
export function AvatarMenu() {
  const t = useTranslations('App.chrome');
  const locale = useLocale();
  const { state, store } = useSession();
  if (state.status !== 'signed-in') return null;
  const { me } = state;
  const initial = (me.given_name ?? me.email).trim().charAt(0).toUpperCase();

  return (
    <MenuTrigger>
      <Button
        aria-label={t('account')}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-body font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {initial}
      </Button>
      <Popover
        placement="bottom end"
        offset={8}
        className="w-64 rounded-inner bg-surface p-1 shadow-menu motion-safe:data-entering:animate-menu-in motion-safe:data-exiting:animate-menu-out"
      >
        <div className="px-3 pb-2 pt-2">
          <p className="truncate text-ui font-semibold text-ink">{displayName(me, locale)}</p>
          <p className="truncate text-caption text-muted">{me.email}</p>
        </div>
        <Menu className="outline-none" aria-label={t('account')}>
          <MenuItem href={`/${locale}/app/settings`} className={ITEM}>
            <Sun aria-hidden className="size-4" />
            {t('settings')}
          </MenuItem>
          <MenuItem href={`/${locale}/app/plans`} className={`${ITEM} justify-between`} textValue={t('plans')}>
            <span className="flex items-center gap-3">
              <Crown aria-hidden className="size-4" />
              {t('plans')}
            </span>
            <PlanChip tone="light" />
          </MenuItem>
          <MenuItem onAction={() => void store?.logout()} className={ITEM}>
            <LogOut aria-hidden className="size-4" />
            {t('logout')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
