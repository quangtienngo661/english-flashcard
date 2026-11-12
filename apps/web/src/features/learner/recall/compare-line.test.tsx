// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { renderApp } from '@/test-utils/render-app';
import { CompareLine, compareLetters } from './CompareLine';

// M5.9 (Figma 209:5902): the typed word against the answer, letter by letter, once the answer is shown. GM19: no partial credit.
describe('compareLetters', () => {
  it('"deteriorated" against "deteriorate": every letter matches but the last "d", which is extra', () => {
    const { typed, answer } = compareLetters('deteriorated', 'deteriorate');
    expect(typed.filter((l) => l.mark === 'extra').map((l) => [l.char, typed.indexOf(l)])).toEqual([['d', 11]]);
    expect(answer.every((l) => l.mark === 'same')).toBe(true);
  });

  it('"detoriorate" against "deteriorate": the typed "o" is extra and the answer\'s "e" is missing, at the same place', () => {
    const { typed, answer } = compareLetters('detoriorate', 'deteriorate');
    expect(typed.map((l) => (l.mark === 'extra' ? l.char.toUpperCase() : l.char)).join('')).toBe('detOriorate');
    expect(answer.map((l) => (l.mark === 'missing' ? l.char.toUpperCase() : l.char)).join('')).toBe('detEriorate');
  });

  it('a missing letter: "deterorate" misses the "i"', () => {
    const { typed, answer } = compareLetters('deterorate', 'deteriorate');
    expect(typed.every((l) => l.mark === 'same')).toBe(true);
    expect(answer.filter((l) => l.mark === 'missing').map((l) => l.char)).toEqual(['i']);
  });

  it('the comparison ignores case, as the grading does', () => {
    const { typed, answer } = compareLetters('Deteriorate', 'deteriorate');
    expect([...typed, ...answer].every((l) => l.mark === 'same')).toBe(true);
  });

  it('empty input marks every answer letter missing', () => {
    expect(compareLetters('', 'go').answer.map((l) => l.mark)).toEqual(['missing', 'missing']);
  });
});

describe('CompareLine', () => {
  it('reads both words and marks the extra and missing letters', () => {
    renderApp(<CompareLine typed="detoriorate" answer="deteriorate" />, { chrome: false });
    const line = screen.getByRole('group', { name: 'So chữ: bạn gõ detoriorate, đáp án deteriorate' });
    expect(line.querySelector('[data-mark="extra"]')).toHaveTextContent('o');
    expect(line.querySelector('[data-mark="missing"]')).toHaveTextContent('e');
  });
});
