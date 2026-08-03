import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ItemSource, ItemType, type InboxItemDetail } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import InboxDetailHeader from './InboxDetailHeader';

function makeDetails(overrides: Partial<InboxItemDetail> = {}): InboxItemDetail {
  return {
    id: 1,
    title: 'Review authentication changes',
    itemType: ItemType.PR,
    isDone: false,
    isSaved: false,
    source: ItemSource.Github,
    ...overrides,
  };
}

describe('InboxDetailHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    useInboxStore.setState({
      status: undefined,
      selectedItemId: undefined,
    });
  });

  it('renders the title text from details.title', () => {
    renderWithProviders(<InboxDetailHeader details={makeDetails({ title: 'My inbox item' })} />);

    expect(screen.getByTestId('inbox-detail-title').textContent).toBe('My inbox item');
  });

  describe('item type label', () => {
    it.each([ItemType.PR, ItemType.Issue, ItemType.WorkItem, ItemType.Note])(
      'renders %s item type',
      (itemType) => {
        renderWithProviders(<InboxDetailHeader details={makeDetails({ itemType })} />);

        expect(
          screen.getByTestId('inbox-detail-item-type-label').getAttribute('data-item-type'),
        ).toBe(itemType);
      },
    );
  });

  describe('open item button', () => {
    it('renders open-in-new button when url is provided', () => {
      renderWithProviders(
        <InboxDetailHeader details={makeDetails()} url="https://example.com/item/1" />,
      );

      const button = screen.getByTestId('inbox-detail-open-btn');
      expect(button).toBeTruthy();
      expect(button.getAttribute('href')).toBe('https://example.com/item/1');
    });

    it('does not render open-in-new button when url is undefined', () => {
      renderWithProviders(<InboxDetailHeader details={makeDetails()} />);

      expect(screen.queryByTestId('inbox-detail-open-btn')).toBeNull();
    });
  });

  describe('action state titles', () => {
    it('shows mark-done state through the title attribute', () => {
      const { rerender } = renderWithProviders(
        <InboxDetailHeader details={makeDetails({ isDone: false })} />,
      );

      expect(screen.getByTestId('inbox-detail-mark-done-btn').getAttribute('title')).toBe(
        'Mark as done',
      );

      rerender(<InboxDetailHeader details={makeDetails({ isDone: true })} />);

      expect(screen.getByTestId('inbox-detail-mark-done-btn').getAttribute('title')).toBe(
        'Marked as done',
      );
    });

    it('shows save state through the title attribute', () => {
      const { rerender } = renderWithProviders(
        <InboxDetailHeader details={makeDetails({ isSaved: false })} />,
      );

      expect(screen.getByTestId('inbox-detail-save-btn').getAttribute('title')).toBe('Save');

      rerender(<InboxDetailHeader details={makeDetails({ isSaved: true })} />);

      expect(screen.getByTestId('inbox-detail-save-btn').getAttribute('title')).toBe('Saved');
    });
  });

  it('clicking close calls closeItem on the store', async () => {
    const user = userEvent.setup();
    useInboxStore.setState({ selectedItemId: 42 });

    renderWithProviders(<InboxDetailHeader details={makeDetails()} />);

    await user.click(screen.getByTestId('inbox-detail-close-btn'));

    expect(useInboxStore.getState().selectedItemId).toBeUndefined();
  });

  describe('integration icon', () => {
    it.each([
      [ItemSource.Ado, 'Ado'],
      [ItemSource.Github, 'Github'],
      [ItemSource.Note, 'note'],
    ])('renders the expected icon for %s', (source, altText) => {
      renderWithProviders(<InboxDetailHeader details={makeDetails({ source })} />);

      expect(screen.getByAltText(altText)).toBeTruthy();
    });

    it('does not render an integration icon when source is missing', () => {
      renderWithProviders(<InboxDetailHeader details={makeDetails({ source: undefined })} />);

      expect(screen.queryByRole('img')).toBeNull();
    });
  });
});
