import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Open Food Facts search-a-licious (3.5M+ products) — avoid browser CORS in dev.
      '/api/off-search': {
        target: 'https://search.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://local');
          const q = url.searchParams.get('q') || '';
          const limit = url.searchParams.get('limit') || '20';
          return `/search?${new URLSearchParams({
            q,
            page_size: limit,
            langs: 'en',
          })}`;
        },
        headers: {
          'User-Agent': 'TallyHabits/1.0 (vite-dev-proxy)',
        },
      },
    },
  },
});
