import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import NoteForm from './NoteForm';

describe('NoteForm', () => {
  describe('validation', () => {
    it('shows a required error and does not submit when title is empty', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithProviders(<NoteForm onSubmit={onSubmit} />);

      await user.click(screen.getByTestId('note-form-submit'));

      expect(await screen.findByText('Title is required')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows a too-long error when the title exceeds the max length', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithProviders(<NoteForm onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'a'.repeat(201));
      await user.click(screen.getByTestId('note-form-submit'));

      expect(await screen.findByText('Title is too long')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows a too-long error when the body exceeds the max length', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithProviders(<NoteForm onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'Valid title');
      const bodyField = screen.getByTestId('note-form-body').querySelector('textarea')!;
      // fireEvent.change is far faster than userEvent.type for 10k+ chars and behaves the same for RHF's onChange binding.
      const longBody = 'a'.repeat(10_001);
      await user.click(bodyField);
      await user.paste(longBody);
      await user.click(screen.getByTestId('note-form-submit'));

      expect(await screen.findByText('Body is too long')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submitting', () => {
    it('calls onSubmit with the entered values when valid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithProviders(<NoteForm onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'My note title');
      await user.type(screen.getByTestId('note-form-body').querySelector('textarea')!, 'My note body');
      await user.click(screen.getByTestId('note-form-submit'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const values = onSubmit.mock.calls[0][0];
      expect(values.title).toBe('My note title');
      expect(values.body).toBe('My note body');
    });

    it('adds a tag typed into the tags field on Enter', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithProviders(<NoteForm onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'Title');
      const tagsInput = screen.getByTestId('note-form-tags').querySelector('input')!;
      await user.click(tagsInput);
      await user.keyboard('urgent');
      await user.keyboard('{Enter}');

      await user.click(screen.getByTestId('note-form-submit'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0].tags).toEqual(['urgent']);
    });
  });

  describe('cancel', () => {
    it('calls onCancel when the cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      renderWithProviders(<NoteForm onSubmit={vi.fn()} onCancel={onCancel} />);

      await user.click(screen.getByTestId('note-form-cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not render a cancel button when onCancel is not provided', () => {
      renderWithProviders(<NoteForm onSubmit={vi.fn()} />);

      expect(screen.queryByTestId('note-form-cancel')).toBeNull();
    });
  });

  describe('dense mode', () => {
    it('disables the submit button until the form becomes dirty', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <NoteForm onSubmit={vi.fn()} dense defaultValues={{ title: 'Existing title' }} />,
      );

      expect(screen.getByTestId('note-form-submit')).toBeDisabled();

      await user.type(screen.getByTestId('note-form-title').querySelector('input')!, ' edited');

      expect(screen.getByTestId('note-form-submit')).not.toBeDisabled();
    });
  });

  describe('submitting state', () => {
    it('disables submit/cancel and shows the saving label while submitting', () => {
      renderWithProviders(<NoteForm onSubmit={vi.fn()} onCancel={vi.fn()} submitting />);

      expect(screen.getByTestId('note-form-submit')).toBeDisabled();
      expect(screen.getByTestId('note-form-cancel')).toBeDisabled();
      expect(screen.getByText('Saving…')).toBeTruthy();
    });
  });
});
