'use client';

import { NO_PRONUNCIATION, type PronLine } from '@/lib/speech/pronunciation';
import { cn } from '@/lib/cn';
import { Pronounce } from './SpeakButtons';

/**
 * Đợt C §5.3, mockup `ipa.html`: `UK 🔊 /…/  US 🔊 /…/` for a catalog sense; one `🔊 /…/` for the learner's own word (its IPA is not split
 * by accent, DC15). No IPA leaves the speakers (DC18), which read the whole word or phrase.
 */
export function PronunciationLine({ text, line, align = 'start', className }: {
  text: string;
  line: PronLine | null | undefined;
  align?: 'start' | 'center';
  className?: string;
}) {
  const { scope, pronunciation } = line ?? { scope: 'catalog' as const, pronunciation: NO_PRONUNCIATION };
  const items = scope === 'private'
    ? [{ voice: 'us' as const, label: null, ipa: pronunciation.custom, audio: pronunciation.audio.us }]
    : [
        { voice: 'uk' as const, label: 'UK', ipa: pronunciation.uk, audio: pronunciation.audio.uk },
        { voice: 'us' as const, label: 'US', ipa: pronunciation.us, audio: pronunciation.audio.us },
      ];
  return (
    <p className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', align === 'center' && 'justify-center', className)}>
      {items.map((item) => (
        <span key={item.voice} className="inline-flex items-center gap-0.5">
          {item.label && <span className="text-caption font-semibold text-muted">{item.label}</span>}
          <Pronounce text={text} voice={item.voice} audioUrl={item.audio} />
          {item.ipa && (
            <span translate="no" className="break-all text-body text-ink">
              /{item.ipa}/
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
