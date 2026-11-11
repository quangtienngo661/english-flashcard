export function compareBundles(
  baseline: Record<string, number>,
  stats: Array<{ route: string; firstLoadUncompressedJsBytes: number }>,
  opts?: { prefix?: string; limit?: number },
): {
  rows: Array<{ route: string; before: number; after: number; ratio: number; over: boolean }>;
  added: string[];
  removed: string[];
};
