import { describe, expect, it } from 'vitest';
import { runItem } from '../prompt-test-support';
import { realItem } from '../real-questions/real-test-support';
import { firstOpen, labelTasks, outputCount, realLabelTasks } from './label-queue';
import { label } from './judge-test-support';

const criteria = [{ code: 'single_answer', question: 'Only one?' }, { code: 'natural', question: 'Natural?' }];
const items = [
  runItem({ item_id: 'd1', example_id: 'e1', position: 0 }),
  runItem({ item_id: 'd2', example_id: 'e2', position: 1, status: 'transient_failure', output: null }),
  runItem({ item_id: 'd3', example_id: 'e3', position: 2 }),
];

describe('label-queue', () => {
  it('a task per succeeded output and criterion, in the order of the items and then of the criteria', () => {
    expect(labelTasks(items, criteria)).toEqual([
      { subjectId: 'd1', criterion: 'single_answer' }, { subjectId: 'd1', criterion: 'natural' },
      { subjectId: 'd3', criterion: 'single_answer' }, { subjectId: 'd3', criterion: 'natural' },
    ]);
  });

  it('an output with no input (an old result), a held-out one and one that failed are never a task', () => {
    const odd = [
      runItem({ item_id: 'a', input: null }), runItem({ item_id: 'b', split: 'held_out' }), runItem({ item_id: 'c', status: 'permanent_failure', output: null }),
      runItem({ item_id: 'd', status: 'succeeded', output: null }), runItem({ item_id: 'ok' }),
    ];
    expect(labelTasks(odd, criteria.slice(0, 1))).toEqual([{ subjectId: 'ok', criterion: 'single_answer' }]);
  });

  it('no output or no criterion: no task', () => {
    expect(labelTasks([], criteria)).toEqual([]);
    expect(labelTasks(items, [])).toEqual([]);
  });

  it('the first task without a label; every task labelled, or none, is the first one', () => {
    const tasks = labelTasks(items, criteria);
    expect(firstOpen(tasks, [label({ subject_id: 'd1', criterion: 'single_answer' }), label({ subject_id: 'd1', criterion: 'natural' })])).toBe(2);
    expect(firstOpen(tasks, [])).toBe(0);
    expect(firstOpen(tasks, tasks.map((task) => label({ subject_id: task.subjectId, criterion: task.criterion })))).toBe(0);
    expect(firstOpen([], [])).toBe(0);
  });

  it('a label of another criterion or output does not close a task; a label taken back (verdict null) does not count', () => {
    const tasks = labelTasks(items, criteria);
    expect(firstOpen(tasks, [label({ subject_id: 'd1', criterion: 'natural' })])).toBe(0);
    expect(firstOpen(tasks, [label({ subject_id: 'd1', criterion: 'single_answer', verdict: null })])).toBe(0);
    expect(firstOpen(tasks, [label({ subject_id: 'zz', criterion: 'single_answer' })])).toBe(0);
  });

  it('real questions: a task per question and criterion, in the order of the questions and then of the criteria, by question id', () => {
    const questions = [realItem({ question_id: 'q1' }), realItem({ question_id: 'q2' })];
    expect(realLabelTasks(questions, criteria.slice(0, 1))).toEqual([{ subjectId: 'q1', criterion: 'single_answer' }, { subjectId: 'q2', criterion: 'single_answer' }]);
    expect(realLabelTasks(questions, criteria)).toEqual([
      { subjectId: 'q1', criterion: 'single_answer' }, { subjectId: 'q1', criterion: 'natural' },
      { subjectId: 'q2', criterion: 'single_answer' }, { subjectId: 'q2', criterion: 'natural' },
    ]);
  });

  it('real questions: no question or no criterion is no task; a question deleted since still is one (its snapshot is what the judge saw)', () => {
    expect(realLabelTasks([], criteria)).toEqual([]);
    expect(realLabelTasks([realItem()], [])).toEqual([]);
    expect(realLabelTasks([realItem({ question_id: 'gone', created_at: null, can_add_to_examples: false })], criteria.slice(0, 1))).toEqual([{ subjectId: 'gone', criterion: 'single_answer' }]);
  });

  it('the outputs to label are counted once, whatever the number of criteria', () => {
    expect(outputCount(labelTasks(items, criteria))).toBe(2);
    expect(outputCount([])).toBe(0);
  });
});
