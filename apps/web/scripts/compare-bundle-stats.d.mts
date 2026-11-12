export function compareBundles(
  baseline: Record<string, number>,
  stats: Array<{ route: string; firstLoadUncompressedJsBytes: number }>,
  opts?: { prefix?: string; limit?: number; limits?: Record<string, number> },
): {
  rows: Array<{ route: string; before: number; after: number; ratio: number; limit: number; over: boolean }>;
  added: string[];
  removed: string[];
};
