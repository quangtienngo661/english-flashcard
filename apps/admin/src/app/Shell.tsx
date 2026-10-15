import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Dialog, Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover, Button as AriaButton } from 'react-aria-components';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { useTranslations } from 'use-intl';
import { useSession } from '../auth/session-context';
import { useLocaleSwitch } from '../i18n/locale-context';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { canAccess, homePath, navLabelKey, visibleNav, type NavEntry, type NavGroup } from './nav';
import { NAV_ICONS } from './nav-icons';
import { useOffline } from './offline';

function Brand() {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-2 px-3 pb-3 pt-1">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-control bg-primary text-ui font-semibold text-on-primary">
        W
      </span>
      <span translate="no" className="text-ui font-semibold text-ink">
        {t('shell.brand')}
      </span>
    </div>
  );
}

function SidebarNav({ permissions, onNavigate }: { permissions: Parameters<typeof visibleNav>[0]; onNavigate?: () => void }) {
  const t = useTranslations();
  const groups: Array<{ group: NavGroup; items: NavEntry[] }> = [];
  for (const entry of visibleNav(permissions)) {
    const last = groups[groups.length - 1];
    if (last?.group === entry.group) last.items.push(entry);
    else groups.push({ group: entry.group, items: [entry] });
  }
  return (
    <nav aria-label={t('shell.mainNav')} className="flex flex-col gap-0.5">
      {groups.map(({ group, items }) => (
        <div key={group} role="group" aria-labelledby={`nav-group-${group}`} className="flex flex-col gap-0.5">
          <p id={`nav-group-${group}`} className="px-3 pb-1.5 pt-3.5 text-xs uppercase tracking-wider text-muted">
            {t(`navGroups.${group}`)}
          </p>
          {items.map((entry) => {
            const Icon = NAV_ICONS[entry.path];
            return (
              <NavLink
                key={entry.path}
                to={entry.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex min-w-0 items-center gap-2.5 rounded-control px-3 py-2.5 text-ui font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-canvas'
                  }`
                }
              >
                {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
                <span className="truncate">{t(entry.labelKey)}</span>
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function LanguageSwitch() {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleSwitch();
  return (
    <div role="group" aria-label={t('shell.language')} className="flex shrink-0 divide-x divide-border-strong overflow-hidden rounded-control border border-border-strong">
      {(['vi', 'en'] as const).map((l) => (
        <AriaButton
          key={l}
          aria-pressed={locale === l}
          onPress={() => setLocale(l)}
          className={`min-h-control px-2.5 text-ui font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            locale === l ? 'bg-primary-soft text-primary' : 'bg-surface text-ink hover:bg-canvas'
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
  if (!canAccess(pathname, me.permissions)) return <Navigate to={homePath(me.permissions)} replace />;

  const labelKey = navLabelKey(pathname);

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only rounded-control bg-surface px-3 py-2 text-ui font-medium text-primary shadow-sheet outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus-visible:ring-2 focus-visible:ring-primary"
      >
        {t('shell.skipToContent')}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col overflow-y-auto bg-surface px-3 py-4 shadow-sheet shell:flex">
        <Brand />
        <SidebarNav permissions={me.permissions} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col px-page-pad-min pt-4">
        <header className="flex min-h-control-touch items-center gap-3 rounded-panel bg-surface px-4 py-2 shadow-sheet">
          <AriaButton
            aria-label={t('shell.openMenu')}
            onPress={() => setDrawerOpen(true)}
            className="flex min-h-control min-w-control items-center justify-center rounded-control outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-primary shell:hidden"
          >
            <MenuIcon aria-hidden className="size-5" />
          </AriaButton>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{labelKey ? t(labelKey) : ''}</h1>
          <LanguageSwitch />
          <MenuTrigger>
            <AriaButton
              aria-label={`${t('shell.account')}: ${me.email}`}
              className="flex min-h-control min-w-0 items-center gap-1 rounded-control px-2 text-ui font-medium text-ink outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span aria-hidden className="shell:hidden">
                {me.email.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden max-w-64 truncate shell:inline">{me.email}</span>
              <ChevronDown aria-hidden className="size-4 shrink-0" />
            </AriaButton>
            <Popover className="min-w-40 rounded-control bg-surface p-1 shadow-sheet">
              <Menu aria-label={t('shell.account')} onAction={() => void store.logout()} className="outline-none">
                <MenuItem id="logout" className="cursor-pointer rounded-control px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft">
                  {t('shell.logout')}
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </header>

        <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-4 pb-10 pt-6 outline-none">
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
        className="fixed inset-0 z-40 overscroll-contain bg-ink/40 shell:hidden"
      >
        <Modal className="fixed inset-y-0 left-0 w-60 max-w-full bg-surface shadow-sheet outline-none">
          <Dialog aria-label={t('shell.mainNav')} className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4 outline-none">
            <div className="flex items-start justify-between">
              <Brand />
              <AriaButton
                aria-label={t('shell.closeMenu')}
                onPress={() => setDrawerOpen(false)}
                className="flex min-h-control min-w-control items-center justify-center rounded-control outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-primary"
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
