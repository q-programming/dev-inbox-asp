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
    proxy: {
      '/api': {
        target: 'https://localhost:7080',
        changeOrigin: true,
        secure: false, // allow self-signed dev cert
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
