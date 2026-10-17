// Fixed schedule ladder (design 6.1, K21): days until the next review at each level 1–5.
export const LEVEL_INTERVALS = [1, 3, 7, 14, 30] as const;
export const MAX_LEVEL = 5;

// Temporary limits (D23); Bước 5 turns them into tier quotas.
export const GROUPS_MAX = 100;
export const GROUP_ITEMS_MAX = 2000;
export const GROUP_NAME_MAX = 60;
