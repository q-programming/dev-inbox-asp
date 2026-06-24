import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupWorker } from 'msw/browser';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { handlers } from './handlers';

// MSW v2 browser mode — uses a Service Worker interceptor (Playwright injects it).
export const server = setupWorker(...handlers);

beforeAll(() => server.start({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.stop());
