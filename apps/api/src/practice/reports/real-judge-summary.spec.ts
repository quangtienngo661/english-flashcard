import { describe, expect, it } from 'vitest';
import { latestRealPasses, realScoreGroups, type ScoredQuestion } from './real-judge-summary.js';

const at = (time: string) => new Date(`2026-10-19T${time}:00.000Z`);

let counter = 0;
/** One score of one question; `pass` and the time are what the rows of the tests differ by. */
function score(pass: string, time: string, verdict: ScoredQuestion['verdict'], extra: Partial<ScoredQuestion> = {}): ScoredQuestion {
  counter += 1;
  return {
    subjectId: `q${counter}`, passId: pass, passFinished: pass !== 'P3', judgeRevisionId: 'jr1', criterion: 'one_answer', verdict, scoredAt: at(time),
    operation: 'generate_cloze', configNumber: 7, model: 'fake:ok', ...extra,
  };
}

describe('latestRealPasses (M5-T8, design §8.4)', () => {
  it('per operation, among finished passes, the pass whose newest score is newest; counts over that pass only', () => {
    const rows = [
      score('P1', '10:00', 'pass'), score('P1', '10:00', 'fail_major'),
      score('P2', '12:00', 'pass'), score('P2', '11:30', 'pass'), score('P2', '12:00', 'fail_minor'),
      score('P3', '13:00', 'pass'), // a pass that is still running never counts
    ];
    expect(latestRealPasses(rows)).toEqual([{
      operation: 'generate_cloze', pass_id: 'P2', judge_revision_id: 'jr1', criterion: 'one_answer',
      counts: { pass: 2, fail_major: 0, fail_minor: 1, unscored: 0 }, scored_at: '2026-10-19T12:00:00.000Z',
    }]);
  });

  it('an operation is judged by its own passes: a meaning question scored only in the older pass has that pass', () => {
    const rows = [
      score('P1', '10:00', 'pass'), score('P2', '12:00', 'pass'),
      score('P1', '10:05', 'fail_major', { operation: 'generate_meaning_question' }),
    ];
    expect(latestRealPasses(rows).map((row) => [row.operation, row.pass_id, row.counts])).toEqual([
      ['generate_cloze', 'P2', { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }],
      ['generate_meaning_question', 'P1', { pass: 0, fail_major: 1, fail_minor: 0, unscored: 0 }],
    ]);
  });

  it('operations come in AI_OPERATIONS order, not in the order of the scores', () => {
    const rows = [
      score('P1', '10:00', 'pass', { operation: 'generate_sentence_mcq' }), score('P1', '10:00', 'pass', { operation: 'generate_cloze' }),
      score('P1', '10:00', 'pass', { operation: 'generate_meaning_question' }),
    ];
    expect(latestRealPasses(rows).map((row) => row.operation)).toEqual(['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq']);
  });

  it('one row per criterion of the pass, each with its own counts; a score with no verdict is unscored', () => {
    const rows = [
      score('P1', '10:00', 'pass'), score('P1', '10:00', 'fail_minor', { criterion: 'natural' }), score('P1', '10:01', null, { criterion: 'natural' }),
    ];
    expect(latestRealPasses(rows).map((row) => [row.criterion, row.counts, row.scored_at])).toEqual([
      ['one_answer', { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }, '2026-10-19T10:00:00.000Z'],
      ['natural', { pass: 0, fail_major: 0, fail_minor: 1, unscored: 1 }, '2026-10-19T10:01:00.000Z'],
    ]);
  });

  it('two passes scored at the same instant → the one with the greater id is shown (the answer does not depend on the order of the rows)', () => {
    const a = [score('P1', '10:00', 'pass'), score('P2', '10:00', 'fail_major')];
    expect(latestRealPasses(a).map((row) => row.pass_id)).toEqual(['P2']);
    expect(latestRealPasses([...a].reverse()).map((row) => row.pass_id)).toEqual(['P2']);
  });

  it('no finished pass, or no score → no row', () => {
    expect(latestRealPasses([score('P3', '13:00', 'pass')])).toEqual([]);
    expect(latestRealPasses([])).toEqual([]);
  });

  it('R7: a row carries no question id and no learner', () => {
    const [row] = latestRealPasses([score('P1', '10:00', 'pass')]);
    expect(Object.keys(row)).toEqual(['operation', 'pass_id', 'judge_revision_id', 'criterion', 'counts', 'scored_at']);
  });
});

describe('realScoreGroups (M5-T8, design §8.3, R12)', () => {
  it('two scores with the same operation, number, model, revision and criterion are one group with their counts added; first_scored_at is the oldest', () => {
    const rows = [score('P2', '12:00', 'pass'), score('P1', '10:00', 'fail_major'), score('P1', '10:30', null)];
    expect(realScoreGroups(rows)).toEqual([{
      operation: 'generate_cloze', source: 'real', config_number: 7, model: 'fake:ok', judge_revision_id: 'jr1', criterion: 'one_answer',
      counts: { pass: 1, fail_major: 1, fail_minor: 0, unscored: 1 }, first_scored_at: '2026-10-19T10:00:00.000Z',
    }]);
  });

  it('R12: another model with the same number is its own group; so is another number with the same model', () => {
    const rows = [
      score('P1', '10:00', 'pass'), score('P1', '10:00', 'pass', { model: 'fake:alt' }), score('P1', '10:00', 'fail_minor', { configNumber: 8 }),
    ];
    const groups = realScoreGroups(rows);
    expect(groups.map((group) => [group.config_number, group.model, group.counts])).toEqual([
      [7, 'fake:alt', { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }],
      [7, 'fake:ok', { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }],
      [8, 'fake:ok', { pass: 0, fail_major: 0, fail_minor: 1, unscored: 0 }],
    ]);
  });

  it('another operation, judge revision or criterion is its own group', () => {
    const rows = [
      score('P1', '10:00', 'pass'), score('P1', '10:00', 'pass', { operation: 'generate_sentence_mcq' }),
      score('P1', '10:00', 'pass', { judgeRevisionId: 'jr2' }), score('P1', '10:00', 'pass', { criterion: 'natural' }),
    ];
    expect(realScoreGroups(rows)).toHaveLength(4);
  });

  it('ordered by first_scored_at, then by number', () => {
    const rows = [
      score('P2', '12:00', 'pass', { configNumber: 5 }), score('P1', '10:00', 'pass', { configNumber: 9 }), score('P1', '10:00', 'pass', { configNumber: 6 }),
    ];
    expect(realScoreGroups(rows).map((group) => [group.first_scored_at, group.config_number])).toEqual([
      ['2026-10-19T10:00:00.000Z', 6], ['2026-10-19T10:00:00.000Z', 9], ['2026-10-19T12:00:00.000Z', 5],
    ]);
  });

  it('a question whose ai_meta had no number or model is a group of its own, with null for what is unknown', () => {
    const [group] = realScoreGroups([score('P1', '10:00', 'pass', { configNumber: null, model: null })]);
    expect(group).toMatchObject({ config_number: null, model: null, source: 'real' });
  });

  it('the scores of an unfinished pass count too (a group is about scores, not passes)', () => {
    const [group] = realScoreGroups([score('P3', '13:00', 'pass')]);
    expect(group.counts.pass).toBe(1);
  });

  it('no row → no group', () => {
    expect(realScoreGroups([])).toEqual([]);
  });
});
