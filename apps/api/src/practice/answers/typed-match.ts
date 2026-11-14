// How a typed answer is matched (session synonyms design §3.1). Pure: the caller reads the current session's senses.
import type { PracticeSense } from '../../content/index.js';
import { validForms } from '../ai/ai-checks.js';
import { matchesAnswer, normalizeAnswer } from '../grading/normalize.js';
import type { AnswerKey } from '../practice.types.js';

export type TypeWordKey = Extract<AnswerKey, { kind: 'type_word' }>;
/** A word of the current session and the forms (normalized) that count as typing it. */
export type SessionWordForms = { senseId: string; forms: Set<string> };
export type TypedMatch =
  | { kind: 'right' }
  /** `senseId` is the one session word whose form was typed; null when the form belongs to more than one (nobody is credited, §4.1). */
  | { kind: 'alternative'; senseId: string | null }
  | { kind: 'session_word' }
  | { kind: 'other' };

/**
 * The words of the current session as the matching sees them: the usable senses minus the asked sense and every sense whose lemma is
 * the asked lemma (compared without case), so a second meaning of the asked word is never "another word of the session" (§3.1).
 */
export function sessionWordForms(asked: { senseId: string; lemma: string }, senses: PracticeSense[]): SessionWordForms[] {
  const lemma = asked.lemma.toLowerCase();
  return senses
    .filter((sense) => sense.sense_id !== asked.senseId && sense.lemma.toLowerCase() !== lemma)
    .map((sense) => ({ senseId: sense.sense_id, forms: validForms(sense) }));
}

/**
 * The order of §3.1: the sentence's own accepted answers, then a declared alternative that is a form of a current session word, then
 * any form of a current session word, then today's wrong answer. A declared word that is not in this session never counts as declared.
 */
export function matchTyped(typed: string, key: TypeWordKey, sessionWords: SessionWordForms[]): TypedMatch {
  if (matchesAnswer(typed, key.accepted)) return { kind: 'right' };
  const form = normalizeAnswer(typed);
  const owners = sessionWords.filter((word) => word.forms.has(form));
  if (owners.length === 0) return { kind: 'other' };
  if ((key.also_accepted ?? []).some((declared) => declared.form === form)) {
    return { kind: 'alternative', senseId: owners.length === 1 ? owners[0].senseId : null };
  }
  return { kind: 'session_word' };
}
