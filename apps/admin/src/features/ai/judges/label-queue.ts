import type { EvalRunItem, JudgeCriterion, LabelView } from '../ai-api';

/** One question to answer about one output: this criterion of this run item. */
export type LabelTask = { subjectId: string; criterion: string };

/**
 * The tasks of a run, output by output and criterion by criterion. Only a dev output that succeeded and has both its input and its output can be
 * labelled (the API refuses the rest: a held-out one is never labelled, R7), so the others are never a task.
 */
export function labelTasks(items: EvalRunItem[], criteria: JudgeCriterion[]): LabelTask[] {
  return items
    .filter((item) => item.split === 'dev' && item.status === 'succeeded' && item.output !== null && item.input !== null)
    .flatMap((item) => criteria.map((criterion) => ({ subjectId: item.item_id, criterion: criterion.code })));
}

/** Where the screen opens: the first task with no label, or the first one when everything is labelled (or there is nothing to label). */
export function firstOpen(tasks: LabelTask[], labels: LabelView[]): number {
  const done = new Set(labels.filter((label) => label.verdict !== null).map((label) => `${label.subject_id}|${label.criterion}`));
  const open = tasks.findIndex((task) => !done.has(`${task.subjectId}|${task.criterion}`));
  return open === -1 ? 0 : open;
}

/** How many outputs the tasks are about (several criteria share one output). */
export const outputCount = (tasks: LabelTask[]): number => new Set(tasks.map((task) => task.subjectId)).size;
