'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TextField, type TextFieldProps } from './TextField';

/** Figma "Ô nhập" with the 20px eye icon (34:345): the eye shows or hides the password and never submits the form. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
  const t = useTranslations('App.common');
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-pressed={shown}
          aria-label={shown ? t('hidePassword') : t('showPassword')}
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-wm-control text-wm-muted outline-none hover:text-wm-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-wm-accent"
        >
          {shown ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      }
    />
  );
}
