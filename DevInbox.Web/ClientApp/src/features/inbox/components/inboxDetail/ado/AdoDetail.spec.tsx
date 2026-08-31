import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { InboxItemDetail } from '@api';
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

  it('renders work item type and id when present', () => {
    const details = makeInboxItemDetail({
      ado: { workItemType: 'Bug', workItemId: 789 },
    });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('#789')).toBeInTheDocument();
  });

  it('does not render work item type or id when absent', () => {
    const details = makeInboxItemDetail({
      ado: { workItemType: undefined, workItemId: undefined },
    });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.queryByText('Bug')).toBeNull();
    expect(screen.queryByText(/^#/)).toBeNull();
  });

  it.each([
    { state: 'Active', expectedStatus: 'Active' },
    { state: 'Closed', expectedStatus: 'Closed' },
    { state: undefined, expectedStatus: '—' },
  ])(
    'renders status chip "$expectedStatus" when state is $state',
    ({ state, expectedStatus }) => {
      const details = makeInboxItemDetail({ ado: { state } });

      renderWithProviders(<AdoDetail details={details} />);

      expect(screen.getByTestId('ado-detail-status')).toHaveTextContent(expectedStatus);
    },
  );

  it.each([
    { area: 'Team\\Area', expectedArea: 'Team\\Area' },
    { area: undefined, expectedArea: undefined },
  ])('renders area "$expectedArea" when area is $area', ({ area, expectedArea }) => {
    const details = makeInboxItemDetail({ ado: { area } });

    renderWithProviders(<AdoDetail details={details} />);

    if (expectedArea) {
      expect(screen.getByTestId('ado-detail-area')).toHaveTextContent(expectedArea);
    } else {
      expect(screen.queryByTestId('ado-detail-area')).toBeNull();
    }
  });

  it('renders a reason chip when reason is present', () => {
    const details = makeInboxItemDetail({ reason: 'assigned' as InboxItemDetail['reason'] });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.getByTestId('ado-detail-reason-chip')).toBeInTheDocument();
  });

  it('does not render a reason chip when reason is missing', () => {
    const details = makeInboxItemDetail({ reason: undefined });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.queryByTestId('ado-detail-reason-chip')).toBeNull();
  });

  it('renders the description when present', () => {
    const details = makeInboxItemDetail({ ado: { description: 'Some work item description' } });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.getByTestId('ado-detail-description')).toHaveTextContent(
      'Some work item description',
    );
  });

  it('does not render the description section when missing', () => {
    const details = makeInboxItemDetail({ ado: { description: undefined } });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.queryByTestId('ado-detail-description')).toBeNull();
  });

  it('renders tags when present', () => {
    const details = makeInboxItemDetail({ ado: { tags: ['backend', 'urgent'] } });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.getByTestId('ado-detail-tags')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('does not render the tags section when tags are empty or missing', () => {
    const details = makeInboxItemDetail({ ado: { tags: [] } });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.queryByTestId('ado-detail-tags')).toBeNull();
  });

  it.each([
    { displayName: 'Jane Doe', login: 'jdoe', expected: 'Jane Doe' },
    { displayName: undefined, login: 'jdoe', expected: 'jdoe' },
    { displayName: undefined, login: undefined, expected: 'unassigned' },
  ])(
    'shows assignee name as "$expected" when displayName is $displayName and login is $login',
    ({ displayName, login, expected }) => {
      const details = makeInboxItemDetail({
        ado: { assignedTo: { displayName, login } },
      });

      renderWithProviders(<AdoDetail details={details} />);

      expect(screen.getByTestId('ado-detail-assignee-name')).toHaveTextContent(expected);
    },
  );

  it('renders comments when present', () => {
    const details = makeInboxItemDetail({
      ado: {
        comments: [
          {
            author: { login: 'jdoe', displayName: 'Jane Doe' },
            body: 'Looks good to me',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
          },
        ],
      },
    });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.getByTestId('ado-detail-comments')).toBeInTheDocument();
    expect(screen.getByText('Looks good to me')).toBeInTheDocument();
  });

  it('does not render the comments section when comments are empty or missing', () => {
    const details = makeInboxItemDetail({ ado: { comments: [] } });

    renderWithProviders(<AdoDetail details={details} />);

    expect(screen.queryByTestId('ado-detail-comments')).toBeNull();
  });
});
