// D8, D21: the learner app exists only in builds with NEXT_PUBLIC_LEARNER_APP=on.
export const LEARNER_APP_ENABLED = process.env.NEXT_PUBLIC_LEARNER_APP === 'on';

const APP_PATH = /^\/([a-z]{2})\/app(?:\/|$)/;

// Off: /{locale}/app and every sub-path go back to /{locale} (query dropped); on: no redirect.
export function learnerAppRedirect(pathname: string, enabled: boolean): string | null {
  if (enabled) return null;
  const match = APP_PATH.exec(pathname);
  return match ? `/${match[1]}` : null;
}

// App route files are page.app.tsx / layout.app.tsx: Next only sees them when this extension is listed.
export function appPageExtensions(enabled: boolean): string[] {
  const base = ['tsx', 'ts', 'jsx', 'js'];
  return enabled ? ['app.tsx', ...base] : base;
}
