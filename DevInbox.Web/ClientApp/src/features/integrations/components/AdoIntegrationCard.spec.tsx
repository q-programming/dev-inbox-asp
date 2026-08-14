import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import AdoIntegrationCard from './AdoIntegrationCard';

describe('AdoIntegrationCard', () => {
  it('renders as a coming-soon placeholder with no interactive controls', () => {
    renderWithProviders(<AdoIntegrationCard />);

    expect(screen.getByTestId('ado-coming-soon-badge')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
