import { randomInt } from 'node:crypto';

// No 0 O o 1 l I (easy to misread in a mail) and no characters mail clients like to rewrite.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGIT = '23456789';
const SPECIAL = '-_.!@#%+=';
const ALL = UPPER + LOWER + DIGIT + SPECIAL;
const LENGTH = 16;

const pick = (alphabet: string): string => alphabet[randomInt(alphabet.length)];

export function generatePassword(): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SPECIAL)];
  while (chars.length < LENGTH) chars.push(pick(ALL));
  // Fisher-Yates so the guaranteed classes do not sit in fixed positions.
  for (let index = chars.length - 1; index > 0; index--) {
    const swap = randomInt(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join('');
}
