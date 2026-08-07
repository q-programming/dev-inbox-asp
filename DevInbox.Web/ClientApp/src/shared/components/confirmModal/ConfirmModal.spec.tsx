import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
  it('renders title and body when open', () => {
    renderWithProviders(
      <ConfirmModal open title="Delete note?" body="This action cannot be undone." onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText('Delete note?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    renderWithProviders(
      <ConfirmModal open={false} title="Delete note?" body="This action cannot be undone." onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(screen.queryByText('Delete note?')).toBeNull();
  });

  it('calls confirm and cancel handlers', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithProviders(
      <ConfirmModal open title="Confirm" body="Proceed?" onConfirm={onConfirm} onCancel={onCancel} />,
    );

    await user.click(screen.getByTestId('confirm-modal-confirm'));
    await user.click(screen.getByTestId('confirm-modal-cancel'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom labels', () => {
    renderWithProviders(
      <ConfirmModal
        open
        title="Confirm"
        body="Proceed?"
        confirmLabel="Yes, do it"
        cancelLabel="No, keep it"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Yes, do it')).toBeInTheDocument();
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
  });

  it('disables action buttons when loading', () => {
    renderWithProviders(
      <ConfirmModal open title="Confirm" body="Proceed?" loading onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
    expect(screen.getByTestId('confirm-modal-cancel')).toBeDisabled();
  });

  it('applies configurable confirm button color', () => {
    renderWithProviders(
      <ConfirmModal open title="Confirm" body="Proceed?" confirmColor="primary" onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(screen.getByTestId('confirm-modal-confirm')).toHaveClass('MuiButton-colorPrimary');
  });
});
