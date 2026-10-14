import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { apiBaseUrlGuard } from './src/api-base-url-guard.ts';

export default defineConfig({
  plugins: [apiBaseUrlGuard(), react(), tailwindcss()],
});
