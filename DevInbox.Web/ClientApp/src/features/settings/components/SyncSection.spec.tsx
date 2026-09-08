import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import SyncSection from './SyncSection';
import useSettingsStore, {
  DEFAULT_SYNC_INTERVAL_MINUTES,
  SYNC_INTERVAL_MAX_MINUTES,
  SYNC_INTERVAL_MIN_MINUTES,
} from '@feature/settings/store/settings.store';

beforeEach(() => {
  useSettingsStore.setState({
    syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
    sendNotifications: false,
  });
});

describe('SyncSection', () => {
  describe('sync interval slider', () => {
    it('initialises the slider with the stored sync interval', () => {
      useSettingsStore.setState({ syncIntervalMinutes: 25 });
      renderWithProviders(<SyncSection />);
      expect(screen.getByRole('slider', { name: /sync interval in minutes/i })).toHaveAttribute(
        'aria-valuenow',
        '25',
      );
    });

    it('renders the min and max bounds in the hint text', () => {
      renderWithProviders(<SyncSection />);
      expect(
        screen.getByText(
          new RegExp(`between ${SYNC_INTERVAL_MIN_MINUTES} and ${SYNC_INTERVAL_MAX_MINUTES} minutes`, 'i'),
        ),
      ).toBeInTheDocument();
    });

    it('calls changeSyncIntervalMinutes when the slider value changes', () => {
      const mockChangeSyncIntervalMinutes = vi.fn();
      useSettingsStore.setState({ changeSyncIntervalMinutes: mockChangeSyncIntervalMinutes });
      renderWithProviders(<SyncSection />);
      fireEvent.change(screen.getByRole('slider', { name: /sync interval in minutes/i }), {
        target: { value: '40' },
      });
      expect(mockChangeSyncIntervalMinutes).toHaveBeenCalledWith(40);
    });

    it('displays the current interval value next to the slider', () => {
      useSettingsStore.setState({ syncIntervalMinutes: 45 });
      renderWithProviders(<SyncSection />);
      expect(screen.getByTestId('sync-interval-value')).toHaveTextContent('45 min');
    });
  });

  describe('notifications checkbox', () => {
    it('reflects sendNotifications = false as unchecked', () => {
      renderWithProviders(<SyncSection />);
      expect(screen.getByRole('checkbox', { name: /notify me in the browser/i })).not.toBeChecked();
    });

    it('reflects sendNotifications = true as checked', () => {
      useSettingsStore.setState({ sendNotifications: true });
      renderWithProviders(<SyncSection />);
      expect(screen.getByRole('checkbox', { name: /notify me in the browser/i })).toBeChecked();
    });

    it('calls toggleSendNotifications when clicked', async () => {
      const user = userEvent.setup();
      const mockToggleSendNotifications = vi.fn();
      useSettingsStore.setState({ toggleSendNotifications: mockToggleSendNotifications });
      renderWithProviders(<SyncSection />);
      await user.click(screen.getByTestId('send-notifications-checkbox'));
      expect(mockToggleSendNotifications).toHaveBeenCalledOnce();
    });
  });
});
