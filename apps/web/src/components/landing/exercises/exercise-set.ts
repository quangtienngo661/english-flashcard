import type { ExerciseKindKey } from '../copy';

/** The seven kinds a visitor can try, in the order of the list (design landing-redesign §3.1). The words themselves live in `Landing.exercises.items`. */
export type ExerciseId = 'mcq' | 'tf' | 'typeMeaning' | 'savedCloze' | 'aiCloze' | 'aiMeaning' | 'aiMcq';

type Base = { id: ExerciseId; kind: ExerciseKindKey; plan: 'free' | 'pro'; ai: boolean };
export type Exercise = (Base & { mode: 'choice'; right: number }) | (Base & { mode: 'typed'; answer: string });

export const EXERCISES: readonly Exercise[] = [
  { id: 'mcq', kind: 'mcq', plan: 'free', ai: false, mode: 'choice', right: 0 },
  { id: 'tf', kind: 'true_false', plan: 'free', ai: false, mode: 'choice', right: 1 },
  { id: 'typeMeaning', kind: 'type_meaning', plan: 'free', ai: false, mode: 'typed', answer: 'assume' },
  { id: 'savedCloze', kind: 'cloze', plan: 'free', ai: false, mode: 'typed', answer: 'borrow' },
  { id: 'aiCloze', kind: 'cloze', plan: 'pro', ai: true, mode: 'typed', answer: 'deployed' },
  { id: 'aiMeaning', kind: 'meaning_in_sentence', plan: 'pro', ai: true, mode: 'choice', right: 0 },
  { id: 'aiMcq', kind: 'mcq_sentence', plan: 'pro', ai: true, mode: 'choice', right: 0 },
];
