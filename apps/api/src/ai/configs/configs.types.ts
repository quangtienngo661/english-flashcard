// Types of the config lifecycle (nhóm B design §6; contract §2).

export const CONFIG_STATUSES = ['draft', 'published', 'retired'] as const;
export type ConfigStatus = (typeof CONFIG_STATUSES)[number];

/** Items of a run that passed, out of the items that were judged (a criterion nothing judged has `counted: 0`). */
export type Tally = { passed: number; counted: number };

/** What a publish warns about (design §6.3 step 3); M3 adds the judge criteria. */
export type PublishWarning =
  | { code: 'rate-drop'; criterion: 'shape' | 'rule' | 'expected'; before: Tally; after: Tally }
  | { code: 'dev-regressed'; example_ids: string[] }
  | { code: 'held-out-failures-up'; before: number; after: number };
