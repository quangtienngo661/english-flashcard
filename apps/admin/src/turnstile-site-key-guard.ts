import { loadEnv, type Plugin } from 'vite';

// Launch prep A, design 4.3: a production build without the Turnstile site key must fail before bundling, or the sign-in page
// would ship with the fake widget, which the real API refuses (LA1E18), and nobody could sign in. Same shape as apiBaseUrlGuard:
// only `build` is guarded; the e2e and docker builds (other modes) may leave the key blank.
export function turnstileSiteKeyGuard(): Plugin {
  return {
    name: 'turnstile-site-key-guard',
    configResolved(config) {
      if (config.command !== 'build' || config.mode !== 'production') return;
      const env = loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_');
      if ((env.VITE_TURNSTILE_SITE_KEY ?? '').trim() === '') {
        throw new Error('VITE_TURNSTILE_SITE_KEY is required in a production build (the Cloudflare Turnstile site key)');
      }
    },
  };
}
