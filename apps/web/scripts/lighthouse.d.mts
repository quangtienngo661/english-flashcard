export type LighthouseSummary = {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};
export function summarise(report: { categories: Record<string, { score: number | null }> }): LighthouseSummary;
export function lighthouseArgs(url: string, outputPath: string, form: 'mobile' | 'desktop'): string[];
