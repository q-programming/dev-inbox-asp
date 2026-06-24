import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import DangerZoneSection from './DangerZoneSection';
import useAlertStore, { AlertType } from '@shared/store/alert.store';

describe('DangerZoneSection', () => {
  it('dispatches a warning alert when Deactivate Account is clicked', async () => {
    const user = userEvent.setup();
    const mockAddAlert = vi.fn();
    useAlertStore.setState({ addAlert: mockAddAlert });

    renderWithProviders(<DangerZoneSection />);
    await user.click(screen.getByTestId('deactivate-btn'));

    expect(mockAddAlert).toHaveBeenCalledOnce();
    expect(mockAddAlert).toHaveBeenCalledWith(expect.objectContaining({ type: AlertType.WARNING }));
  });
});
