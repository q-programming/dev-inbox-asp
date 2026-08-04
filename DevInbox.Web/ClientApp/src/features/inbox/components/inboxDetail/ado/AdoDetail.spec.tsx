import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import AdoDetail from './AdoDetail';
import { makeInboxItemDetail } from '../inboxDetail.testUtils';

describe('AdoDetail', () => {
  it('renders the placeholder body and item title', () => {
    renderWithProviders(<AdoDetail details={makeInboxItemDetail({ title: 'ADO item title' })} />);

    expect(screen.getByTestId('ado-detail')).toBeInTheDocument();
    expect(screen.getByText('ADO item title')).toBeTruthy();
  });

  it('renders an open item link when ado url is present', () => {
    const details = makeInboxItemDetail({
      ado: { url: 'https://dev.azure.com/example/project/_workitems/edit/456' },
    });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.getByTitle('Open item')).toHaveAttribute('href', details.ado?.url);
  });

  it('does not render an open item link when ado details are missing', () => {
    renderWithProviders(
      <AdoDetail details={makeInboxItemDetail({ title: 'No ado details', ado: undefined })} />,
    );

    expect(screen.getByTestId('ado-detail')).toBeInTheDocument();
    expect(screen.getByText('No ado details')).toBeTruthy();
    expect(screen.queryByTitle('Open item')).toBeNull();
  });
});
