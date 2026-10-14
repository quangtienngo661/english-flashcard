import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { resolveApiBaseUrl } from './src/resolve-api-base-url.ts';

// Spec §4: a production build with the wrong API host must fail before bundling.
function apiBaseUrlGuard(): Plugin {
  return {
    name: 'api-base-url-guard',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_');
      resolveApiBaseUrl(config.mode, env.VITE_API_BASE_URL);
    },
  };
}

export default defineConfig({
  plugins: [apiBaseUrlGuard(), react(), tailwindcss()],
});
