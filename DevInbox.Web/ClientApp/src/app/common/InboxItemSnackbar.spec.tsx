import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppThemeProvider } from '@shared/theme/AppThemeProvider';
import { ItemSource, SyncChangeKind } from '@api';
import InboxItemSnackbar, { type InboxItemSnackbarProps } from './InboxItemSnackbar';

function makeProps(overrides: Partial<InboxItemSnackbarProps> = {}): InboxItemSnackbarProps {
  return {
    id: 1,
    message: 'New: Fix flaky integration test (GitHub)',
    integration: ItemSource.Github,
    title: 'Fix flaky integration test',
    changeKind: SyncChangeKind.New,
    externalId: '42',
    ...overrides,
  } as InboxItemSnackbarProps;
}

const renderSnackbar = (props: InboxItemSnackbarProps) =>
  render(
    <AppThemeProvider>
      <InboxItemSnackbar {...props} />
    </AppThemeProvider>,
  );

describe('InboxItemSnackbar', () => {
  it('should render a "New" item with its title and external id', () => {
    renderSnackbar(makeProps({ changeKind: SyncChangeKind.New, title: 'Fix flaky integration test', externalId: '42' }));

    expect(screen.getByText('New:')).toBeTruthy();
    expect(screen.getByText('#42 Fix flaky integration test')).toBeTruthy();
  });

  it('should render an "Updated" item with its title and external id', () => {
    renderSnackbar(
      makeProps({ changeKind: SyncChangeKind.Updated, title: 'Update sprint board columns', externalId: '7' }),
    );

    expect(screen.getByText('Updated:')).toBeTruthy();
    expect(screen.getByText('#7 Update sprint board columns')).toBeTruthy();
  });

  it('should render the integration icon for the given source', () => {
    renderSnackbar(makeProps({ integration: ItemSource.Ado }));

    const icon = screen.getByAltText(ItemSource.Ado) as HTMLImageElement;
    expect(icon.src).toContain('/Ado.svg');
  });

  it('should render a hidden accessible message for screen readers', () => {
    renderSnackbar(makeProps({ message: 'New: Fix flaky integration test (GitHub)' }));

    expect(screen.getByText('New: Fix flaky integration test (GitHub)')).toBeTruthy();
  });

  it('should invoke a function action with the snackbar id and render its result', () => {
    const action = vi.fn().mockReturnValue(<button type="button">Dismiss</button>);
    renderSnackbar(makeProps({ id: 'snack-1', action }));

    expect(action).toHaveBeenCalledWith('snack-1');
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
  });

  it('should render a non-function action node as-is', () => {
    renderSnackbar(makeProps({ action: <button type="button">Close</button> }));

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});
