'use client';

import { Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { playAudio } from './audio-player';
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

/** One speaker button in the American voice (owner 27/10/2026: no UK button, an icon instead of "US"). */
export function SpeakWord({ text }: { text: string }) {
  const { us } = useVoices();
  const t = useTranslations('App.speak');
  if (!us) return null;
  return (
    <SpeakButton text={text} voice={us} label={t('word')}>
      <Volume2 aria-hidden="true" className="size-5" />
    </SpeakButton>
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

/**
 * Đợt C §5.5 (DC24, DC34): one accent's speaker. With a pre-made file it plays the file (one player for the page); without one, or when
 * the file fails, the browser voice of that accent reads `text`. With neither, the button stays in place but dimmed, and says the voice
 * is being made (on hover and focus, and to screen readers).
 */
export function Pronounce({ text, voice, audioUrl, className }: { text: string; voice: 'uk' | 'us'; audioUrl: string | null; className?: string }) {
  const voices = useVoices();
  const t = useTranslations('App.speak');
  const tipId = useId();
  const browser = voices[voice];
  const unavailable = audioUrl === null && browser === null;
  const fallback = () => {
    if (browser) speak(text, browser);
  };
  return (
    <span className={cn('group relative inline-flex', className)}>
      <button
        type="button"
        aria-label={t(voice)}
        aria-disabled={unavailable || undefined}
        aria-describedby={unavailable ? tipId : undefined}
        className={cn(
          'inline-flex min-h-6 min-w-6 items-center justify-center rounded-full p-1 text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          unavailable ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-primary-soft active:bg-primary-soft motion-safe:active:scale-95',
        )}
        onKeyDown={stopReviewKeys}
        onClick={(event) => {
          event.stopPropagation();
          if (unavailable) return;
          if (audioUrl) void playAudio(audioUrl).catch(fallback);
          else fallback();
        }}
      >
        <Volume2 aria-hidden="true" className="size-5" />
      </button>
      {unavailable && (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-caption text-surface opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100"
        >
          {t('pending')}
        </span>
      )}
    </span>
  );
}
