import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncStatus } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import { InboxSyncStatus } from './InboxSyncStatus';

const syncMutationMock = vi.fn();
const addAlertMock = vi.fn();
const inboxStoreState = {
  status: undefined as { syncStatus?: SyncStatus; lastSyncCompletedAt?: Date } | undefined,
};

vi.mock('@feature/inbox/hooks/useInboxQuery', () => ({
  useSyncMutation: () => ({ mutate: syncMutationMock }),
}));

vi.mock('@feature/inbox/store/inbox.store', () => ({
  useInboxStore: (selector?: (state: typeof inboxStoreState) => unknown) =>
    selector ? selector(inboxStoreState) : inboxStoreState,
}));

vi.mock('@shared/store/alert.store', () => ({
  default: () => ({ addAlert: addAlertMock }),
  AlertType: { INFO: 'info', SUCCESS: 'success', WARNING: 'warning', ERROR: 'error' },
}));

const NOW = new Date('2024-06-15T12:00:00.000Z');

describe('InboxSyncStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    syncMutationMock.mockReset();
    addAlertMock.mockReset();
    inboxStoreState.status = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { label: 'undefined completedAt', completedAt: undefined, expected: 'Never synced' },
    {
      label: 'less than a minute ago',
      completedAt: new Date(NOW.getTime() - 30_000),
      expected: 'Synced just now',
    },
    {
      label: 'exactly now',
      completedAt: new Date(NOW.getTime()),
      expected: 'Synced just now',
    },
    {
      label: '1 minute ago',
      completedAt: new Date(NOW.getTime() - 60_000),
      expected: 'Synced 1 min ago',
    },
    {
      label: '45 minutes ago',
      completedAt: new Date(NOW.getTime() - 45 * 60_000),
      expected: 'Synced 45 min ago',
    },
    {
      label: '59 minutes ago',
      completedAt: new Date(NOW.getTime() - 59 * 60_000),
      expected: 'Synced 59 min ago',
    },
    {
      label: 'exactly 1 hour ago',
      completedAt: new Date(NOW.getTime() - 60 * 60_000),
      expected: 'Synced 1h ago',
    },
    {
      label: '5 hours ago',
      completedAt: new Date(NOW.getTime() - 5 * 60 * 60_000),
      expected: 'Synced 5h ago',
    },
    {
      label: '23 hours ago',
      completedAt: new Date(NOW.getTime() - 23 * 60 * 60_000),
      expected: 'Synced 23h ago',
    },
    {
      label: 'exactly 1 day ago',
      completedAt: new Date(NOW.getTime() - 24 * 60 * 60_000),
      expected: 'Synced 1 day ago',
    },
    {
      label: '3 days ago',
      completedAt: new Date(NOW.getTime() - 3 * 24 * 60 * 60_000),
      expected: 'Synced 3 days ago',
    },
  ])('shows "$expected" when last sync was $label', ({ completedAt, expected }) => {
    inboxStoreState.status = {
      syncStatus: SyncStatus.Idle,
      lastSyncCompletedAt: completedAt,
    };

    renderWithProviders(<InboxSyncStatus />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('shows "Sync ongoing" and disables the button while a sync is running', () => {
    inboxStoreState.status = {
      syncStatus: SyncStatus.Running,
      lastSyncCompletedAt: new Date(NOW.getTime() - 60_000),
    };

    renderWithProviders(<InboxSyncStatus />);

    expect(screen.getByText('Sync ongoing')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-sync-button')).toBeDisabled();
  });

  it('triggers a manual sync and shows an alert when the sync button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    inboxStoreState.status = {
      syncStatus: SyncStatus.Idle,
      lastSyncCompletedAt: undefined,
    };

    renderWithProviders(<InboxSyncStatus />);

    await user.click(screen.getByTestId('inbox-sync-button'));

    expect(addAlertMock).toHaveBeenCalledWith({
      type: 'info',
      message: 'Triggering manual sync...',
    });
    expect(syncMutationMock).toHaveBeenCalled();
  });
});
