import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Folder import rules (design giao diện mới §6): a deny-list per folder, so the shared UI kit and the public site stay independent.
  ...[
    { files: ['src/ui/**/*.{ts,tsx}'], ignores: ['src/ui/**/*.test.{ts,tsx}'], banned: ['@/features/*', '@/app-shell/*', '@/app-chrome/*', '@/site/*'] },
    { files: ['src/site/**/*.{ts,tsx}'], banned: ['@/features/*', '@/app-chrome/*'] },
    { files: ['src/app-chrome/**/*.{ts,tsx}'], banned: ['@/site/*'] },
    { files: ['src/features/learner/**/*.{ts,tsx}'], banned: ['@/site/*'] },
  ].map(({ files, ignores, banned }) => ({
    files,
    ...(ignores ? { ignores } : {}),
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: banned, message: `${files[0].split('/**')[0]} may not import ${banned.join(', ')} (design giao diện mới §6).` }],
      }],
    },
  })),
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'test-results/**', 'playwright-report/**', '.open-next/**', '.wrangler/**', '.docker-out/**', 'cloudflare-env.d.ts']),
]);
