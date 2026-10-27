import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { useFocusFirstError, violationsToFields } from '../../api/field-errors';
import { ApiError } from '../../api/problem';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/NumberField';
import { RadioGroup } from '../../ui/RadioGroup';
import { showToast } from '../../ui/Toast';
import { TextField } from '../../ui/TextField';
import { useSubmitAction } from '../content/useSubmitAction';
import {
  createGrant,
  endAfterDay,
  isRefusalReason,
  lookupLearner,
  MAX_EMAIL,
  MAX_REASON,
  startOfDay,
  vnDay,
  type CreateGrantBody,
  type GrantKind,
  type LearnerLookup,
  type LimitKey,
} from './entitlements-api';

/** Bounds of the three numbers (`SETTINGS_BOUNDS.entitlements`: sessions 0-200, AI uses 0-5000). */
const LIMIT_FIELDS: Array<{ key: LimitKey; label: 'practiceSessions' | 'aiPractice' | 'aiLookup'; max: number; ai: boolean }> = [
  { key: 'practice_sessions_per_day', label: 'practiceSessions', max: 200, ai: false },
  { key: 'ai_practice_per_cycle', label: 'aiPractice', max: 5000, ai: true },
  { key: 'ai_lookup_per_cycle', label: 'aiLookup', max: 5000, ai: true },
];
const ORDER = ['email', 'practice_sessions_per_day', 'ai_practice_per_cycle', 'ai_lookup_per_cycle', 'from', 'to', 'reason'];
/** A 400 `violations` path -> the field that shows it. */
const FIELD_OF: Record<string, string> = {
  user_id: 'email',
  starts_at: 'from',
  ends_at: 'to',
  reason: 'reason',
  'limits.practice_sessions_per_day': 'practice_sessions_per_day',
  'limits.ai_practice_per_cycle': 'ai_practice_per_cycle',
  'limits.ai_lookup_per_cycle': 'ai_lookup_per_cycle',
};
/** A second press of [Kiểm] right after the blur that already looked the address up does not ask again. */
const SAME_LOOKUP_MS = 1000;

type Lookup =
  | { email: string; status: 'ok'; user: LearnerLookup['user'] }
  | { email: string; status: 'refused'; reason: string | null }
  | { email: string; status: 'not-found' }
  | { email: string; status: 'rate-limited'; retryAt: Date | null }
  | { email: string; status: 'failed' };

/**
 * A/79 `/entitlements/new` (and A/79e for an editor): grant Pro or custom numbers to a learner found by email. The email must be
 * looked up (on leaving the field or [Kiểm]) and be grantable before [Cấp] works; any edit of the field drops that result.
 * Mounted only while its route matches, so its state is gone on close.
 */
