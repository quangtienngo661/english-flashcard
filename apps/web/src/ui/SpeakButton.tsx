'use client';

import { Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { playAudio } from '@/lib/speech/audio-player';
import { speak, useVoices } from '@/lib/speech/speech';

function stopReviewKeys(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === ' ' || event.key === '1' || event.key === '2') event.stopPropagation();
}

function VoiceButton({ text, voice, label, children }: {
  text: string;
  voice: SpeechSynthesisVoice;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-full px-2 py-1 text-wm-accent outline-none hover:bg-wm-accent-soft active:bg-wm-accent-soft focus-visible:outline-3 focus-visible:outline-wm-accent"
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
    <VoiceButton text={text} voice={us} label={t('word')}>
      <Volume2 aria-hidden="true" className="size-5" />
    </VoiceButton>
  );
}

export function SpeakSentence({ text, private: isPrivate = false }: { text: string; private?: boolean }) {
  const { us, usLocal } = useVoices();
  const t = useTranslations('App.speak');
  const voice = isPrivate ? usLocal : us;
  if (!voice) return null;
  return (
    <VoiceButton text={text} voice={voice} label={t('sentence')}>
      <Volume2 aria-hidden="true" className="size-4" />
    </VoiceButton>
  );
}

/**
 * Figma "Nút loa" (`54:657`): an accent-soft circle, 32 px (28 px in the word page head), speaker icon about 17 px.
 * Đợt C §5.5 (DC24, DC34): one accent's speaker. With a pre-made file it plays the file (one player for the page); without one, or when
 * the file fails, the browser voice of that accent reads `text`. With neither, the button stays in place but dimmed, and says the voice
 * is being made (on hover and focus, and to screen readers).
 */
export function SpeakButton({ text, voice, audioUrl, size = 32, className }: {
  text: string;
  voice: 'uk' | 'us';
  audioUrl: string | null;
  size?: 28 | 32;
  className?: string;
}) {
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
          'inline-flex shrink-0 items-center justify-center rounded-full bg-wm-accent-soft text-wm-accent outline-none focus-visible:outline-3 focus-visible:outline-wm-accent',
          size === 28 ? 'size-7' : 'size-8',
          unavailable ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:brightness-95 motion-safe:transition-transform motion-safe:active:scale-95',
        )}
        onKeyDown={stopReviewKeys}
        onClick={(event) => {
          event.stopPropagation();
          if (unavailable) return;
          if (audioUrl) void playAudio(audioUrl).catch(fallback);
          else fallback();
        }}
      >
        <Volume2 aria-hidden="true" className="size-4.5" />
      </button>
      {unavailable && (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-wm-control bg-wm-mark-ink px-2 py-1 text-wm-small text-wm-mark opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        >
          {t('pending')}
        </span>
      )}
    </span>
  );
}
