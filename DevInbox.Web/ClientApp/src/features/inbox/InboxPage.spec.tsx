import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
});