export function GrantDialog() {
  const t = useTranslations();
  const format = useFormatter();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canSetAi = useCan('settings.manage');

  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [checking, setChecking] = useState(false);
  const [kind, setKind] = useState<GrantKind>('plan');
  const [limits, setLimits] = useState<Partial<Record<LimitKey, number | null>>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [keptProblem, setKeptProblem] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lookupSeq = useRef(0);
  const lastLookup = useRef<{ email: string; at: number } | null>(null);
  const body = useRef<CreateGrantBody | null>(null);

  const trimmed = email.trim();
  const verified = lookup?.status === 'ok' && lookup.email === trimmed ? lookup.user : null;
  const today = vnDay(new Date());
  const startsNow = from === '' || from === today;

  async function check() {
    if (trimmed === '') {
      setErrors((e) => ({ ...e, email: t('entitlements.new.emailRequired') }));
      return;
    }
    const asked = trimmed;
    const seq = ++lookupSeq.current;
    lastLookup.current = { email: asked, at: Date.now() };
    setChecking(true);
    setErrors((e) => ({ ...e, email: '' }));
    let result: Lookup;
    try {
      const found = await lookupLearner(api, asked);
      result = found.grantable ? { email: asked, status: 'ok', user: found.user } : { email: asked, status: 'refused', reason: found.reason };
    } catch (e) {
      if (e instanceof ApiError && e.problem.status === 404) result = { email: asked, status: 'not-found' };
      else if (e instanceof ApiError && e.problem.status === 429) {
        result = { email: asked, status: 'rate-limited', retryAt: e.retryAfterSeconds === null ? null : new Date(Date.now() + e.retryAfterSeconds * 1000) };
      } else result = { email: asked, status: 'failed' };
    }
    // An edit while this was in flight started a newer round (or none): this answer is about an address no longer in the box.
    if (seq !== lookupSeq.current) return;
    lastLookup.current = { email: asked, at: Date.now() };
    setChecking(false);
    setLookup(result);
  }

  function onEmailChange(next: string) {
    lookupSeq.current += 1;
    lastLookup.current = null;
    setChecking(false);
    setEmail(next);
    setLookup(null);
    setConfirmed(false);
    setErrors((e) => ({ ...e, email: '' }));
  }

  function onEmailBlur() {
    if (trimmed === '' || lookup !== null || checking) return;
    void check();
  }

  function onCheckPress() {
    const last = lastLookup.current;
    if (checking || (last && last.email === trimmed && Date.now() - last.at < SAME_LOOKUP_MS)) return;
    void check();
  }

  const dirty =
    email !== '' || kind !== 'plan' || from !== '' || to !== '' || reason !== '' || Object.values(limits).some((v) => v !== null && v !== undefined);
  const requestClose = useDialogDirtyClose(dirty, () => void navigate('/entitlements'));

  const fingerprint = JSON.stringify({ id: verified?.id ?? null, kind, limits, from, to, reason, confirmed });
  const action = useSubmitAction(
    (key) => createGrant(api, { ...body.current!, ...(confirmed ? { confirm_turn_off_paid_renewal: true as const } : {}) }, key),
    fingerprint,
    (grant) => {
      void queryClient.invalidateQueries({ queryKey: ['grants'] });
      showToast(grant.paid_renewal_action === 'not_supported' ? t('entitlements.new.notSupported') : t('entitlements.new.done', { email: verified?.email ?? '' }));
      requestClose.release();
      void navigate('/entitlements');
    },
  );

  const server = action.problem?.slug === 'validation-failed' || action.problem?.status === 400
    ? violationsToFields(action.problem.violations ?? [], (path) => FIELD_OF[path] ?? null)
    : { fields: {}, form: [] as string[] };
  const shown: Record<string, string> = { ...errors, ...server.fields };
  useFocusFirstError(shown, ORDER);

  const asksToTurnOffRenewal =
    !confirmed &&
    action.problem !== keptProblem &&
    action.problem?.slug === 'grant-not-allowed' &&
    action.problem.reason === 'target-has-paid-subscription';

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!verified || action.pending) return;
    const next: Record<string, string> = {};
    const startDay = from === '' ? today : from;
    if (from !== '' && from < today) next.from = t('entitlements.new.fromPast');
    if (to === '') next.to = t('entitlements.new.toRequired');
    else if (to < startDay) next.to = t('entitlements.new.toBeforeFrom');
    const text = reason.trim();
    if (text === '' || text.length > MAX_REASON) next.reason = t('entitlements.new.reasonInvalid');
    const picked: Partial<Record<LimitKey, number>> = {};
    if (kind === 'limits') {
      for (const field of LIMIT_FIELDS) {
        if (field.ai && !canSetAi) continue;
        const value = limits[field.key];
        if (value === null || value === undefined) continue;
        if (!Number.isInteger(value) || value < 0 || value > field.max) next[field.key] = t('entitlements.new.limitInvalid');
        else picked[field.key] = value;
      }
      if (Object.keys(picked).length === 0 && !LIMIT_FIELDS.some((f) => next[f.key])) next.practice_sessions_per_day = t('entitlements.new.limitsRequired');
    }
    flushSync(() => setErrors(next));
    if (Object.keys(next).length > 0) return;
    body.current = {
      user_id: verified.id,
      kind,
      ...(kind === 'plan' ? { plan: 'pro' as const } : { limits: picked }),
      ...(startsNow ? {} : { starts_at: startOfDay(from) }),
      ends_at: endAfterDay(to),
      reason: text,
    };
    void action.submit();
  }

  function confirmTurnOff() {
    // Rendered first, so the retry runs with the flag and the key that follows from the new body.
    flushSync(() => setConfirmed(true));
    void action.submit();
  }

  const lookupMessage = (): { error?: string; description?: string } => {
    if (checking) return { description: t('entitlements.new.checking') };
    if (!lookup || lookup.email !== trimmed) return {};
    switch (lookup.status) {
      case 'ok':
        return { description: t('entitlements.new.confirmed', { email: lookup.user.email }) };
      case 'refused':
        return { error: lookup.reason && isRefusalReason(lookup.reason) ? t(`entitlements.refusal.${lookup.reason}`) : t('errors.grant-not-allowed') };
      case 'not-found':
        return { error: t('entitlements.new.notFound') };
      case 'rate-limited': {
        const time = lookup.retryAt ? format.dateTime(lookup.retryAt, { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
        return { error: [t('errors.rate-limited') + '.', time ? t('entitlements.new.retryAt', { time }) : ''].filter(Boolean).join(' ') };
      }
      case 'failed':
        return { error: t('entitlements.new.lookupFailed') };
    }
  };
  const emailState = lookupMessage();

  const problemMessage = action.problem && action.problem.slug === 'grant-not-allowed' && isRefusalReason(action.problem.reason)
    ? t(`entitlements.refusal.${action.problem.reason}`)
    : null;
  const banner = asksToTurnOffRenewal
    ? null
    : action.error
      ? { message: [problemMessage ?? action.error.message, ...server.form].join(' '), code: problemMessage ? null : action.error.code }
      : null;

  const pending = action.pending;
  return (
    <Dialog isOpen onOpenChange={(open) => !open && !pending && requestClose()} isDismissable={!pending} title={t('entitlements.new.title')} size="lg">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
        <div className="flex items-start gap-2" onBlur={onEmailBlur}>
          <TextField
            id="email"
            label={t('entitlements.new.email')}
            type="email"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_EMAIL}
            placeholder={t('entitlements.new.emailPlaceholder')}
            value={email}
            onChange={onEmailChange}
            description={emailState.description}
            error={shown.email || emailState.error || undefined}
          />
          <Button variant="secondary" className="mt-7 shrink-0" isPending={checking} onPress={onCheckPress}>
            {t('entitlements.new.check')}
          </Button>
        </div>

        <RadioGroup
          label={t('entitlements.new.kind')}
          value={kind}
          onChange={(next) => setKind(next as GrantKind)}
          items={[
            { id: 'plan', label: t('entitlements.kinds.plan') },
            { id: 'limits', label: t('entitlements.kinds.limits') },
          ]}
        />

        {kind === 'limits' && (
          <div className="grid gap-4 shell:grid-cols-3">
            {LIMIT_FIELDS.filter((field) => !field.ai || canSetAi).map((field) => (
              <NumberField
                key={field.key}
                id={field.key}
                label={t(`entitlements.new.${field.label}`)}
                value={limits[field.key] ?? null}
                onChange={(value) => setLimits((prev) => ({ ...prev, [field.key]: value }))}
                isNullable
                minValue={0}
                maxValue={field.max}
                step={1}
                error={shown[field.key] || undefined}
              />
            ))}
          </div>
        )}

        <div className="grid gap-4 shell:grid-cols-2">
          <TextField
            id="from"
            label={t('entitlements.new.from')}
            type="date"
            value={from}
            onChange={setFrom}
            description={t('entitlements.new.fromHint')}
            error={shown.from || undefined}
          />
          <TextField
            id="to"
            label={t('entitlements.new.to')}
            type="date"
            value={to}
            onChange={setTo}
            description={t('entitlements.new.toHint')}
            error={shown.to || undefined}
          />
        </div>
        <TextField
          id="reason"
          label={t('entitlements.new.reason')}
          autoComplete="off"
          value={reason}
          onChange={setReason}
          error={shown.reason || undefined}
        />

        {kind === 'plan' && startsNow && <p className="break-words text-xs text-muted">{t('entitlements.new.note')}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={pending} onPress={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isPending={pending} isDisabled={!verified || action.waitSeconds > 0}>
            {action.waitSeconds > 0 ? t('errors.retryIn', { seconds: action.waitSeconds }) : action.canRetry ? t('common.retry') : t('entitlements.new.submit')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={asksToTurnOffRenewal}
        title={t('entitlements.new.confirm.title', { email: verified?.email ?? trimmed })}
        confirmLabel={t('entitlements.new.confirm.ok')}
        cancelLabel={t('entitlements.new.confirm.keep')}
        tone="danger"
        isPending={pending}
        onConfirm={confirmTurnOff}
        onCancel={() => setKeptProblem(action.problem)}
      >
        <p>{t('entitlements.new.confirm.intro')}</p>
        <ul className="mt-2 list-disc ps-5">
          <li>{t('entitlements.new.confirm.turnOff')}</li>
          <li>{t('entitlements.new.confirm.keepPaid')}</li>
          <li>{t('entitlements.new.confirm.replace')}</li>
        </ul>
      </ConfirmDialog>
    </Dialog>
  );
}
