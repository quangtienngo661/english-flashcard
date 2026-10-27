import { Menu as MenuIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Dialog, Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover, Button as AriaButton } from 'react-aria-components';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useTranslations } from 'use-intl';
import { useSession } from '../auth/session-context';
import { useLocaleSwitch } from '../i18n/locale-context';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { canAccess, navLabelKey, visibleNav, type NavEntry, type NavGroup } from './nav';
import { NAV_ICONS } from './nav-icons';
import { NoAccess } from './NoAccess';
import { useOffline } from './offline';
import { ShellSlotsContext } from './shell-slots';

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
          <p id={`nav-group-${group}`} className="px-2.5 pb-1 pt-3.5 text-xs font-medium text-muted">
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
                  `flex min-w-0 items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-ui pointer-coarse:min-h-control-touch text-ink outline-none transition-colors duration-instant ease-standard hover:bg-primary/7 focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'font-semibold' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
                    {/* The open page is marked like a highlighter across the lower half of its name (design §6.1). */}
                    <span className={`truncate ${isActive ? 'highlighter' : ''}`}>{t(entry.labelKey)}</span>
                  </>
                )}
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
    <div role="group" aria-label={t('shell.language')} className="flex gap-1">
      {(['vi', 'en'] as const).map((l) => (
        <AriaButton
          key={l}
          aria-pressed={locale === l}
          onPress={() => setLocale(l)}
          className={`min-h-8 rounded-sm px-2.5 text-xs pointer-coarse:min-h-control-touch font-semibold outline-none transition-colors duration-instant ease-standard focus-visible:ring-2 focus-visible:ring-primary ${
            locale === l ? 'bg-ink text-on-primary' : 'text-muted hover:bg-primary/7'
          }`}
        >
          {l.toUpperCase()}
        </AriaButton>
      ))}
    </div>
  );
}

function AccountMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const t = useTranslations();
  return (
    <MenuTrigger>
      <AriaButton
        aria-label={`${t('shell.account')}: ${email}`}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-sm px-2.5 py-2 text-left outline-none transition-colors duration-instant ease-standard hover:bg-primary/7 focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-extrabold text-on-primary">
          {email.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 truncate text-ui text-ink">{email}</span>
      </AriaButton>
      {/* The account sits at the foot of the sidebar, so its menu opens upwards. */}
      <Popover placement="top start" offset={4} className="min-w-48 rounded-inner bg-surface p-1.5 shadow-menu motion-safe:data-entering:animate-menu-in motion-safe:placement-top:data-entering:animate-menu-in-up motion-safe:data-exiting:animate-menu-out">
        <Menu aria-label={t('shell.account')} onAction={onLogout} className="outline-none">
          <MenuItem id="logout" className="cursor-pointer rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft">
            {t('shell.logout')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function SidebarFoot({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-2 pt-3">
      <div className="px-2.5">
        <LanguageSwitch />
      </div>
      <AccountMenu email={email} onLogout={onLogout} />
    </div>
  );
}

/**
 * Direction B shell (design §6.1): the sidebar of admin A sits straight on the canvas; every page lives on one white
 * sheet whose head holds the page title and the page's primary action (`PageActions`). From `panel` (87rem) the sheet
 * gains a second column for the detail panel (`usePanelSlot`). Below `shell` (64rem): a blue top bar and a drawer.
 */
export function Shell() {
  const { state, store } = useSession();
  const t = useTranslations();
  const { pathname } = useLocation();
  const { offline, retry } = useOffline();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actions, setActions] = useState<HTMLDivElement | null>(null);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const slots = useMemo(() => ({ actions, panel }), [actions, panel]);

  if (state.status !== 'signed-in') return null;
  const { me } = state;
  // A path the user may not open keeps the entry's title and says so in the page area (A/71e); the sidebar already hides the entry.
  const allowed = canAccess(pathname, me.permissions);

  const labelKey = navLabelKey(pathname);
  const logout = () => void store.logout();

  return (
    <div className="flex min-h-dvh text-ink">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only rounded-control bg-surface px-3 py-2 text-ui font-medium text-primary shadow-menu outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus-visible:ring-2 focus-visible:ring-primary"
      >
        {t('shell.skipToContent')}
      </a>
      {/* Only the menu list scrolls, so VI/EN and the account stay at the foot on short screens. */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col px-3 pb-4 pt-5 shell:flex">
        <div className="shrink-0 px-2.5 pb-3">
          <Logo />
        </div>
        <div className="scroll-fade min-h-0 flex-1 overflow-y-auto">
          <SidebarNav permissions={me.permissions} />
        </div>
        <SidebarFoot email={me.email} onLogout={logout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col shell:py-3 shell:pr-3">
        <div className="flex items-center gap-2.5 bg-primary px-3 pb-4 pt-2.5 text-on-primary shell:hidden">
          <AriaButton
            aria-label={t('shell.openMenu')}
            onPress={() => setDrawerOpen(true)}
            className="flex min-h-control min-w-control items-center justify-center rounded-control outline-none pointer-coarse:min-h-control-touch pointer-coarse:min-w-control-touch hover:bg-on-primary/15 focus-visible:ring-2 focus-visible:ring-accent"
          >
            <MenuIcon aria-hidden className="size-5" />
          </AriaButton>
          <Logo tone="onPrimary" />
        </div>

        <ShellSlotsContext.Provider value={slots}>
          <main
            id="main"
            tabIndex={-1}
            className="-mt-2 flex min-w-0 flex-1 flex-col overflow-clip rounded-t-card bg-surface outline-none shell:mt-0 shell:rounded-card shell:shadow-sheet panel:grid panel:grid-sheet"
          >
            <div className="flex min-w-0 flex-col gap-4 px-page-pad-min pb-10 shell:px-page-pad-max">
              <header className="flex flex-wrap items-end justify-between gap-4 pt-6 shell:pt-7">
                <h1 id="page-title" tabIndex={-1} className="min-w-0 break-words text-3xl font-extrabold tracking-tight text-ink outline-none">
                  {labelKey ? t(labelKey) : ''}
                </h1>
                <div ref={setActions} className="flex flex-wrap gap-2 empty:hidden" />
              </header>
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
              {allowed ? <Outlet /> : <NoAccess />}
            </div>
            <div ref={setPanel} className="min-w-0" />
          </main>
        </ShellSlotsContext.Provider>
      </div>

      <ModalOverlay isOpen={drawerOpen} onOpenChange={setDrawerOpen} isDismissable className="fixed inset-0 z-40 overscroll-contain bg-ink/45 shell:hidden motion-safe:data-entering:animate-overlay-in motion-safe:data-exiting:animate-overlay-out">
        <Modal className="fixed inset-y-0 left-0 w-drawer max-w-full bg-canvas outline-none motion-safe:data-entering:animate-drawer-in motion-safe:data-exiting:animate-drawer-out">
          <Dialog aria-label={t('shell.mainNav')} className="flex h-full flex-col px-3 pb-4 pt-5 outline-none">
            <div className="flex shrink-0 items-center justify-between pb-3 pl-2.5">
              <Logo />
              <AriaButton
                aria-label={t('shell.closeMenu')}
                onPress={() => setDrawerOpen(false)}
                className="flex min-h-control min-w-control items-center justify-center rounded-control outline-none pointer-coarse:min-h-control-touch pointer-coarse:min-w-control-touch hover:bg-primary/7 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X aria-hidden className="size-5" />
              </AriaButton>
            </div>
            <div className="scroll-fade min-h-0 flex-1 overflow-y-auto">
              <SidebarNav permissions={me.permissions} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <SidebarFoot email={me.email} onLogout={logout} />
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
