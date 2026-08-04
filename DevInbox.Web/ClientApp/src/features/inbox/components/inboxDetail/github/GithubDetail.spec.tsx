import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { InboxReason, ItemSource, ItemType, ReviewState, type InboxItemDetail } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import GithubDetail from './GithubDetail';

function makeInboxItemDetail(
  overrides: Partial<InboxItemDetail> = {},
): InboxItemDetail {
  return {
    id: 1,
    title: 'Improve inbox detail rendering',
    source: ItemSource.Github,
    itemType: ItemType.PR,
    isUnread: false,
    privateNote: undefined,
    github: {
      repository: 'octo-org/dev-inbox',
      pullRequestNumber: 42,
      url: 'https://github.com/octo-org/dev-inbox/pull/42',
      author: {
        displayName: 'Jane Doe',
        login: 'jane',
        avatarUrl: 'https://example.com/jane.png',
      },
      createdAt: new Date('2026-07-31T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:00:00.000Z'),
      reviewers: [],
      linkedWorkItems: [],
      labels: [],
      latestComments: [],
      ...overrides.github,
    },
    ...overrides,
  };
}

describe('GithubDetail', () => {
  describe('rendering guards and header metadata', () => {
    it('renders nothing when github details are missing', () => {
      const { container } = renderWithProviders(
        <GithubDetail details={makeInboxItemDetail({ github: undefined })} />,
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('github-detail')).toBeNull();
    });

    it('renders the shared header, repository name, and pull request number when present', () => {
      renderWithProviders(<GithubDetail details={makeInboxItemDetail()} />);

      expect(screen.getByTestId('github-detail')).toBeTruthy();
      expect(screen.getByText('Improve inbox detail rendering')).toBeTruthy();
      expect(screen.getByText('octo-org/dev-inbox')).toBeTruthy();
      expect(screen.getByText('#42')).toBeTruthy();
    });

    it('hides repository name and pull request number when absent', () => {
      renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              repository: undefined,
              pullRequestNumber: undefined,
            },
          })}
        />,
      );

      expect(screen.queryByText('octo-org/dev-inbox')).toBeNull();
      expect(screen.queryByText('#42')).toBeNull();
    });

    it('renders reason chip only when reason is present', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({ reason: InboxReason.ReviewRequested })}
        />,
      );

      const reasonChip = screen.getByTestId('github-detail-reason-chip');
      expect(reasonChip).toBeTruthy();
      expect(reasonChip.getAttribute('data-reason')).toBe(InboxReason.ReviewRequested);

      rerender(<GithubDetail details={makeInboxItemDetail({ reason: undefined })} />);

      expect(screen.queryByTestId('github-detail-reason-chip')).toBeNull();
    });
  });

  describe('author and unread metadata', () => {
    it('renders opened by displayName, then login, then unknown', () => {
      const { rerender } = renderWithProviders(<GithubDetail details={makeInboxItemDetail()} />);

      expect(screen.getByTestId('github-detail-author-name').textContent).toBe('Jane Doe');

      rerender(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              author: {
                displayName: undefined,
                login: 'octocat',
              },
            },
          })}
        />,
      );

      expect(screen.getByTestId('github-detail-author-name').textContent).toBe('octocat');

      rerender(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              author: {
                displayName: undefined,
                login: undefined,
              },
            },
          })}
        />,
      );

      expect(screen.getByTestId('github-detail-author-name').textContent).toBe('unknown');
    });

    it('shows unread prefix only when item is unread', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail details={makeInboxItemDetail({ isUnread: true })} />,
      );

      expect(screen.getByTestId('github-detail-unread-indicator').getAttribute('data-unread')).toBe('true');

      rerender(<GithubDetail details={makeInboxItemDetail({ isUnread: false })} />);

      expect(screen.getByTestId('github-detail-unread-indicator').getAttribute('data-unread')).toBe('false');
    });
  });

  describe('reviewers', () => {
    it('renders every reviewer row with stable test ids and review state attributes', () => {
      const reviewers = [
        { reviewer: { displayName: 'Approved Reviewer', login: 'approved' }, reviewState: ReviewState.Approved },
        { reviewer: { displayName: 'Changes Reviewer', login: 'changes' }, reviewState: ReviewState.ChangesRequested },
        { reviewer: { displayName: 'Commented Reviewer', login: 'commented' }, reviewState: ReviewState.Commented },
        { reviewer: { displayName: 'Waiting Reviewer', login: 'waiting' }, reviewState: ReviewState.Waiting },
      ];

      renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              reviewers,
            },
          })}
        />,
      );

      const reviewersSection = screen.getByTestId('github-detail-reviewers');
      expect(reviewersSection).toBeTruthy();

      for (const reviewer of reviewers) {
        const row = within(reviewersSection).getByTestId(`github-reviewer-${reviewer.reviewer.login}`);
        expect(row).toBeTruthy();
        expect(row.getAttribute('data-review-state')).toBe(reviewer.reviewState);
        expect(row.textContent).toContain(reviewer.reviewer.displayName);
      }
    });

    it('hides the reviewers section when reviewers are absent or empty', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              reviewers: [],
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-reviewers')).toBeNull();

      rerender(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              reviewers: undefined,
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-reviewers')).toBeNull();
    });
  });

  describe('linked work items and labels', () => {
    it('renders linked work items with their id, title, and href', () => {
      renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              linkedWorkItems: [
                {
                  id: 'ADO-123',
                  title: 'Sync PR metadata',
                  url: 'https://dev.azure.com/org/project/_workitems/edit/123',
                },
              ],
            },
          })}
        />,
      );

      const linkedItemsSection = screen.getByTestId('github-detail-linked-items');
      const link = within(linkedItemsSection).getByRole('link', { name: /ADO-123/i });
      expect(link).not.toBeUndefined();
      expect(within(linkedItemsSection).getByText('Sync PR metadata')).toBeTruthy();
    });

    it('hides linked work items when absent', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              linkedWorkItems: [],
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-linked-items')).toBeNull();

      rerender(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              linkedWorkItems: undefined,
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-linked-items')).toBeNull();
    });

    it('renders labels and hides the section when labels are absent', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              labels: ['bug', 'backend'],
            },
          })}
        />,
      );

      const labelsSection = screen.getByTestId('github-detail-labels');
      expect(within(labelsSection).getByText('bug')).toBeTruthy();
      expect(within(labelsSection).getByText('backend')).toBeTruthy();

      rerender(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              labels: undefined,
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-labels')).toBeNull();
    });
  });

  describe('latest comment and private note', () => {
    it('renders only the last latest comment entry', () => {
      renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              latestComments: [
                {
                  author: { displayName: 'First Commenter', login: 'first' },
                  body: 'This should not be shown',
                  createdAt: new Date('2026-08-01T08:00:00.000Z'),
                },
                {
                  author: { displayName: 'Last Commenter', login: 'last' },
                  body: 'This is the latest comment',
                  createdAt: new Date('2026-08-01T09:00:00.000Z'),
                },
              ],
            },
          })}
        />,
      );

      const latestCommentSection = screen.getByTestId('github-detail-latest-comment');
      expect(within(latestCommentSection).getByTestId('github-detail-latest-comment-author').textContent).toBe('Last Commenter');
      expect(within(latestCommentSection).getByTestId('github-detail-latest-comment-body').textContent).toBe('This is the latest comment');
      expect(within(latestCommentSection).queryByText('First Commenter')).toBeNull();
      expect(within(latestCommentSection).queryByText('This should not be shown')).toBeNull();
    });

    it('hides the latest comment section when comments are absent or empty', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              latestComments: [],
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-latest-comment')).toBeNull();

      rerender(
        <GithubDetail
          details={makeInboxItemDetail({
            github: {
              latestComments: undefined,
            },
          })}
        />,
      );

      expect(screen.queryByTestId('github-detail-latest-comment')).toBeNull();
    });

    it('renders private note only when present', () => {
      const { rerender } = renderWithProviders(
        <GithubDetail details={makeInboxItemDetail({ privateNote: 'Remember to follow up' })} />,
      );

      const privateNoteSection = screen.getByTestId('github-detail-private-note');
      expect(within(privateNoteSection).getByText('Remember to follow up')).toBeTruthy();

      rerender(<GithubDetail details={makeInboxItemDetail({ privateNote: undefined })} />);

      expect(screen.queryByTestId('github-detail-private-note')).toBeNull();
    });
  });
});
