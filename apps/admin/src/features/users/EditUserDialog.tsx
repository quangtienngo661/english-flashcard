import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { updateUser, type AdminUserDetail, type UserChanges } from './users-api';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 50;

type Form = { email: string; given_name: string; family_name: string; birth_date: string; timezone: string };
type FieldErrors = Partial<Record<keyof Form, string>>;

const clean = (text: string) => text.normalize('NFC').trim();

/** AD18: the admin edits email, names, birth date and timezone. Only changed fields are sent; a new email counts as verified. */
export function EditUserDialog({ user, onClose, onSaved }: {
  user: AdminUserDetail; onClose: () => void; onSaved: (result: AdminUserDetail) => void;
}) {
  const timezone = user.timezone;
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const initial: Form = {
    email: user.email, given_name: user.given_name ?? '', family_name: user.family_name ?? '',
    birth_date: user.birth_date ?? '', timezone,
  };
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<ErrorDetails | null>(null);

  const changes = (): UserChanges => {
    const out: UserChanges = {};
    if (clean(form.email).toLowerCase() !== user.email) out.email = clean(form.email);
    if (clean(form.given_name) !== (user.given_name ?? '')) out.given_name = clean(form.given_name);
    if (clean(form.family_name) !== (user.family_name ?? '')) out.family_name = clean(form.family_name) || null;
    if (form.birth_date !== (user.birth_date ?? '') && form.birth_date !== '') out.birth_date = form.birth_date;
    if (clean(form.timezone) !== timezone) out.timezone = clean(form.timezone);
    return out;
  };
  const dirty = Object.keys(changes()).length > 0;

  const save = useMutation({
    mutationFn: (body: UserChanges) => updateUser(api, user.id, body),
    onSuccess: onSaved,
    onError: (e) => {
      if (e instanceof ApiError && e.problem.slug === 'email-taken') setErrors({ email: t('users.edit.emailTaken') });
      else if (e instanceof ApiError && e.problem.slug === 'age-below-minimum') setErrors({ birth_date: t('users.edit.tooYoung') });
      else setBanner(errorDetails(e));
    },
  });
  const requestClose = useDialogDirtyClose(dirty && !save.isPending, onClose);

  function submit() {
    setBanner(null);
    const next: FieldErrors = {};
    if (!EMAIL.test(clean(form.email)) || clean(form.email).length > 320) next.email = t('users.edit.emailInvalid');
    const given = clean(form.given_name);
    if (given === '' || [...given].length > NAME_MAX) next.given_name = t('users.edit.nameInvalid');
    if ([...clean(form.family_name)].length > NAME_MAX) next.family_name = t('users.edit.nameInvalid');
    if (clean(form.timezone) === '') next.timezone = t('users.edit.timezoneInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const body = changes();
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    save.mutate(body);
  }

  const field = (key: keyof Form) => ({
    value: form[key],
    onChange: (v: string) => {
      setForm((f) => ({ ...f, [key]: v }));
      setErrors((e) => ({ ...e, [key]: undefined }));
    },
    error: errors[key],
  });

  return (
    <Dialog
      isOpen
      size="md"
      onOpenChange={(open) => !open && !save.isPending && requestClose()}
      isDismissable={!save.isPending}
      title={t('users.edit.title', { email: user.email })}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
        <TextField label={t('users.detail.email')} type="email" autoComplete="off" spellCheck={false} {...field('email')}
          description={t('users.edit.emailHint')} />
        <div className="grid gap-4 shell:grid-cols-2">
          <TextField label={t('users.detail.familyName')} autoComplete="off" {...field('family_name')} />
          <TextField label={t('users.detail.givenName')} autoComplete="off" {...field('given_name')} />
        </div>
        <TextField label={t('users.detail.birthDate')} type="date" {...field('birth_date')} />
        <TextField label={t('users.edit.timezone')} autoComplete="off" spellCheck={false} {...field('timezone')}
          description={t('users.edit.timezoneHint')} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={save.isPending} onPress={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isPending={save.isPending}>
            {t('users.edit.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
