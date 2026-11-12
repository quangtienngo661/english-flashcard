import { describe, expect, it } from 'vitest';
import { cycleNext, type CycleStep } from './word-cycle';

const LENGTHS = [8, 8, 6, 11, 8];
const DUE = 12;
const at = (k: number, typed: number, phase: CycleStep['phase'], due = DUE): CycleStep => ({ k, typed, phase, due });

describe('cycleNext', () => {
  it('waits 900 ms before the first letter', () => {
    expect(cycleNext(at(0, 0, 'typing'), LENGTHS, DUE)).toEqual([900, at(0, 1, 'typing')]);
  });
  it('types a letter every 100 ms', () => {
    expect(cycleNext(at(0, 3, 'typing'), LENGTHS, DUE)).toEqual([100, at(0, 4, 'typing')]);
    expect(cycleNext(at(0, 7, 'typing'), LENGTHS, DUE)).toEqual([100, at(0, 8, 'typing')]);
  });
  it('uses the length of the current word', () => {
    expect(cycleNext(at(2, 5, 'typing'), LENGTHS, DUE)).toEqual([100, at(2, 6, 'typing')]);
    expect(cycleNext(at(2, 6, 'typing'), LENGTHS, DUE)).toEqual([320, at(2, 6, 'enter')]);
  });
  it('shows Enter for 320 ms after the last letter, then answers in 260 ms and counts one fewer due', () => {
    expect(cycleNext(at(0, 8, 'typing'), LENGTHS, DUE)).toEqual([320, at(0, 8, 'enter')]);
    expect(cycleNext(at(0, 8, 'enter'), LENGTHS, DUE)).toEqual([260, at(0, 8, 'done', DUE - 1)]);
  });
  it('never lets due go below 0', () => {
    expect(cycleNext(at(0, 8, 'enter', 0), LENGTHS, DUE)[1].due).toBe(0);
  });
  it('holds the answered frame for 1700 ms, then starts the next word keeping due', () => {
    expect(cycleNext(at(1, 8, 'done', 11), LENGTHS, DUE)).toEqual([1700, at(2, 0, 'typing', 11)]);
  });
  it('wraps after the last word and resets due', () => {
    expect(cycleNext(at(4, 8, 'done', 7), LENGTHS, DUE)).toEqual([1700, at(5, 0, 'typing', DUE)]);
    expect(cycleNext(at(5, 7, 'typing'), LENGTHS, DUE)[0]).toBe(100);
  });
});
