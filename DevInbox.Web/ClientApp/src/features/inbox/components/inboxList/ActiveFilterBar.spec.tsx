import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import ActiveFilterBar from './ActiveFilterBar';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { beforeEach } from 'vitest';

beforeEach(() => useInboxStore.setState({ searchTerm: '' }));

const Harness = () => {
  const location = useLocation();
  return (
    <>
      <ActiveFilterBar />
      <span data-testid="search">{location.search}</span>
    </>
  );
};

describe('ActiveFilterBar', () => {
  it('renders nothing without active filters', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/inbox'] });
    expect(screen.queryByTestId('active-filter-bar')).not.toBeInTheDocument();
  });

  it('shows a chip per active filter and removes only the dismissed one', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/inbox?source=Github&status=ToDo'] });

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();

    const chip = screen.getByTestId('active-filter-chip-status');
    await userEvent.click(chip.querySelector('.MuiChip-deleteIcon')!);

    expect(screen.getByTestId('search')).toHaveTextContent('?source=Github');
    expect(screen.queryByText('To Do')).not.toBeInTheDocument();
  });

  it('shows only the last segment of a repository/team scope', () => {
    renderWithProviders(<Harness />, { initialEntries: ['/inbox?scope=org%2Frepo'] });
    expect(screen.getByText('repo')).toBeInTheDocument();
  });

  it('shows a search term chip and clears the term when dismissed', async () => {
    useInboxStore.setState({ searchTerm: 'account' });
    renderWithProviders(<Harness />, { initialEntries: ['/inbox'] });

    expect(screen.getByText('Search: account')).toBeInTheDocument();
    await userEvent.click(
      screen.getByTestId('active-filter-chip-term').querySelector('.MuiChip-deleteIcon')!,
    );

    expect(useInboxStore.getState().searchTerm).toBe('');
  });

  it('clears all filters at once', async () => {
    renderWithProviders(<Harness />, { initialEntries: ['/inbox?source=Github&status=ToDo'] });
    await userEvent.click(screen.getByTestId('active-filter-clear-all'));

    expect(screen.queryByTestId('active-filter-bar')).not.toBeInTheDocument();
  });
});
