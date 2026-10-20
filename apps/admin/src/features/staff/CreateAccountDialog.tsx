import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { checkPasswordPolicy } from '../../auth/password-policy';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Dialog } from '../../ui/Dialog';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { PasswordRules } from '../account/PasswordRules';
import { useCountdown } from '../account/useCountdown';
import { createStaffAccount, type StaffRole } from './staff-api';

const RATE_LIMIT_FALLBACK_SECONDS = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = { onClose: () => void; onCreated: () => void };

/** Admin creates a staff account (spec §6.2): form → confirmation repeating the email → "created". Never shows a password. */
export function CreateAccountDialog({ onClose, onCreated }: Props) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('editor');
  const [generate, setGenerate] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const busy = useRef(false);
  const wait = useCountdown();
  const mutation = useMutation({
    mutationFn: () =>
      createStaffAccount(api, {
        email: email.trim(),
        staff_role: role,
        ...(generate ? {} : { password }),
        must_change_password: mustChange,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
  });

  const violations = generate ? [] : checkPasswordPolicy(password);

  function next() {
    setBanner(null);
    const emailBad = !EMAIL.test(email.trim()) || email.trim().length > 320;
    setEmailError(emailBad ? t('staff.create.emailInvalid') : null);
    const mismatch = !generate && password !== confirmPassword;
    setConfirmError(mismatch ? t('account.changePassword.mismatch') : null);
    if (emailBad || mismatch || violations.length > 0) return;
    setStep('confirm');
  }

  async function submit() {
    if (busy.current || wait.remaining > 0) return;
    busy.current = true;
    try {
      await mutation.mutateAsync();
      setStep('done');
      onCreated();
    } catch (e) {
      if (e instanceof ApiError && e.problem.status === 429) {
        // Stay on the confirmation: its button carries the countdown.
        wait.start(e.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS);
        return;
      }
      setStep('form');
      if (e instanceof ApiError && e.problem.slug === 'email-taken') setEmailError(t('staff.create.emailTaken'));
      else setBanner(errorDetails(e));
    } finally {
      busy.current = false;
    }
  }

  if (step === 'done') {
    return (
      <Dialog
        isOpen
        onOpenChange={(open) => !open && onClose()}
        title={t('staff.create.doneTitle')}
        actions={<Button onPress={onClose}>{t('staff.create.close')}</Button>}
      >
        <p className="break-words text-ui text-muted">{t('staff.create.doneBody', { email: email.trim() })}</p>
      </Dialog>
    );
  }

  if (step === 'confirm') {
    return (
      <Dialog
        isOpen
        onOpenChange={(open) => !open && !mutation.isPending && onClose()}
        isDismissable={!mutation.isPending}
        title={t('staff.create.confirmTitle')}
        actions={
          <>
            <Button variant="secondary" onPress={() => setStep('form')} isDisabled={mutation.isPending}>
              {t('staff.create.back')}
            </Button>
            <Button onPress={() => void submit()} isPending={mutation.isPending} isDisabled={wait.remaining > 0}>
              {wait.remaining > 0 ? t('errors.retryIn', { seconds: wait.remaining }) : t('staff.create.submit')}
            </Button>
          </>
        }
      >
        <p className="break-words text-ui text-muted">
          {t('staff.create.confirmBody', { role, email: email.trim() })}
          {mustChange ? ` ${t('staff.create.confirmMustChange')}` : ''}
        </p>
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={t('staff.create.title')}
      actions={
        <>
          <Button variant="secondary" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onPress={next}>{t('staff.create.continue')}</Button>
        </>
      }
    >
      {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
      <TextField
        label={t('staff.create.email')}
        type="email"
        autoComplete="off"
        spellCheck={false}
        value={email}
        onChange={(v) => {
          setEmail(v);
          setEmailError(null);
        }}
        error={emailError ?? undefined}
      />
      <Select
        label={t('staff.create.role')}
        value={role}
        onChange={(id) => setRole(id as StaffRole)}
        items={[
          { id: 'editor', label: 'editor' },
          { id: 'admin', label: 'admin' },
        ]}
      />
      <div className="flex flex-col gap-1.5">
        <Checkbox isSelected={generate} onChange={setGenerate}>
          {t('staff.create.generate')}
        </Checkbox>
        {generate && <p className="text-xs text-muted">{t('staff.create.generateHint')}</p>}
      </div>
      {!generate && (
        <>
          <TextField label={t('staff.create.password')} type="password" autoComplete="new-password" value={password} onChange={setPassword} />
          <TextField
            label={t('staff.create.confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={confirmError ?? undefined}
          />
          <PasswordRules violations={violations} />
        </>
      )}
      <Checkbox isSelected={mustChange} onChange={setMustChange}>
        {t('staff.create.mustChange')}
      </Checkbox>
    </Dialog>
  );
}
