import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import DangerZoneSection from './DangerZoneSection';
import useAlertStore, { AlertType, type AlertMessage } from '@shared/store/alert.store';

describe('DangerZoneSection', () => {
  const originalAddAlert = useAlertStore.getState().addAlert;
  let mockAddAlert: Mock<(alert: AlertMessage) => void>;
  let deleteCalls: number;
  let logoutCalls: number;

  beforeEach(() => {
    mockAddAlert = vi.fn();
    useAlertStore.setState({ addAlert: mockAddAlert });
    deleteCalls = 0;
    logoutCalls = 0;
    server.use(
      http.post('/api/auth/logout', () => {
        logoutCalls++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
  });

  afterEach(() => {
    useAlertStore.setState({ addAlert: originalAddAlert });
    vi.restoreAllMocks();
  });

  const useDeleteEndpoint = (status: number) =>
    server.use(
      http.delete('/api/auth/account/delete', () => {
        deleteCalls++;
        return new HttpResponse(null, { status });
      }),
    );

  const openConfirmModal = async (user: ReturnType<typeof userEvent.setup>) => {
    renderWithProviders(<DangerZoneSection />);
    await user.click(screen.getByTestId('deactivate-btn'));
    return screen.findByTestId('confirm-modal');
  };

  it('asks for confirmation before deleting anything', async () => {
    const user = userEvent.setup();
    useDeleteEndpoint(204);

    expect(await openConfirmModal(user)).toBeInTheDocument();

    expect(screen.getByText('Delete DevInbox Account?')).toBeInTheDocument();
    expect(deleteCalls).toBe(0);
    expect(mockAddAlert).not.toHaveBeenCalled();
  });

  it('closes the modal without calling the API when cancelled', async () => {
    const user = userEvent.setup();
    useDeleteEndpoint(204);
    await openConfirmModal(user);

    await user.click(screen.getByTestId('confirm-modal-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument());
    expect(deleteCalls).toBe(0);
    expect(logoutCalls).toBe(0);
  });

  it('deletes the account, shows a success alert and logs the user out when confirmed', async () => {
    const user = userEvent.setup();
    useDeleteEndpoint(204);
    await openConfirmModal(user);

    await user.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(logoutCalls).toBe(1));
    expect(deleteCalls).toBe(1);
    expect(mockAddAlert).toHaveBeenCalledOnce();
    expect(mockAddAlert).toHaveBeenCalledWith(expect.objectContaining({ type: AlertType.SUCCESS }));
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument());
  });

  it('shows an error alert, keeps the session and closes the modal when deletion fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    useDeleteEndpoint(500);
    await openConfirmModal(user);

    await user.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(mockAddAlert).toHaveBeenCalledOnce());
    expect(mockAddAlert).toHaveBeenCalledWith(expect.objectContaining({ type: AlertType.ERROR }));
    expect(logoutCalls).toBe(0);
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument());
  });

  it('can retry deletion after a failed attempt', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    useDeleteEndpoint(500);
    await openConfirmModal(user);
    await user.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(mockAddAlert).toHaveBeenCalledTimes(1));

    useDeleteEndpoint(204);
    await user.click(screen.getByTestId('deactivate-btn'));
    await user.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(logoutCalls).toBe(1));
    expect(mockAddAlert).toHaveBeenLastCalledWith(expect.objectContaining({ type: AlertType.SUCCESS }));
  });
});
