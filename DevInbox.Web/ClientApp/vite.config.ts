import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import pkg from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vitest (browser mode) needs its own static assets directory for the MSW
  // service worker script. Keep it out of `public/` so it never ships to
  // `wwwroot` via `vite build`.
  publicDir: process.env.VITEST ? 'src/test/public' : 'public',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Pre-bundle deps that are otherwise only discovered lazily (e.g. via the
  // `lazy()` route imports in App.tsx, or only pulled in by a subset of spec
  // files). Without this, Vite's optimizer can decide mid-test-run that a new
  // dep needs bundling, forcing a full dev-server reload. In Vitest browser
  // mode that reload can leave the browser instance hung indefinitely
  // (observed in CI as a stuck run after "Vite unexpectedly reloaded a test").
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      '@tanstack/react-query-devtools',
      '@tanstack/react-table',
      '@mui/material',
      '@mui/icons-material',
      'react-hook-form',
      'react-markdown',
      'zustand',
      'msw',
    ],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@app': path.resolve(__dirname, './src/app'),
      '@feature': path.resolve(__dirname, './src/features'),
      '@test': path.resolve(__dirname, './src/test'),
      '@utils': path.resolve(__dirname, './src/shared/utils'),
      // Generated API client — regenerated on every dotnet build from openapi/api.yml
      '@api': path.resolve(__dirname, './generated/api-client'),
    },
  },
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
        secure: false, // allow self-signed dev cert
      },
    },
  },
  test: {
    globals: true,
    // Registers the MSW browser worker (start/resetHandlers/stop) for every
    // spec file. Previously only files that manually imported
    // `@test/setupBrowserTests` got mocking — all others left `/api` requests
    // unintercepted, which is why they leaked to the (disabled) dev proxy.
    setupFiles: ['./src/test/setupBrowserTests.tsx'],
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
