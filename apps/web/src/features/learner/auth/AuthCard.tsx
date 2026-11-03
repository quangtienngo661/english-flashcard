'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { ApiError } from '@/app-shell/api/problem';
import { apiBaseUrl } from '@/app-shell/config';

/** The white card of K/01–K/06 (title, optional back link, intro line). */
export function AuthCard({
  title,
  intro,
  onBack,
  banner,
  children,
}: {
  title: string;
  intro?: ReactNode;
  onBack?: () => void;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations('App.auth');
  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-6 shadow-sheet md:p-8">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-1.5 text-caption font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t('back')}
        </button>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-title-lg font-bold text-ink">{title}</h1>
        {intro && <p className="text-ui text-muted">{intro}</p>}
      </div>
      {banner}
      {children}
    </section>
  );
}

/** A line under the form for an error that belongs to no field. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-ui text-danger">
      {message}
    </p>
  );
}

const PASSWORD_RULES = ['min_length', 'max_length', 'uppercase', 'lowercase', 'digit', 'special', 'same_as_current'] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

/** The password rules a 400 `validation-failed` named, if any (password-policy.ts in the API). */
export function passwordViolations(error: unknown): PasswordRule[] {
  if (!(error instanceof ApiError) || error.problem.slug !== 'validation-failed') return [];
  return (error.problem.violations ?? []).filter((v): v is PasswordRule => (PASSWORD_RULES as readonly string[]).includes(v));
}

export function PasswordRules({ rules }: { rules: PasswordRule[] }) {
  const t = useTranslations('App.auth.passwordRules');
  if (rules.length === 0) return null;
  return (
    <ul role="alert" className="-mt-2 flex list-disc flex-col gap-0.5 pl-5 text-caption text-danger">
      {rules.map((rule) => (
        <li key={rule}>{t(rule)}</li>
      ))}
    </ul>
  );
}

/**
 * "Tiếp tục với Google" (design §9.1): a full page change to the API, which sends the browser to Google and back. It does not touch the
 * sign-out flag: if the trip fails the old session must not resume by itself (FE38, plan review P21).
 */
export function GoogleButton({ next }: { next: string }) {
  const t = useTranslations('App');
  const locale = useLocale();
  return (
    <button
      type="button"
      onClick={() => {
        // The API is another origin: a full page change, not a Next route.
        const target = new URL('/v1/auth/google/start', apiBaseUrl());
        target.search = new URLSearchParams({ intent: 'login', locale, next }).toString();
        window.location.assign(target.toString());
      }}
      className="flex min-h-control-touch w-full items-center justify-center gap-3 rounded-inner border border-border-strong bg-surface px-4 text-ui font-semibold text-ink outline-none hover:bg-neutral-soft focus-visible:ring-2 focus-visible:ring-primary"
    >
      <GoogleMark />
      {t('auth.google')}
    </button>
  );
}

/** Google's "G" in its own four colours (Google sign-in branding guidelines), decoration beside the button's words. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
