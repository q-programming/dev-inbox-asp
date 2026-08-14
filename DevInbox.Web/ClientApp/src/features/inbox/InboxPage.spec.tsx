import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import { useInboxStore } from './store/inbox.store';

const { mockUseMediaQuery } = vi.hoisted(() => ({
  mockUseMediaQuery: vi.fn(),
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');

  return {
    ...actual,
    useMediaQuery: mockUseMediaQuery,
  };
});

vi.mock('./components/inboxList/InboxList', () => ({
  default: () => <div data-testid="mock-inbox-list">list</div>,
}));

vi.mock('./components/inboxDetail/InboxDetailPanel', () => ({
  default: () => <div data-testid="mock-inbox-detail-panel">detail</div>,
}));

import InboxPage from './InboxPage';

describe('InboxPage', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReset();
    useInboxStore.setState({
      status: undefined,
      selectedItemId: undefined,
    });
  });

  it('renders inbox list on mobile when no item is selected', () => {
    mockUseMediaQuery.mockReturnValue(true);

    renderWithProviders(<InboxPage />);

    expect(screen.getByTestId('mock-inbox-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-inbox-detail-panel')).not.toBeInTheDocument();
  });

  it('renders detail panel on mobile when an item is selected', () => {
    mockUseMediaQuery.mockReturnValue(true);
    useInboxStore.setState({ selectedItemId: 123 });

    renderWithProviders(<InboxPage />);

    expect(screen.getByTestId('mock-inbox-detail-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-inbox-list')).not.toBeInTheDocument();
  });

  it('renders only inbox list on desktop when no item is selected', () => {
    mockUseMediaQuery.mockReturnValue(false);

    renderWithProviders(<InboxPage />);

    expect(screen.getByTestId('mock-inbox-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-inbox-detail-panel')).not.toBeInTheDocument();
  });

  it('renders inbox list and detail panel on desktop when an item is selected', () => {
    mockUseMediaQuery.mockReturnValue(false);
    useInboxStore.setState({ selectedItemId: 123 });

    renderWithProviders(<InboxPage />);

    expect(screen.getByTestId('mock-inbox-list')).toBeInTheDocument();
    expect(screen.getByTestId('mock-inbox-detail-panel')).toBeInTheDocument();
  });

  describe('deep-linking via /inbox/:itemId', () => {
    it('seeds the store from the URL itemId param on mount', () => {
      mockUseMediaQuery.mockReturnValue(false);

      renderWithProviders(<InboxPage />, {
        initialEntries: ['/inbox/123'],
        routePath: '/inbox/:itemId',
      });

      expect(useInboxStore.getState().selectedItemId).toBe(123);
      expect(screen.getByTestId('mock-inbox-detail-panel')).toBeInTheDocument();
    });

    it('ignores a non-numeric itemId param and leaves selection untouched', () => {
      mockUseMediaQuery.mockReturnValue(false);

      renderWithProviders(<InboxPage />, {
        initialEntries: ['/inbox/not-a-number'],
        routePath: '/inbox/:itemId',
      });

      expect(useInboxStore.getState().selectedItemId).toBeUndefined();
    });

    it('replaces the URL with /inbox/{id} when an item is selected', () => {
      mockUseMediaQuery.mockReturnValue(false);
      useInboxStore.setState({ selectedItemId: 456 });

      renderWithProviders(<InboxPage />, { initialEntries: ['/inbox'] });

      expect(window.location.pathname).toBe('/inbox/456');
    });

    it('replaces the URL back to /inbox when the selection is cleared', () => {
      mockUseMediaQuery.mockReturnValue(false);
      useInboxStore.setState({ selectedItemId: 456 });

      renderWithProviders(<InboxPage />, {
        initialEntries: ['/inbox/456'],
        routePath: '/inbox/:itemId',
      });
      expect(window.location.pathname).toBe('/inbox/456');

      act(() => {
        useInboxStore.setState({ selectedItemId: undefined });
      });

      expect(window.location.pathname).toBe('/inbox');
    });
  });
});
