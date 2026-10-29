// Types of the config lifecycle (nhóm B design §6; contract §2).

export const CONFIG_STATUSES = ['draft', 'published', 'retired'] as const;
export type ConfigStatus = (typeof CONFIG_STATUSES)[number];
