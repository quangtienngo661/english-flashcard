'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useApi } from '@/app-shell/session/session-context';
import type { Card } from '../groups/groups-api';
import { highlightWord } from '../groups/highlight';

type WordPage = { inflections: Array<{ kind: string; form: string }> };

/** The forms of a lemma come from its word page (the queue does not carry them); the card shows none until they arrive. */
export function useForms(lemma: string | undefined) {
  const api = useApi();
  const word = useQuery({
    queryKey: ['word', lemma],
    queryFn: () => api.get<WordPage>(`/v1/words/${encodeURIComponent(lemma!)}`),
    enabled: lemma !== undefined,
    staleTime: Infinity,
    retry: false,
  });
  return [...new Set((word.data?.inflections ?? []).map((i) => i.form))];
}

const BADGE = 'w-fit rounded-full px-2 py-0.5 text-caption font-semibold';

/** K/20, K/21, M/30, M/31: word and part of speech in front; forms, meaning, example and saved sentences behind (D3). */
export function Flashcard({ card, position, total, flipped, onFlip }: { card: Card; position: number; total: number; flipped: boolean; onFlip: () => void }) {
  const t = useTranslations('App.review');
  const { content } = card;
  const forms = useForms(content.lemma);

  return (
    <div role="group" aria-label={t('card', { n: position, total })} className="relative w-full">
      <div aria-hidden className="absolute inset-0 -rotate-2 rounded-card border-2 border-ink bg-surface" />
      <div className="relative flex min-h-80 flex-col overflow-hidden rounded-card border-2 border-ink bg-surface shadow-ledge md:min-h-72">
        {!flipped ? (
          <button type="button" onClick={onFlip} className="flex flex-1 flex-col p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
            <Badges card={card} />
            <span className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
              <span className="break-all text-display font-extrabold text-ink">{content.lemma}</span>
              <span className="text-ui text-muted">{content.pos}</span>
            </span>
            <span className="self-center text-caption text-muted">
              <span className="hidden md:inline">{t('hintWeb')}</span>
              <span className="md:hidden">{t('hintPhone')}</span>
            </span>
          </button>
        ) : (
          <div className="grid flex-1 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2 p-5">
              <Badges card={card} />
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="break-all text-h3 font-bold text-ink">{content.lemma}</span>
                <span className="text-ui text-muted">{content.pos}</span>
              </p>
              <p className="break-words text-h2 font-bold text-ink">{content.meaning.text}</p>
              {forms.length > 0 && (
                <ul aria-label={t('forms')} className="flex flex-wrap gap-1.5">
                  {forms.map((form) => (
                    <li key={form} className="rounded-sm border border-border px-2 py-0.5 text-caption text-ink">
                      {form}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-between">
              {content.examples[0] && (
                <div className="flex flex-col gap-1 p-5">
                  <p className="text-caption font-semibold text-muted">{t('example')}</p>
                  <p className="break-words text-ui text-ink">{highlightWord(content.examples[0], content.lemma, forms)}</p>
                </div>
              )}
              {content.sentences.length > 0 && (
                <div className="flex flex-col gap-1 bg-accent-soft p-5">
                  <p className="text-caption font-semibold text-ink">{t('seen')}</p>
                  {content.sentences.map((sentence) => (
                    <p key={sentence} className="break-words text-ui text-ink">
                      {highlightWord(sentence, content.lemma, forms)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badges({ card }: { card: Card }) {
  const t = useTranslations('App.review');
  if (card.section === 'backlog') return <span className={`${BADGE} bg-danger-soft text-danger`}>{t('backlog')}</span>;
  if (card.priority) return <span className={`${BADGE} bg-accent text-on-accent`}>{t('priority')}</span>;
  return null;
}
