import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Per-module generated API clients — one alias per modulith module.
      // When a module becomes a microservice its alias simply moves with it.
      '@api/shared':   path.resolve(__dirname, './generated/shared-client/src'),
      '@api/inbox':    path.resolve(__dirname, './generated/inbox-client/src'),
      '@api/notes':    path.resolve(__dirname, './generated/notes-client/src'),
      '@api/identity': path.resolve(__dirname, './generated/identity-client/src'),
      '@api/sync':     path.resolve(__dirname, './generated/sync-client/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    fileParallelism: true,
    testTimeout: 15000,
    browser: {
      enabled: true,
      headless: true,
      provider: 'playwright',
      screenshotFailures: false,
      instances: [
        { browser: 'chromium' },
      ],
    },
    include: ['src/**/*.spec.{ts,tsx}'],
    reporters: ['default', ['junit', { outputFile: 'test-report.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura', 'lcov'],
      exclude: [
        '**/*.js',
        '**/*.mjs',
        'src/test/**',
        '**/vite.config.ts',
        '**/main.tsx',
        'generated/**',
      ],
    },
  },
});
