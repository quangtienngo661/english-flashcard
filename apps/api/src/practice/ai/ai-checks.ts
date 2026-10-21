// Practice's own rules on what the AI gateway returned (design §7.2, §7.4, §7.5, PRC6, PRC7); the gateway only checks shape (AR9).
import { maskExample, type CandidateSense, type InflectionKind, type LemmaMeanings, type PracticeSense } from '../../content/index.js';
import { normalizeAnswer } from '../grading/normalize.js';
import { MCQ_OPTIONS, MCQ_SENTENCE_CANDIDATES_MAX } from '../practice.constants.js';
import { eligibleCandidates, shuffle, subsenses } from '../questions/distractors.js';

const BLANK = '___';
const NEEDED = MCQ_OPTIONS - 1;

/** Every valid form of the word, normalized as grading does: lemma, spellings, accepted forms, inflections, staff-added forms. */
export function validForms(s: PracticeSense): Set<string> {
  return new Set([s.lemma, ...s.variants, ...s.accepted, ...s.inflections.map(({ form }) => form), ...s.extra_forms]
    .map(normalizeAnswer));
}

/**
 * The asked word already shows outside the blank (design §7.2, R15). Each spelling or inflection is looked for on its own
 * with `maskExample`, so a sentence holding two different forms still counts.
 */
export function revealsWord(sentence: string, s: PracticeSense): boolean {
  const text = sentence.split(BLANK).join(' ');
  const forms = new Set([s.lemma, ...s.variants, ...s.inflections.map(({ form }) => form)]);
  return [...forms].some((form) => maskExample(text, { lemma: form, variants: [], inflections: [] }) !== null);
}

export type ClozeCheck = { ok: true; accepted: string[] } | { ok: false; unknownForms: string[]; reveals: boolean };

/** B7E34, B7E120: every accepted answer is a valid form, and the sentence does not show the word outside the blank. */
export function checkCloze(r: { sentence: string; accepted_answers: string[] }, s: PracticeSense): ClozeCheck {
  const valid = validForms(s);
  const unknownForms = r.accepted_answers.filter((answer) => !valid.has(normalizeAnswer(answer)));
  const reveals = revealsWord(r.sentence, s);
  if (unknownForms.length > 0 || reveals) return { ok: false, unknownForms, reveals };
  return { ok: true, accepted: [...new Set(r.accepted_answers.map(normalizeAnswer))] };
}

/** B7E36: the form used appears exactly once as a whole token (as `maskExample` matches) and is a valid form of the word. */
export function checkMeaning(r: { sentence: string; word_in_sentence: string }, s: PracticeSense):
  { ok: true } | { ok: false; unknownForms: string[] } {
  if (!validForms(s).has(normalizeAnswer(r.word_in_sentence))) return { ok: false, unknownForms: [r.word_in_sentence] };
  const before = r.sentence.split(BLANK).length;
  const masked = maskExample(r.sentence, { lemma: r.word_in_sentence, variants: [], inflections: [] });
  return masked !== null && masked.masked.split(BLANK).length - before === 1 ? { ok: true } : { ok: false, unknownForms: [] };
}

/**
 * B7E35, B7E120: three distinct distractors, all among the candidates sent, none the answer's form; the word not shown
 * outside the blank.
 */
export function checkMcq(r: { sentence: string; distractors: string[] }, answerForm: string, candidates: string[],
  s: PracticeSense): { ok: boolean } {
  const sent = new Set(candidates.map(normalizeAnswer));
  const picked = r.distractors.map(normalizeAnswer);
  const ok = picked.length === NEEDED && new Set(picked).size === NEEDED && picked.every((d) => sent.has(d))
    && !picked.includes(normalizeAnswer(answerForm)) && !revealsWord(r.sentence, s);
  return { ok };
}

type FormChoice = { answerForm: string; kinds: InflectionKind[] | null };

