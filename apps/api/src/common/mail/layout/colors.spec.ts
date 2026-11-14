import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EMAIL_COLORS } from './colors.js';

const css = (file: string) => readFileSync(fileURLToPath(new URL(`../../../../../../packages/design-tokens/${file}`, import.meta.url)), 'utf8');
const token = (source: string, name: string) => new RegExp(String.raw`--color-wm-${name}:\s*(#[0-9a-fA-F]{6})\b`).exec(source)?.[1]?.toLowerCase();

const TOKEN_NAME = { bg: 'bg', surface: 'surface', ink: 'ink', muted: 'muted', line: 'line', accent: 'accent', accentSoft: 'accent-soft',
  onAccent: 'on-accent', mark: 'mark', markInk: 'mark-ink' } as const;

describe('EMAIL_COLORS', () => {
  it('matches the light tokens of packages/design-tokens/web.css', () => {
    const web = css('web.css');
    for (const [key, name] of Object.entries(TOKEN_NAME)) {
      expect(token(web, name), `light ${key}`).toBe(EMAIL_COLORS.light[key as keyof typeof TOKEN_NAME]);
    }
  });
  it('matches the dark tokens of packages/design-tokens/web-dark.css', () => {
    const dark = css('web-dark.css');
    for (const [key, value] of Object.entries(EMAIL_COLORS.dark)) {
      const name = TOKEN_NAME[key as keyof typeof TOKEN_NAME];
      expect(token(dark, name), `dark ${key}`).toBe(value);
    }
    expect(Object.keys(EMAIL_COLORS.dark)).toHaveLength(8);
  });
});
