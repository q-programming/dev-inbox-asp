import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import pkg from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@app': path.resolve(__dirname, './src/app'),
      '@feature': path.resolve(__dirname, './src/features'),
      '@test': path.resolve(__dirname, './src/test'),
      // Per-module generated API clients — one alias per modulith module.
      // When a module becomes a microservice its alias simply moves with it.
      '@api/auth': path.resolve(__dirname, './generated/auth-client/src'),
      '@api/shared': path.resolve(__dirname, './generated/shared-client/src'),
      '@api/inbox': path.resolve(__dirname, './generated/inbox-client/src'),
      '@api/notes': path.resolve(__dirname, './generated/notes-client/src'),
      '@api/identity': path.resolve(__dirname, './generated/identity-client/src'),
      '@api/sync': path.resolve(__dirname, './generated/sync-client/src'),
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
      provider: playwright(),
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.spec.{ts,tsx}'],
    reporters: ['default', ['junit', { outputFile: 'test-report.xml' }]],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura', 'lcov', 'json-summary', 'json'],
      exclude: [
        '**/*.js',
        '**/*.mjs',
        'src/test/**',
        '**/vite.config.ts',
        '**/main.tsx',
        'generated/**',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
