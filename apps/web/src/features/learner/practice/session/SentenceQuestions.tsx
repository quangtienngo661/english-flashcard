'use client';

import type { ReactNode } from 'react';

/** The AI sentence in large type (K/78a–K/78c); `highlight` is set in bold where it occurs (K/78b). */
export function SentenceText({ sentence, highlight }: { sentence: string; highlight?: string }) {
  let content: ReactNode = sentence;
  const at = highlight ? sentence.indexOf(highlight) : -1;
  if (highlight && at >= 0) {
    content = (
      <>
        {sentence.slice(0, at)}
        <strong className="font-extrabold">{highlight}</strong>
        {sentence.slice(at + highlight.length)}
      </>
    );
  }
  return <p className="break-words text-title font-semibold text-ink">{content}</p>;
}
