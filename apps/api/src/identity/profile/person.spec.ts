import { describe, expect, it } from 'vitest';
import {
  MIN_AGE,
  birthDateSchema,
  isOldEnough,
  optionalPersonNameSchema,
  personNameSchema,
} from './person.js';

describe('isOldEnough', () => {
  it('FE1: becomes true on the 13th birthday', () => {
    expect(MIN_AGE).toBe(13);
    expect(isOldEnough('2013-10-21', '2026-10-20', 13)).toBe(false);
    expect(isOldEnough('2013-10-21', '2026-10-21', 13)).toBe(true);
  });

  it('FE4: a 29 February birthday counts from 1 March in a non-leap year', () => {
    expect(isOldEnough('2012-02-29', '2025-02-28', 13)).toBe(false);
    expect(isOldEnough('2012-02-29', '2025-03-01', 13)).toBe(true);
  });

  it('keeps 29 February in a leap target year', () => {
    expect(isOldEnough('2012-02-29', '2028-02-28', 16)).toBe(false);
    expect(isOldEnough('2012-02-29', '2028-02-29', 16)).toBe(true);
  });
});

describe('birthDateSchema', () => {
  it('accepts a real date', () => {
    expect(birthDateSchema.parse('2012-02-29')).toBe('2012-02-29');
    expect(birthDateSchema.parse('1900-01-01')).toBe('1900-01-01');
  });

  it('FE3: rejects a date that does not exist', () => {
    expect(birthDateSchema.safeParse('2013-02-29').success).toBe(false);
    expect(birthDateSchema.safeParse('2013-13-01').success).toBe(false);
  });

  it('rejects a bad shape and dates before 1900', () => {
    expect(birthDateSchema.safeParse('1899-12-31').success).toBe(false);
    expect(birthDateSchema.safeParse('2013-2-9').success).toBe(false);
    expect(birthDateSchema.safeParse(20130209).success).toBe(false);
  });
});

describe('personNameSchema', () => {
  it('trims and normalises to NFC', () => {
    expect(personNameSchema.parse('  Lan  ')).toBe('Lan');
    expect(personNameSchema.parse('e\u0301')).toBe('\u00e9');
  });

  it('FE6: rejects blank, over 50 code points and control characters', () => {
    expect(personNameSchema.safeParse('   ').success).toBe(false);
    expect(personNameSchema.safeParse('a'.repeat(51)).success).toBe(false);
    expect(personNameSchema.safeParse('a\u0000b').success).toBe(false);
    expect(personNameSchema.safeParse('a'.repeat(50)).success).toBe(true);
  });

  it('counts code points, not UTF-16 units', () => {
    expect(personNameSchema.safeParse('😀'.repeat(50)).success).toBe(true);
    expect(personNameSchema.safeParse('😀'.repeat(51)).success).toBe(false);
  });
});

describe('optionalPersonNameSchema', () => {
  it('FE7: a blank string becomes null', () => {
    expect(optionalPersonNameSchema.parse('  ')).toBeNull();
  });

  it('accepts null and a valid name', () => {
    expect(optionalPersonNameSchema.parse(null)).toBeNull();
    expect(optionalPersonNameSchema.parse(' Nguyễn ')).toBe('Nguyễn');
  });

  it('still rejects a too long name or control characters', () => {
    expect(optionalPersonNameSchema.safeParse('a'.repeat(51)).success).toBe(false);
    expect(optionalPersonNameSchema.safeParse('a\u0000b').success).toBe(false);
  });
});