/** The word's forms: the lemma, then each inflected spelling with every kind it stands for (`deployed`: past, past_participle). */
function formsOf(s: PracticeSense): FormChoice[] {
  const byForm = new Map<string, InflectionKind[]>();
  for (const { form, kind } of s.inflections) byForm.set(form, [...(byForm.get(form) ?? []), kind]);
  return [{ answerForm: s.lemma, kinds: null }, ...[...byForm].map(([answerForm, kinds]) => ({ answerForm, kinds }))];
}

/** The candidate in that form: its lemma, or the one spelling its own table gives for every kind (none when they differ). */
function inForm(candidate: CandidateSense, kinds: InflectionKind[] | null): string | null {
  if (kinds === null) return candidate.lemma;
  const spellings = kinds.map((kind) => candidate.inflections.find((i) => i.kind === kind)?.form);
  const first = spellings[0];
  return first !== undefined && spellings.every((form) => form === first) ? first : null;
}

export type McqForm = { answerForm: string; candidates: string[]; senses: CandidateSense[] };

/**
 * Each form of the word with the candidates that have it (design §7.5, D18): one per spelling, none a valid form of the
 * word. `eligible` has already passed the Bước 4 distractor filter. `senses[i]` is the sense of `candidates[i]`.
 */
export function mcqForms(s: PracticeSense, eligible: CandidateSense[]): McqForm[] {
  const valid = validForms(s);
  return formsOf(s).map(({ answerForm, kinds }) => {
    const seen = new Set<string>();
    const result: McqForm = { answerForm, candidates: [], senses: [] };
    for (const candidate of eligible) {
      const form = inForm(candidate, kinds);
      if (form === null) continue;
      const key = normalizeAnswer(form);
      if (valid.has(key) || seen.has(key)) continue;
      seen.add(key);
      result.candidates.push(form);
      result.senses.push(candidate);
    }
    return result;
  });
}

/** A random form with at least 3 candidates, sending at most MCQ_SENTENCE_CANDIDATES_MAX of them; null when no form has 3. */
export function pickMcqForm(s: PracticeSense, eligible: CandidateSense[], random: () => number): McqForm | null {
  const usable = mcqForms(s, eligible).filter((f) => f.candidates.length >= NEEDED);
  if (usable.length === 0) return null;
  const chosen = usable[Math.floor(random() * usable.length)];
  const order = shuffle(chosen.candidates.map((_, i) => i), random).slice(0, MCQ_SENTENCE_CANDIDATES_MAX);
  return {
    answerForm: chosen.answerForm, candidates: order.map((i) => chosen.candidates[i]), senses: order.map((i) => chosen.senses[i]),
  };
}

function shareSubsense(a: string, b: string): boolean {
  const left = new Set(subsenses(a));
  return subsenses(b).some((part) => left.has(part));
}

/**
 * Three wrong meanings for "câu chứa từ rồi chọn" (design §7.4, D17), in this order: other senses of the same entry, the
 * learner's group mates through the Bước 4 distractor filter, random catalog senses. Each has a Vietnamese meaning (sent to
 * AI, R14), is shown in the same language as the right one, and shares no sub-meaning with it or with another one picked.
 * Null when fewer than three are found.
 */
export function pickWrongMeanings(s: PracticeSense, others: CandidateSense[], groupMates: CandidateSense[],
  random3: CandidateSense[], meanings: LemmaMeanings): CandidateSense[] | null {
  const picked: CandidateSense[] = [];
  const taken = s.gloss_vi === null ? [] : [s.gloss_vi];
  for (const c of [...others, ...eligibleCandidates(s, groupMates, Infinity, meanings), ...random3]) {
    if (picked.length === NEEDED) break;
    const gloss = c.gloss_vi;
    if (c.sense_id === s.sense_id || gloss === null || c.meaning.language !== s.meaning.language) continue;
    if (picked.some((p) => p.sense_id === c.sense_id) || taken.some((t) => shareSubsense(t, gloss))) continue;
    picked.push(c);
    taken.push(gloss);
  }
  return picked.length === NEEDED ? picked : null;
}
