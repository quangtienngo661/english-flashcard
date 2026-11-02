import { Logo } from '@/app-chrome/Logo';
import { ThemeToggleButton } from '@/app-chrome/ThemeToggle';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';

// The app's own navy top bar (app-chrome/TopBar.tsx), reduced to what a visitor needs: the page anchors, theme, Đăng nhập, Đăng ký.
// Below lg the anchors go; below sm only the theme button and Đăng ký stay beside the logo (320 px, design LRE2).
export function LandingHeader({ copy, locale }: { copy: LandingCopy['nav']; locale: AppLocale }) {
  const anchor =
    'rounded-control py-2.5 pr-3.5 pl-3 text-body font-medium text-on-navy outline-none hover:bg-navy-raised focus-visible:ring-2 focus-visible:ring-accent';
  return (
    <header className="sticky top-0 z-40 bg-navy text-on-navy">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href={`/${locale}`} className="shrink-0 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo />
        </a>
        <nav aria-label={copy.label} className="hidden items-center gap-1.5 lg:flex">
          <a href="#tinh-nang" className={anchor}>
            {copy.features}
          </a>
          <a href="#bai-tap" className={anchor}>
            {copy.exercises}
          </a>
          <a href="#goi" className={anchor}>
            {copy.plans}
          </a>
          <a href="#hoi-dap" className={anchor}>
            {copy.faq}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggleButton toLight={copy.themeToLight} toDark={copy.themeToDark} />
          <ButtonLink variant="navy" href={`/${locale}/app/login`} className="hidden min-h-control px-4 text-ui sm:inline-flex">
            {copy.login}
          </ButtonLink>
          <ButtonLink variant="sticker" href={`/${locale}/app/register`} className="min-h-control px-4 text-ui">
            {copy.signup}
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
