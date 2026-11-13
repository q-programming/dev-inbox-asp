import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import CollapsibleSection from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders the title and body expanded by default', () => {
    renderWithProviders(
      <CollapsibleSection title="Description" data-testid="section">
        <p>Body content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Body content')).toBeTruthy();
    expect(screen.getByTestId('section-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides and shows the body when the header is toggled', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CollapsibleSection title="Description" data-testid="section">
        <p>Body content</p>
      </CollapsibleSection>,
    );

    await user.click(screen.getByTestId('section-toggle'));
    await waitFor(() => expect(screen.queryByText('Body content')).toBeNull());
    expect(screen.getByTestId('section-toggle')).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByTestId('section-toggle'));
    expect(await screen.findByText('Body content')).toBeTruthy();
  });

  it('starts collapsed when defaultExpanded is false', () => {
    renderWithProviders(
      <CollapsibleSection title="Description" defaultExpanded={false} data-testid="section">
        <p>Body content</p>
      </CollapsibleSection>,
    );

    expect(screen.queryByText('Body content')).toBeNull();
    expect(screen.getByTestId('section-toggle')).toHaveAttribute('aria-expanded', 'false');
  });
});
