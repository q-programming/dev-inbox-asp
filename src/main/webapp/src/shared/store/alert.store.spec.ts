import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useAlertStore, { AlertType, type Alert } from './alert.store';

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 0, // always overridden by the store
  type: AlertType.ERROR,
  message: 'Test alert',
  ...overrides,
});

describe('useAlertStore', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [] });
  });

  it('should start with an empty alerts list', () => {
    expect(useAlertStore.getState().alerts).toEqual([]);
  });

  describe('addAlert', () => {
    it('should add an alert to the list', () => {
      useAlertStore.getState().addAlert(makeAlert({ message: 'Hello!' }));

      expect(useAlertStore.getState().alerts).toHaveLength(1);
      expect(useAlertStore.getState().alerts[0].message).toBe('Hello!');
    });

    it('should override the caller id with an auto-incremented id', () => {
      useAlertStore.getState().addAlert(makeAlert({ id: 999 }));

      const { id } = useAlertStore.getState().alerts[0];
      expect(id).not.toBe(999);
      expect(id).toBeGreaterThan(0);
    });

    it('should assign a unique id to each alert', () => {
      useAlertStore.getState().addAlert(makeAlert());
      useAlertStore.getState().addAlert(makeAlert());

      const [first, second] = useAlertStore.getState().alerts;
      expect(first.id).not.toBe(second.id);
    });

    it('should preserve the alert type and message', () => {
      useAlertStore.getState().addAlert(makeAlert({ type: AlertType.WARNING, message: 'Watch out!' }));

      const alert = useAlertStore.getState().alerts[0];
      expect(alert.type).toBe(AlertType.WARNING);
      expect(alert.message).toBe('Watch out!');
    });

    it('should allow multiple alerts to coexist', () => {
      useAlertStore.getState().addAlert(makeAlert({ message: 'First' }));
      useAlertStore.getState().addAlert(makeAlert({ message: 'Second' }));
      useAlertStore.getState().addAlert(makeAlert({ message: 'Third' }));

      expect(useAlertStore.getState().alerts).toHaveLength(3);
    });

    describe('auto-dismiss', () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it('should auto-dismiss a SUCCESS alert after 3 s', () => {
        useAlertStore.getState().addAlert(makeAlert({ type: AlertType.SUCCESS }));

        vi.advanceTimersByTime(3_000);

        expect(useAlertStore.getState().alerts).toHaveLength(0);
      });

      it('should auto-dismiss a WARNING alert after 6 s', () => {
        useAlertStore.getState().addAlert(makeAlert({ type: AlertType.WARNING }));

        vi.advanceTimersByTime(5_999);
        expect(useAlertStore.getState().alerts).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(useAlertStore.getState().alerts).toHaveLength(0);
      });

      it('should auto-dismiss an ERROR alert after 10 s', () => {
        useAlertStore.getState().addAlert(makeAlert({ type: AlertType.ERROR }));

        vi.advanceTimersByTime(9_999);
        expect(useAlertStore.getState().alerts).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(useAlertStore.getState().alerts).toHaveLength(0);
      });

      it('should not dismiss an alert before its timeout elapses', () => {
        useAlertStore.getState().addAlert(makeAlert({ type: AlertType.SUCCESS }));

        vi.advanceTimersByTime(2_999);

        expect(useAlertStore.getState().alerts).toHaveLength(1);
      });

      it('should only dismiss the timed-out alert when multiple are present', () => {
        useAlertStore.getState().addAlert(makeAlert({ type: AlertType.SUCCESS, message: 'Quick' }));
        useAlertStore.getState().addAlert(makeAlert({ type: AlertType.ERROR, message: 'Persistent' }));

        vi.advanceTimersByTime(3_000);

        const remaining = useAlertStore.getState().alerts;
        expect(remaining).toHaveLength(1);
        expect(remaining[0].message).toBe('Persistent');
      });
    });
  });

  describe('removeAlert', () => {
    it('should remove the alert with the matching id', () => {
      useAlertStore.getState().addAlert(makeAlert({ message: 'Gone' }));
      const { id } = useAlertStore.getState().alerts[0];

      useAlertStore.getState().removeAlert(id);

      expect(useAlertStore.getState().alerts).toHaveLength(0);
    });

    it('should leave other alerts intact', () => {
      useAlertStore.getState().addAlert(makeAlert({ message: 'First' }));
      useAlertStore.getState().addAlert(makeAlert({ message: 'Second' }));
      const [{ id: firstId }] = useAlertStore.getState().alerts;

      useAlertStore.getState().removeAlert(firstId);

      const remaining = useAlertStore.getState().alerts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].message).toBe('Second');
    });

    it('should not throw when removing a non-existent id', () => {
      useAlertStore.getState().addAlert(makeAlert());

      expect(() => useAlertStore.getState().removeAlert(-1)).not.toThrow();
      expect(useAlertStore.getState().alerts).toHaveLength(1);
    });
  });
});
