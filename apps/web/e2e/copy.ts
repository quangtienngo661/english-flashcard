import { readFileSync } from 'node:fs';

// Tests read UI copy from the message files, so rewording the site does not break them.
type Messages = typeof import('../messages/en.json');

const load = (locale: 'vi' | 'en'): Messages =>
  JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')) as Messages;

export const copy = { vi: load('vi'), en: load('en') };

/** Fills ICU-style `{name}` and `{name, number}` placeholders (test numbers stay below 1.000, so no separator). */
export const fill = (message: string, values: Record<string, string | number>) =>
  message.replace(/\{(\w+)(?:, number)?\}/g, (_, key: string) => String(values[key]));

/** First line of a rich message such as `A<br></br>B`. */
export const firstLine = (message: string) => message.split(/<[^>]*>/)[0];
