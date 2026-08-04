import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { ItemSource, ItemType } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import NoteDetail from './AdoDetail';
import { makeInboxItemDetail } from '../inboxDetail.testUtils';

describe('NoteDetail', () => {
  it('renders the placeholder body and item title', () => {
    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          title: 'Note item title',
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
        })}
      />,
    );

    expect(screen.getByTestId('note-detail')).toBeInTheDocument();
    expect(screen.getByText('Note item title')).toBeTruthy();
  });

  it('does not render an open item link', () => {
    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          title: 'No external link',
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
        })}
      />,
    );

    expect(screen.getByTestId('note-detail')).toBeInTheDocument();
    expect(screen.queryByTitle('Open item')).toBeNull();
  });
});
