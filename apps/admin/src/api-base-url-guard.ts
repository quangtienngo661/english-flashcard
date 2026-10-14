import { loadEnv, type Plugin } from 'vite';
import { resolveApiBaseUrl } from './resolve-api-base-url.ts';

// Spec §4: a production build with the wrong API host must fail before bundling.
// Only `build` is guarded: the URL is written into the bundle then, and `vite preview` (which also runs in
// mode production) only serves the finished files.
export function apiBaseUrlGuard(): Plugin {
  return {
    name: 'api-base-url-guard',
    configResolved(config) {
      if (config.command !== 'build') return;
      const env = loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_');
      resolveApiBaseUrl(config.mode, env.VITE_API_BASE_URL);
    },
  };
}
