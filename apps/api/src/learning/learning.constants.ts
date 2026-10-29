// Fixed schedule ladder (design 6.1, K21): days until the next review at each level 1–5.
export const LEVEL_INTERVALS = [1, 3, 7, 14, 30] as const;
export const MAX_LEVEL = 5;

// Group and item limits are settings since Bước 5 (`learning.groupsPerUser`, `learning.itemsPerGroup`).
export const GROUP_NAME_MAX = 60;

// D7/D30 report (nhóm B design §10): the zone of the registration week and of "today", and the range the report reads when none is sent.
export const RETENTION_DAY_ZONE = 'Asia/Ho_Chi_Minh';
export const RETENTION_DEFAULT_DAYS = 90;
