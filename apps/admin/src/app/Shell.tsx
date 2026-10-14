import { ChevronDown, Database, FileDown, FileUp, Menu as MenuIcon, Send, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Dialog, Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover, Button as AriaButton } from 'react-aria-components';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { useTranslations } from 'use-intl';
import { useSession } from '../auth/session-context';
import { useLocaleSwitch } from '../i18n/locale-context';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { canAccess, firstVisiblePath, navLabelKey, visibleNav } from './nav';
import { useOffline } from './offline';

const ICONS: Record<string, LucideIcon> = {
  '/uploads': FileUp,
  '/publish-jobs': Send,
  '/export': FileDown,
  '/sources': Database,
  '/staff': ShieldCheck,
};

function Brand() {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-2 px-3 pb-4 pt-1">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-control bg-primary text-ui font-semibold text-on-primary">
        W
      </span>
      <span className="text-ui font-semibold text-ink">{t('shell.brand')}</span>
    </div>
  );
}

function SidebarNav({ permissions, onNavigate }: { permissions: Parameters<typeof visibleNav>[0]; onNavigate?: () => void }) {
  const t = useTranslations();
  return (
    <nav aria-label={t('shell.mainNav')} className="flex flex-col gap-1">
      {visibleNav(permissions).map((entry) => {
        const Icon = ICONS[entry.path];
        return (
          <NavLink
            key={entry.path}
            to={entry.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-w-0 items-center gap-2.5 rounded-control px-3 py-2 text-ui font-medium ${
                isActive ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-bg'
              }`
            }
          >
            {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
            <span className="truncate">{t(entry.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function LanguageSwitch() {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleSwitch();
  return (
    <div role="group" aria-label={t('shell.language')} className="flex shrink-0 overflow-hidden rounded-control border border-border-strong">
      {(['vi', 'en'] as const).map((l) => (
        <AriaButton
          key={l}
          aria-pressed={locale === l}
          onPress={() => setLocale(l)}
          className={`min-h-control px-2.5 text-ui font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            locale === l ? 'bg-primary-soft text-primary' : 'bg-surface text-ink'
          }`}
        >
          {l.toUpperCase()}
        </AriaButton>
      ))}
    </div>
  );
}

export function Shell() {
  const { state, store } = useSession();
  const t = useTranslations();
  const { pathname } = useLocation();
  const { offline, retry } = useOffline();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (state.status !== 'signed-in') return null;
  const { me } = state;
  const first = firstVisiblePath(me.permissions);
  if (!canAccess(pathname, me.permissions)) return first ? <Navigate to={first} replace /> : null;

  const labelKey = navLabelKey(pathname);

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <aside className="hidden w-60 min-w-sidebar-min max-w-sidebar-max shrink-0 flex-col border-r border-border bg-surface px-3 py-4 shell:flex">
        <Brand />
        <SidebarNav permissions={me.permissions} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-topbar-min items-center gap-3 border-b border-border bg-surface px-page-pad-min py-2">
          <AriaButton
            aria-label={t('shell.openMenu')}
            onPress={() => setDrawerOpen(true)}
            className="flex min-h-control min-w-control items-center justify-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-primary shell:hidden"
          >
            <MenuIcon aria-hidden className="size-5" />
          </AriaButton>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{labelKey ? t(labelKey) : ''}</h1>
          <LanguageSwitch />
          <MenuTrigger>
            <AriaButton
              aria-label={`${t('shell.account')}: ${me.email}`}
              className="flex min-h-control min-w-0 items-center gap-1 rounded-control px-2 text-ui font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="max-w-32 truncate shell:max-w-64">{me.email}</span>
              <ChevronDown aria-hidden className="size-4 shrink-0" />
            </AriaButton>
            <Popover className="min-w-40 rounded-control border border-border bg-surface p-1 shadow-lg">
              <Menu aria-label={t('shell.account')} onAction={() => void store.logout()} className="outline-none">
                <MenuItem id="logout" className="cursor-pointer rounded-control px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft">
                  {t('shell.logout')}
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-4 px-page-pad-min pb-10 pt-8 shell:px-page-pad-max">
          {offline && (
            <Banner
              variant="offline"
              action={
                <Button variant="secondary" onPress={retry}>
                  {t('common.retry')}
                </Button>
              }
            >
              {t('offline.message')}
            </Banner>
          )}
          <Outlet />
        </main>
      </div>

      <ModalOverlay
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        isDismissable
        className="fixed inset-0 z-40 bg-ink/40 shell:hidden"
      >
        <Modal className="fixed inset-y-0 left-0 w-60 max-w-full bg-surface shadow-lg outline-none">
          <Dialog aria-label={t('shell.mainNav')} className="flex h-full flex-col gap-1 px-3 py-4 outline-none">
            <div className="flex items-start justify-between">
              <Brand />
              <AriaButton
                aria-label={t('shell.closeMenu')}
                onPress={() => setDrawerOpen(false)}
                className="flex min-h-control min-w-control items-center justify-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X aria-hidden className="size-5" />
              </AriaButton>
            </div>
            <SidebarNav permissions={me.permissions} onNavigate={() => setDrawerOpen(false)} />
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
