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
      {t('auth.google')}
    </button>
  );
}
