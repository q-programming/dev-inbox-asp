import { beforeEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import { ItemSource, SyncChangeKind } from '@api';
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

      act(() => {
        useAlertStore.getState().addAlert({ type: AlertType.SUCCESS, message: 'Saved!' });
      });

      expect(await screen.findByText('Saved!')).toBeTruthy();
    });

    it('should display the correct message for an error alert', async () => {
      renderBridge();
      act(() => {
        useAlertStore
          .getState()
          .addAlert({ type: AlertType.ERROR, message: 'Something went wrong' });
      });
      expect(await screen.findByText('Something went wrong')).toBeTruthy();
    });

    it('should not display duplicate snackbars for the same alert id', async () => {
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({ type: AlertType.INFO, message: 'Once only' });
      });

      await screen.findByText('Once only');
      const matches = screen.getAllByText('Once only');
      expect(matches).toHaveLength(1);
    });
  });

  describe('dismiss button', () => {
    it('should render a dismiss button alongside the snackbar', async () => {
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({ type: AlertType.WARNING, message: 'Watch out!' });
      });

      await screen.findByText('Watch out!');
      expect(screen.getByLabelText('Dismiss notification')).toBeTruthy();
    });

    it('should remove the snackbar when the dismiss button is clicked', async () => {
      const user = userEvent.setup();
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({ type: AlertType.ERROR, message: 'Click to dismiss' });
      });

      await screen.findByText('Click to dismiss');
      await user.click(screen.getByLabelText('Dismiss notification'));

      await waitFor(() => {
        expect(screen.queryByText('Click to dismiss')).toBeFalsy();
      });
    });
  });

  describe('inbox item alerts', () => {
    it('should render an inbox item alert via the custom InboxItemSnackbar', async () => {
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({
          type: AlertType.SUCCESS,
          message: 'New: Fix flaky integration test (GitHub)',
          inboxItem: {
            integration: ItemSource.Github,
            title: 'Fix flaky integration test',
            changeKind: SyncChangeKind.New,
            externalId: '42',
          },
        });
      });

      expect(await screen.findByText('New:')).toBeTruthy();
      expect(screen.getByText('#42 Fix flaky integration test')).toBeTruthy();
      expect(screen.getByAltText(ItemSource.Github)).toBeTruthy();
    });

    it('should render an updated inbox item alert distinctly from a new one', async () => {
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({
          type: AlertType.INFO,
          message: 'Updated: Update sprint board columns (Azure DevOps)',
          inboxItem: {
            integration: ItemSource.Ado,
            title: 'Update sprint board columns',
            changeKind: SyncChangeKind.Updated,
            externalId: '7',
          },
        });
      });

      expect(await screen.findByText('Updated:')).toBeTruthy();
      expect(screen.getByText('#7 Update sprint board columns')).toBeTruthy();
    });

    it('should still render a dismiss button and remove the alert on click for inbox item alerts', async () => {
      const user = userEvent.setup();
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({
          type: AlertType.SUCCESS,
          message: 'New: Fix flaky integration test (GitHub)',
          inboxItem: {
            integration: ItemSource.Github,
            title: 'Fix flaky integration test',
            changeKind: SyncChangeKind.New,
            externalId: '42',
          },
        });
      });

      await screen.findByText('New:');
      await user.click(screen.getByLabelText('Dismiss notification'));

      await waitFor(() => {
        expect(screen.queryByText('New:')).toBeFalsy();
      });
    });

    it('should not display duplicate inbox item snackbars for the same alert id', async () => {
      renderBridge();

      act(() => {
        useAlertStore.getState().addAlert({
          type: AlertType.SUCCESS,
          message: 'New: Fix flaky integration test (GitHub)',
          inboxItem: {
            integration: ItemSource.Github,
            title: 'Fix flaky integration test',
            changeKind: SyncChangeKind.New,
            externalId: '42',
          },
        });
      });

      await screen.findByText('New:');
      expect(screen.getAllByText('New:')).toHaveLength(1);
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
