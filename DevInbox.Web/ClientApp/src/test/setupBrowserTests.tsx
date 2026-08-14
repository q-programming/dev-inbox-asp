import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupWorker } from 'msw/browser';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { handlers } from './handlers';

// MSW v2 browser mode — uses a Service Worker interceptor (Playwright injects it).
export const server = setupWorker(...handlers);

// Vitest's browser mode reuses a single browser tab/origin across spec files, so the real,
// browser-level Service Worker registration MSW checks against can already be active/inactive
// by the time a later file's fresh `setupWorker()` instance calls start()/stop() — MSW then logs
// a "redundant call" console.warn purely because of that reused-tab quirk, not because of
// anything wrong in this setup. It's benign noise (mocking behaves correctly regardless), so it's
// filtered out here rather than left to spam every test file's output.
const originalWarn = console.warn;
console.warn = (...args: Parameters<typeof console.warn>) => {
  const [message] = args;
  if (typeof message === 'string' && message.includes('Found a redundant "worker.')) {
    return;
  }
  originalWarn(...args);
};

// `quiet: true` suppresses MSW's per-request console.group logging (Request/Handler/Response
// dumps) and the "Mocking enabled" banner — pure noise in a test run, since assertions don't
// depend on any of it.
beforeAll(() => server.start({ onUnhandledRequest: 'warn', quiet: true }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.stop());
