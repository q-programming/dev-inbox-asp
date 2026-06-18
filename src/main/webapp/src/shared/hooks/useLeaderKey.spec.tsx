import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useLeaderKey } from './useLeaderKey.ts';
import useAlertStore from '@shared/store/alert.store.ts';
import { AppRoute } from '@app/routes.ts';

// Capture navigation
let lastNavigatedPath = '';
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => (path: string) => {
      lastNavigatedPath = path;
    },
  };
});

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderLeaderKey() {
  return renderHook(() => useLeaderKey(), {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });
}

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
}

beforeEach(() => {
  lastNavigatedPath = '';
  useAlertStore.setState({ alerts: [] });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLeaderKey', () => {
  describe('g + i — navigate to inbox', () => {
    it('should navigate to inbox on g then i', () => {
      renderLeaderKey();
      fireKey('g');
      fireKey('i');
      expect(lastNavigatedPath).toBe(AppRoute.INBOX);
    });

    it('should add an alert when navigating', () => {
      renderLeaderKey();
      fireKey('g');
      fireKey('i');
      expect(useAlertStore.getState().alerts.length).toBeGreaterThan(0);
    });
  });

  describe('g + n — navigate to notes', () => {
    it('should navigate to notes on g then n', () => {
      renderLeaderKey();
      fireKey('g');
      fireKey('n');
      expect(lastNavigatedPath).toBe(AppRoute.NOTES);
    });
  });

  describe('unknown second key', () => {
    it('should not navigate when second key is unmapped', () => {
      renderLeaderKey();
      fireKey('g');
      fireKey('z');
      expect(lastNavigatedPath).toBe('');
    });
  });

  describe('timeout reset', () => {
    it('should not navigate when second key arrives after timeout', () => {
      renderLeaderKey();
      fireKey('g');
      act(() => vi.advanceTimersByTime(1100));
      fireKey('i');
      expect(lastNavigatedPath).toBe('');
    });
  });

  describe('suppression in inputs', () => {
    it('should not activate leader when g is pressed inside an input', () => {
      renderLeaderKey();
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
      // Even if we fire i globally the pending flag should not be set
      fireKey('i');
      expect(lastNavigatedPath).toBe('');
      document.body.removeChild(input);
    });
  });

  describe('modifier keys suppression', () => {
    it('should not activate leader when g is pressed with a modifier', () => {
      renderLeaderKey();
      fireKey('g', { ctrlKey: true });
      fireKey('i');
      expect(lastNavigatedPath).toBe('');
    });
  });

  describe('cleanup', () => {
    it('should remove keydown listener on unmount', () => {
      const { unmount } = renderLeaderKey();
      unmount();
      fireKey('g');
      fireKey('i');
      expect(lastNavigatedPath).toBe('');
    });
  });
});
