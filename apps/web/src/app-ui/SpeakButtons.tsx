'use client';

import { Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, ReactNode } from 'react';
import { speak, useVoices } from './speech';

function stopReviewKeys(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === ' ' || event.key === '1' || event.key === '2') event.stopPropagation();
}

function SpeakButton({ text, voice, label, children }: {
  text: string;
  voice: SpeechSynthesisVoice;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-full px-2 py-1 text-caption font-semibold text-primary outline-none hover:bg-primary-soft active:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      onKeyDown={stopReviewKeys}
      onClick={(event) => {
        event.stopPropagation();
        speak(text, voice);
      }}
    >
      {children}
    </button>
  );
}

export function SpeakWord({ text }: { text: string }) {
  const { uk, us } = useVoices();
  const t = useTranslations('App.speak');
  return (
    <>
      {uk && <SpeakButton text={text} voice={uk} label={t('uk')}>UK</SpeakButton>}
      {us && <SpeakButton text={text} voice={us} label={t('us')}>US</SpeakButton>}
    </>
  );
}

export function SpeakSentence({ text, private: isPrivate = false }: { text: string; private?: boolean }) {
  const { us, usLocal } = useVoices();
  const t = useTranslations('App.speak');
  const voice = isPrivate ? usLocal : us;
  if (!voice) return null;
  return (
    <SpeakButton text={text} voice={voice} label={t('sentence')}>
      <Volume2 aria-hidden="true" className="size-4" />
    </SpeakButton>
  );
}
