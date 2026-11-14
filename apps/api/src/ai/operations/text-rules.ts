import { z } from 'zod';

/** The blank of a cloze sentence; any run of 3+ underscores is normalized to it (design §5.1). */
export const BLANK = '___';

/** Lengths count code points, so one emoji is one character. */
export const codePoints = (value: string): number => [...value].length;

/** An input string of `min`–`max` characters without `\0` (design §5.1–5.3). */
export function textIn(min: number, max: number) {
  return z.string()
    .refine((value) => !value.includes('\0'), 'Must not contain \\0')
    .refine((value) => codePoints(value) >= min && codePoints(value) <= max, `Expected ${min} to ${max} characters`);
}

/** Violations as `<field>: <message>`; an extra key names itself (design §5.4). */
export function toViolations(error: z.ZodError): string[] {
  return error.issues.flatMap((issue) => issue.code === 'unrecognized_keys'
    ? issue.keys.map((key) => `${[...issue.path, key].join('.')}: Unrecognized key`)
    : [`${issue.path.join('.')}: ${issue.message}`]);
}

const CONTROL = /\p{Cc}/gu;
/** Step (2) of §5.4: drop control characters and trim both ends. Never escapes HTML or changes case (AE2). */
export const clean = (value: string): string => value.replace(CONTROL, '').trim();

/** Drops duplicates case-insensitively, keeping the first (design §5.1). */
export function dedupeAnswers(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** JSON Schema pieces both providers understand (design §5): no length or count keywords. */
export const STRING = { type: 'string' } as const;
export const STRING_LIST = { type: 'array', items: { type: 'string' } } as const;
export function objectSchema(properties: Record<string, Record<string, unknown>>): Record<string, unknown> {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
