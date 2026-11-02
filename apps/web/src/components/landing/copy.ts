import { getMessages } from 'next-intl/server';
import type vi from '../../../messages/vi.json';

/** The `Landing` message tree (design landing-redesign §10). Sections receive their own slice as props. */
export type LandingCopy = (typeof vi)['Landing'];

/** The question kinds of the learner app's practice session (`App.practice.session.kind`). */
export type ExerciseKindKey = 'mcq' | 'true_false' | 'type_meaning' | 'cloze' | 'meaning_in_sentence' | 'mcq_sentence';

/** The few `App` strings the landing reuses as they are (D4), so the sample UI never drifts from the real one. */
export type AppCopy = {
  kinds: Record<ExerciseKindKey, string>;
  review: { card: string; hintWeb: string; stillLearning: string; know: string };
  addWord: { title: string; word: string; sentence: string; deck: string; save: string; recognized: string; pastKind: string };
};

export async function getLandingCopy(): Promise<LandingCopy> {
  const messages = (await getMessages()) as unknown as { Landing: LandingCopy };
  return messages.Landing;
}

export async function getAppCopy(): Promise<AppCopy> {
  const { App } = (await getMessages()) as unknown as { App: typeof vi.App };
  const kind = App.practice.session.kind;
  return {
    kinds: {
      mcq: kind.mcq,
      true_false: kind.true_false,
      type_meaning: kind.type_meaning,
      cloze: kind.cloze,
      meaning_in_sentence: kind.meaning_in_sentence,
      mcq_sentence: kind.mcq_sentence,
    },
    review: { card: App.review.card, hintWeb: App.review.hintWeb, stillLearning: App.review.stillLearning, know: App.review.know },
    addWord: {
      title: App.addWord.title,
      word: App.addWord.word,
      sentence: App.addWord.sentence,
      deck: App.addWord.deck,
      save: App.addWord.save,
      recognized: App.addWord.recognized,
      pastKind: App.addWord.kinds.past,
    },
  };
}
