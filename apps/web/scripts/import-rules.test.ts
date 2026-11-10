// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Design giao diện mới §6: folder import rules held by no-restricted-imports. Linted on virtual paths, so nothing is written to disk.
const cwd = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd });

async function flagged(filePath: string, from: string): Promise<string[]> {
  const [result] = await eslint.lintText(`import x from '${from}';\nexport default x;\n`, { filePath: `${cwd}${filePath}` });
  return result!.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.ruleId!);
}

describe('folder import rules (design §6)', { timeout: 30_000 }, () => {
  it('ui/ may not import features, app-shell, app-chrome or site', async () => {
    expect(await flagged('src/ui/Probe.tsx', '@/features/learner/x')).toEqual(['no-restricted-imports']);
    expect(await flagged('src/ui/Probe.tsx', '@/app-shell/config')).toEqual(['no-restricted-imports']);
    expect(await flagged('src/ui/Probe.tsx', '@/app-chrome/TopBar')).toEqual(['no-restricted-imports']);
    expect(await flagged('src/ui/Probe.tsx', '@/site/x')).toEqual(['no-restricted-imports']);
  });

  it('ui/ tests may use the app-shell test helpers', async () => {
    expect(await flagged('src/ui/Probe.test.tsx', '@/app-shell/session/x')).toEqual([]);
  });

  it('site/ may not import features or app-chrome, but may use the theme', async () => {
    expect(await flagged('src/site/Probe.tsx', '@/features/x')).toEqual(['no-restricted-imports']);
    expect(await flagged('src/site/Probe.tsx', '@/app-chrome/x')).toEqual(['no-restricted-imports']);
    expect(await flagged('src/site/Probe.tsx', '@/app-shell/theme/ThemeProvider')).toEqual([]);
  });

  it('app-chrome/ may not import site, but may use feature contexts', async () => {
    expect(await flagged('src/app-chrome/Probe.tsx', '@/site/x')).toEqual(['no-restricted-imports']);
    expect(await flagged('src/app-chrome/Probe.tsx', '@/features/learner/add-word/add-word-context')).toEqual([]);
  });

  it('features/learner/ may not import site', async () => {
    expect(await flagged('src/features/learner/Probe.tsx', '@/site/x')).toEqual(['no-restricted-imports']);
  });
});
