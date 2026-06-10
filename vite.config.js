import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    assetsInlineLimit: 0,
    emptyOutDir: true,
  },
  define: {
    __DEV__: mode === 'development',
  },
}));
