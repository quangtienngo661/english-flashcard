// Fixed schedule ladder (design 6.1, K21): days until the next review at each level 1–5.
export const LEVEL_INTERVALS = [1, 3, 7, 14, 30] as const;
export const MAX_LEVEL = 5;

// Group and item limits are settings since Bước 5 (`learning.groupsPerUser`, `learning.itemsPerGroup`).
export const GROUP_NAME_MAX = 60;
