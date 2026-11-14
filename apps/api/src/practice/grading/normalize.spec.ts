import { describe, expect, it } from 'vitest';
import { answerLength, matchesAnswer, normalizeAnswer } from './normalize.js';

describe('normalizeAnswer / matchesAnswer', () => {
  // analyze, with the spelling analyse accepted (design 7.6 table).
  const accepted = ['analyze', 'analyse'];

  it.each([
    ['  Analyse ', true],
    ['analyze', true],
    ['ANALYZE', true],
    ['analyzed', false],
    ['analise', false],
  ])('B4#5: %j → correct = %s', (typed, correct) => {
    expect(matchesAnswer(typed, accepted)).toBe(correct);
  });

  it('a curly apostrophe matches the straight one: I’m matches I\'m', () => {
    expect(normalizeAnswer('I’m')).toBe("i'm");
    expect(matchesAnswer('I’m', ["i'm"])).toBe(true);
    expect(matchesAnswer('‘ok’', ["'ok'"])).toBe(true);
    expect(normalizeAnswer('“quoted”')).toBe('"quoted"');
  });

  it('Review Focus 3: NFD café equals NFC café', () => {
    const nfd = 'café';
    const nfc = 'café';
    expect(nfd).not.toBe(nfc);
    expect(normalizeAnswer(nfd)).toBe(nfc);
    expect(matchesAnswer(nfd, [nfc])).toBe(true);
  });

  it('tabs, newlines and double spaces collapse to one space; ends are trimmed', () => {
    expect(normalizeAnswer('\tlook  \t up\n')).toBe('look up');
    expect(matchesAnswer('look\t\tup', ['look up'])).toBe(true);
  });

  it('CT6: typed "a.m" matches the blank "a.m."', () => {
    expect(normalizeAnswer('a.m.')).toBe('a.m');
    expect(matchesAnswer('a.m', [normalizeAnswer('a.m.')])).toBe(true);
    expect(matchesAnswer('a.m.', [normalizeAnswer('a.m.')])).toBe(true);
    expect(normalizeAnswer('  Hello!? ')).toBe('hello');
  });

  it('only spaces normalize to an empty string', () => {
    expect(normalizeAnswer(' \t  ')).toBe('');
  });
});

describe('answerLength', () => {
  it('counts code points after NFC and trim: an emoji is one, NFD é is one', () => {
    expect(answerLength('😀')).toBe(1);
    expect(answerLength('  café ')).toBe(4);
  });

  it('100 and 101 code points', () => {
    expect(answerLength('a'.repeat(100))).toBe(100);
    expect(answerLength(`  ${'😀'.repeat(101)}  `)).toBe(101);
  });

  it('only spaces → 0', () => {
    expect(answerLength('    ')).toBe(0);
  });
});
