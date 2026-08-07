import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InboxReason, ItemSource, Priority, type InboxItemSummary } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import InboxItem from './InboxItem';
import { useInboxStore } from '@feature/inbox/store/inbox.store';

vi.mock('@utils/date', () => ({
  formatRelativeTime: vi.fn(() => '3 hours ago'),
}));

function makeInboxItem(overrides: Partial<InboxItemSummary> = {}): InboxItemSummary {
  return {
    id: 123,
    title: 'Review API contract',
    isUnread: true,
    activityAt: '2026-07-31T10:15:00.000Z' as unknown as Date,
    repository: 'octo/dev-inbox',
    reason: InboxReason.ReviewRequested,
    priority: Priority.High,
    sourceType: ItemSource.Github,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useInboxStore.setState({
    status: undefined,
    selectedItemId: undefined,
    openItem: (itemId) => useInboxStore.setState({ selectedItemId: itemId }),
    closeItem: () => useInboxStore.setState({ selectedItemId: undefined }),
    clear: () => useInboxStore.setState({ status: undefined, selectedItemId: undefined }),
    setStatus: (status) => useInboxStore.setState({ status }),
    updateVersion: (version) =>
      useInboxStore.setState((state) => ({
        status: state.status ? { ...state.status, version } : undefined,
      })),
  });
});

describe('InboxItem', () => {
  describe('content rendering', () => {
    it('renders title, repository and relative time', () => {
      renderWithProviders(<InboxItem item={makeInboxItem()} />);

      expect(screen.getByText('Review API contract')).toBeTruthy();
      expect(screen.getByText('octo/dev-inbox')).toBeTruthy();
      expect(screen.getByText('3 hours ago')).toBeTruthy();
    });

    it('hides repository text when repository is absent', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ repository: undefined })} />);

      expect(screen.queryByText('octo/dev-inbox')).toBeNull();
    });

    it('renders reason and priority badges', () => {
      const item = makeInboxItem();

      renderWithProviders(<InboxItem item={item} />);

      expect(screen.getByTestId('inbox-reason-chip')).toHaveAttribute('data-reason', item.reason);
      expect(screen.getByTestId('inbox-priority-chip')).toHaveAttribute('data-priority', item.priority);
    });
  });

  describe('unread state', () => {
    it('shows the unread dot when the item is unread', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ isUnread: true })} />);

      expect(screen.getByTestId('inbox-item-unread-dot')).toBeTruthy();
    });

    it('hides the unread dot when the item is read', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ isUnread: false })} />);

      expect(screen.queryByTestId('inbox-item-unread-dot')).toBeNull();
    });
  });

  describe('click handling', () => {
    it('calls openItem with the item id when clicked', async () => {
      const user = userEvent.setup();
      const openItem = vi.fn();
      useInboxStore.setState({ openItem });

      renderWithProviders(<InboxItem item={makeInboxItem({ id: 987 })} />);

      await user.click(screen.getByTestId('inbox-item'));

      expect(openItem).toHaveBeenCalledWith(987);
    });
  });

  describe('selected state', () => {
    it('marks the item as selected when the store selectedItemId matches', () => {
      useInboxStore.setState({ selectedItemId: 123 });

      renderWithProviders(<InboxItem item={makeInboxItem({ id: 123 })} />);

      expect(screen.getByTestId('inbox-item').className).toMatch(/Mui-selected/);
    });

    it('does not mark the item as selected when the store selectedItemId differs', () => {
      useInboxStore.setState({ selectedItemId: 999 });

      renderWithProviders(<InboxItem item={makeInboxItem({ id: 123 })} />);

      expect(screen.getByTestId('inbox-item').className).not.toMatch(/Mui-selected/);
    });
  });

  describe('comment count and note indicators', () => {
    it('renders the comment count indicator with the count and pluralized tooltip text', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InboxItem item={makeInboxItem({ commentCount: 3 })} />);

      const commentCountEl = screen.getByTestId('inbox-item-comment-count');
      expect(commentCountEl).toBeTruthy();
      expect(commentCountEl.textContent).toContain('3');

      await user.hover(commentCountEl);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toBe('3 comments');
    });

    it('uses singular tooltip text when commentCount is 1', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InboxItem item={makeInboxItem({ commentCount: 1 })} />);

      const commentCountEl = screen.getByTestId('inbox-item-comment-count');
      await user.hover(commentCountEl);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toBe('1 comment');
    });

    it('hides the comment count indicator when commentCount is 0', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ commentCount: 0 })} />);

      expect(screen.queryByTestId('inbox-item-comment-count')).toBeNull();
    });

    it('hides the comment count indicator when commentCount is undefined', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ commentCount: undefined })} />);

      expect(screen.queryByTestId('inbox-item-comment-count')).toBeNull();
    });

    it('renders the hasNote indicator with the "Has a note" tooltip when hasNote is true', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InboxItem item={makeInboxItem({ hasNote: true })} />);

      const hasNoteEl = screen.getByTestId('inbox-item-has-note');
      expect(hasNoteEl).toBeTruthy();

      await user.hover(hasNoteEl);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toBe('Has a note');
    });

    it('hides the hasNote indicator when hasNote is false', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ hasNote: false })} />);

      expect(screen.queryByTestId('inbox-item-has-note')).toBeNull();
    });

    it('hides the hasNote indicator when hasNote is undefined', () => {
      renderWithProviders(<InboxItem item={makeInboxItem({ hasNote: undefined })} />);

      expect(screen.queryByTestId('inbox-item-has-note')).toBeNull();
    });

    it('renders both indicators together when commentCount > 0 and hasNote is true', () => {
      renderWithProviders(
        <InboxItem item={makeInboxItem({ commentCount: 5, hasNote: true })} />
      );

      expect(screen.getByTestId('inbox-item-comment-count')).toBeTruthy();
      expect(screen.getByTestId('inbox-item-has-note')).toBeTruthy();
    });
  });
});
