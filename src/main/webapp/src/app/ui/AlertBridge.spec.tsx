import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import AlertBridge from './AlertBridge';

const renderBridge = () => renderWithProviders(<AlertBridge />);

beforeEach(() => {
  useAlertStore.setState({ alerts: [] });
});

describe('AlertBridge', () => {
  describe('rendering alerts from store', () => {
    it('should display a snackbar when an alert is added to the store', async () => {
      renderBridge();

      useAlertStore.getState().addAlert({ type: AlertType.SUCCESS, message: 'Saved!' });

      expect(await screen.findByText('Saved!')).toBeTruthy();
    });

    it('should display the correct message for an error alert', async () => {
      renderBridge();

      useAlertStore.getState().addAlert({ type: AlertType.ERROR, message: 'Something went wrong' });

      expect(await screen.findByText('Something went wrong')).toBeTruthy();
    });

    it('should not display duplicate snackbars for the same alert id', async () => {
      renderBridge();

      useAlertStore.getState().addAlert({ type: AlertType.INFO, message: 'Once only' });

      await screen.findByText('Once only');
      const matches = screen.getAllByText('Once only');
      expect(matches).toHaveLength(1);
    });
  });

  describe('dismiss button', () => {
    it('should render a dismiss button alongside the snackbar', async () => {
      renderBridge();

      useAlertStore.getState().addAlert({ type: AlertType.WARNING, message: 'Watch out!' });

      await screen.findByText('Watch out!');
      expect(screen.getByLabelText('Dismiss notification')).toBeTruthy();
    });

    it('should remove the snackbar when the dismiss button is clicked', async () => {
      const user = userEvent.setup();
      renderBridge();

      useAlertStore.getState().addAlert({ type: AlertType.ERROR, message: 'Click to dismiss' });

      await screen.findByText('Click to dismiss');
      await user.click(screen.getByLabelText('Dismiss notification'));

      await waitFor(() => {
        expect(screen.queryByText('Click to dismiss')).toBeFalsy();
      });
    });
  });

  describe('returns null', () => {
    it('should not render any visible DOM of its own', () => {
      const { container } = renderBridge();
      // AlertBridge itself renders null — only notistack portal adds DOM
      expect(container.firstChild).toBeNull();
    });
  });
});
