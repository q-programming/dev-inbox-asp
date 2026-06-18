import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import SyncedBadge from './SyncedBadge';

describe('SyncedBadge', () => {
  it('should render the synced status indicator', () => {
    renderWithProviders(<SyncedBadge />);
    expect(screen.getByText(/synced/i)).toBeTruthy();
  });
});
