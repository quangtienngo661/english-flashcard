'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { joinWaitlist } from '@/features/waitlist/actions';
import type { WaitlistState } from '@/features/waitlist/store';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';

export type WaitlistLabels = Record<
  'emailLabel' | 'emailPlaceholder' | 'submit' | 'submitting' | 'invalidEmail' | 'missingConsent' | 'error' | 'success',
  string
> & { consent: ReactNode };

type WaitlistFormProps = {
  idPrefix: 'hero' | 'cta';
  tone: 'default' | 'inverse';
  layout: 'inline' | 'stacked';
  locale: AppLocale;
  labels: WaitlistLabels;
};

const tones = {
  default: {
    input: 'border-border-strong bg-surface text-ink placeholder:text-muted focus-visible:border-primary',
    box: 'border-border-strong checked:border-primary checked:bg-primary',
    tick: 'text-on-primary',
    label: 'text-ink',
    error: 'text-danger-strong',
    success: 'bg-success-soft text-ink',
    successIcon: 'text-success-strong',
    button: 'primary',
  },
  inverse: {
    input: 'border-surface bg-surface text-ink placeholder:text-muted',
    box: 'border-on-primary checked:bg-on-primary',
    tick: 'text-primary',
    label: 'text-on-primary',
    error: 'self-start rounded-sm bg-surface px-2.5 py-1.5 text-danger-strong',
    success: 'bg-surface text-ink',
    successIcon: 'text-success-strong',
    button: 'secondary',
  },
} as const;

const initial: WaitlistState = { status: 'idle' };

export function WaitlistForm({ idPrefix, tone, layout, locale, labels }: WaitlistFormProps) {
  const [state, action, pending] = useActionState(joinWaitlist, initial);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const t = tones[tone];
  const ids = { email: `${idPrefix}-email`, emailError: `${idPrefix}-email-error`, consent: `${idPrefix}-consent`, consentError: `${idPrefix}-consent-error`, formError: `${idPrefix}-form-error` };

  if (state.status === 'success') {
    return (
      <p role="status" className={cn('flex items-start gap-3 rounded-control p-4 text-label font-medium', t.success)}>
        <Icon name="check" className={t.successIcon} />
        {labels.success}
      </p>
    );
  }

  const emailInvalid = state.status === 'invalid_email';
  const consentInvalid = state.status === 'missing_consent';

  return (
    <form id={`waitlist-${idPrefix}`} action={action} noValidate className="flex w-full flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <div aria-hidden="true" className="sr-only">
        <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className={cn('flex flex-col gap-2.5', layout === 'inline' && 'md:flex-row')}>
        <label htmlFor={ids.email} className="sr-only">
          {labels.emailLabel}
        </label>
        <input
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={labels.emailPlaceholder}
          aria-invalid={emailInvalid || undefined}
          aria-describedby={emailInvalid ? ids.emailError : undefined}
          className={cn(
            'min-h-12 w-full min-w-0 flex-1 rounded-control border px-4.5 text-body transition-colors duration-fast',
            t.input,
            emailInvalid && 'border-danger-strong',
          )}
        />
        <Button type="submit" variant={t.button} disabled={pending} className="shrink-0">
          {pending ? labels.submitting : labels.submit}
        </Button>
      </div>
      {emailInvalid ? (
        <p id={ids.emailError} className={cn('text-small font-medium', t.error)}>
          {labels.invalidEmail}
        </p>
      ) : null}

      <label htmlFor={ids.consent} className={cn('flex min-h-11 cursor-pointer items-center gap-2 self-start text-small', t.label)}>
        <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
          <input
            id={ids.consent}
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={consentInvalid || undefined}
            aria-describedby={consentInvalid ? ids.consentError : undefined}
            className={cn('peer size-4 cursor-pointer appearance-none rounded border-2', t.box, consentInvalid && 'border-danger-strong')}
          />
          <Icon name="check" className={cn('pointer-events-none absolute size-3 opacity-0 peer-checked:opacity-100', t.tick)} />
        </span>
        <span className="relative top-0.5">{labels.consent}</span>
      </label>
      {consentInvalid ? (
        <p id={ids.consentError} className={cn('text-small font-medium', t.error)}>
          {labels.missingConsent}
        </p>
      ) : null}

      {state.status === 'error' ? (
        <p id={ids.formError} role="alert" className={cn('text-small font-medium', t.error)}>
          {labels.error}
        </p>
      ) : null}
    </form>
  );
}
