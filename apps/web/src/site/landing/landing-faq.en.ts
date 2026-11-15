import type { FaqItem } from './landing-data';

/** The English landing FAQ is maintained in code; the Vietnamese FAQ is published through admin. */
export const LANDING_FAQ_EN: FaqItem[] = [
  {
    question: 'How does Wordmet help me learn vocabulary?',
    answer:
      'Save new words you come across while reading or watching films. Wordmet helps you look up meanings, pronunciation, and example sentences, then schedules reviews for each word. Review words when they are due and practice them through different question types, including typing words into sentences.',
  },
  {
    question: 'What if I keep forgetting, or know a word but can’t use it?',
    answer:
      'Reviews are scheduled at intervals of 1, 3, 7, 14, and 30 days. You can mark words as Needs review to practice them sooner. Practice includes different question types, and words you often get wrong are collected for extra practice.',
  },
  {
    question: 'Where should I start?',
    answer:
      'Save a few words you encounter while reading, or choose a ready-made deck by topic and level. Check the Today page to see what needs reviewing.',
  },
  {
    question: 'Where do meanings, example sentences, and AI content come from?',
    answer:
      'Wordmet’s dictionary uses openly licensed datasets, and meanings are reviewed before publication. See the Data sources page for the list. If the dictionary has no suitable meaning, you can ask AI for a suggestion, which is labeled for you to check. AI can also write practice questions, and your answers are graded against a fixed answer key.',
  },
  {
    question: 'How do the Free and Pro plans differ?',
    answer:
      'Free includes saving words, looking up meanings, reviewing cards, and practice sessions. It also includes some AI credits for questions and lookups. Pro offers more practice sessions and AI credits.',
  },
];
