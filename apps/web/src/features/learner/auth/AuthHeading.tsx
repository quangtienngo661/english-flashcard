'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { cn } from '@/lib/cn';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';

const TITLE = {
  // Đăng nhập, Đăng ký: Figma 44 / 38 (35:308, 37:485).
  page: 'text-wm-page-title-mobile md:text-wm-page-title',
  // The centred-card pages: Figma 30 / 26 (36:385…36:591).
  card: 'text-wm-card-heading-mobile md:text-wm-card-heading',
  // "Tài khoản của bạn đã được xóa.": 24 at both sizes (36:549).
  small: 'text-wm-card-title',
};

/**
 * The top of a sign-in page (Figma 36:385 and the others): the optional "Quay lại", the one h1, the intro line, then a banner. The card
 * itself is the layout's ((split) or (card)); this only fills it, so the children follow in the same column.
 */
export function AuthHeading({
  title,
  intro,
  onBack,
  banner,
  above,
  size = 'card',
  centered,
  children,
}: {
  title: string;
  intro?: ReactNode;
  onBack?: () => void;
  banner?: ReactNode;
  /** Drawn above the title (the Google account chip, the deleted-account circle). */
  above?: ReactNode;
  size?: keyof typeof TITLE;
  centered?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations('App.auth');
  return (
    <>
      {onBack && (
        <button type="button" onClick={onBack} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'self-start text-wm-label')}>
          <ArrowLeft aria-hidden className="size-4" />
          {t('back')}
        </button>
      )}
      {above}
      <div className={cn('flex flex-col gap-2', centered && 'items-center text-center')}>
        <h1 className={cn('font-wm-display text-wm-ink', TITLE[size])}>{title}</h1>
        {intro && <p className="font-wm-sans text-wm-base text-wm-muted">{intro}</p>}
      </div>
      {banner}
      {children}
    </>
  );
}

/** "Hoặc" between the main button and Google (Figma 35:344: the word alone, no lines). */
export function OrDivider() {
  const t = useTranslations('App.auth');
  return <p className="text-center font-wm-sans text-wm-caption text-wm-muted">{t('or')}</p>;
}

/** "Chưa có tài khoản? Đăng ký" / "Đã có tài khoản? Đăng nhập" (Figma 35:353). */
export function SwitchAuthLink({ question, label, href }: { question: string; label: string; href: string }) {
  return (
    <p className="text-center font-wm-sans text-wm-small text-wm-muted">
      {question}{' '}
      <Link href={href} className="rounded-wm-control font-semibold text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent">
        {label}
      </Link>
    </p>
  );
}

/** A link inside a sentence (the consent text, "Quên mật khẩu?" under a taken email): bold accent; a new tab for the legal pages. */
export function ConsentLink({ href, newTab, children }: { href: string; newTab?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      target={newTab ? '_blank' : undefined}
      className="w-fit rounded-wm-control font-semibold text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent"
    >
      {children}
    </Link>
  );
}

/** A link in a field's label row ("Quên mật khẩu?", Figma "Ô nhập" có liên kết): 13 px accent, a 44 px hit area on phones. */
export function LabelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-my-3.5 rounded-wm-control py-3.5 font-wm-sans text-wm-label text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent md:my-0 md:py-0"
    >
      {children}
    </Link>
  );
}

/** A line under the form for an error that belongs to no field. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-wm-row bg-wm-fail-soft px-3 py-2 font-wm-sans text-wm-small text-wm-fail">
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
    <ul role="alert" className="-mt-2 flex list-disc flex-col gap-0.5 pl-5 font-wm-sans text-wm-caption text-wm-fail">
      {rules.map((rule) => (
        <li key={rule}>{t(rule)}</li>
      ))}
    </ul>
  );
}
