import type { FaqItem } from './landing-data';

/**
 * The English landing's FAQ: the six questions of `landing-data.fallback.ts` in English, in the same order. The admin's FAQ (table
 * `landing_faq_items`) has one language, so /en does not read it; change an answer in both places (owner, 14/11/2026: FAQ in code, option A).
 * landing-data.test.ts pins that the two lists have the same length and that no item is empty.
 */
export const LANDING_FAQ_EN: FaqItem[] = [
  {
    question: 'How does Wordmet help me learn vocabulary?',
    answer:
      'Wordmet handles the remembering so you can spend your time using words. You save the new words you come across, and Wordmet looks up the meaning, pronunciation and example sentences and schedules a review for each word. Every day you review the words that are due and practice them in sentences.',
  },
  {
    question: 'What if I keep forgetting, or know a word but can’t use it?',
    answer:
      'Wordmet reminds you to review just before you forget, and spaces the reviews out as you remember. When you practice, you fill in and type the word in a sentence instead of only picking a meaning. Words you often get wrong are collected for extra practice.',
  },
  {
    question: 'Where should I start?',
    answer:
      'Start with the words you meet while reading or watching films, or pick a ready-made deck by topic and CEFR level. After that, the Today page shows what to review each day.',
  },
  {
    question: 'What does AI do, and can I trust it?',
    answer:
      'AI writes practice sentences for the words you study and looks up meanings when the dictionary doesn’t have them. Your answers are graded against a fixed answer key, so results are fair and consistent. If a sentence looks wrong, report it and the Wordmet team will take a look.',
  },
  {
    question: 'How do the Free and Pro plans differ?',
    answer:
      'The Free plan is enough for daily study: save words, look up meanings, review cards and practice. Pro is for people who want to practice more, with AI-written practice sentences for each word and AI lookup.',
  },
  {
    question: 'Where do the meanings and example sentences come from?',
    answer:
      'Wordmet’s dictionary is built on openly licensed datasets, and the Wordmet team reviews each meaning before it reaches learners. The list of sources is on the Data sources page. Meanings suggested by AI always carry their own label so you can check them.',
  },
];
