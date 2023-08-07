import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgrPlugin from 'vite-plugin-svgr';
import checker from 'vite-plugin-checker';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      overlay: { initialIsOpen: false },
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      },
    }),
    viteTsconfigPaths(),
    svgrPlugin(),
  ],
  server: {
    watch: {
        usePolling: true,
    },
    host: true,
    strictPort: true,
    port: 5173,
  },
  build: {
    outDir: 'build',
  }
});
