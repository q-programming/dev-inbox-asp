import { ContentFormat } from '@api';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import CommentCard from './CommentCard';

describe('CommentCard', () => {
  it('renders the author displayName and body content using the provided test ids', () => {
    renderWithProviders(
      <CommentCard
        author={{ displayName: 'Jane Doe', login: 'jane' }}
        body="Hello world"
        createdAt={new Date('2026-08-01T09:00:00.000Z')}
        authorTestId="comment-card-author"
        bodyTestId="comment-card-body"
      />,
    );

    expect(screen.getByTestId('comment-card-author').textContent).toBe('Jane Doe');
    expect(screen.getByTestId('comment-card-body').textContent).toContain('Hello world');
  });

  it('falls back to author login when displayName is absent', () => {
    renderWithProviders(
      <CommentCard author={{ login: 'jane' }} authorTestId="comment-card-author" />,
    );

    expect(screen.getByTestId('comment-card-author').textContent).toBe('jane');
  });

  it('renders an empty author name when neither displayName nor login is present', () => {
    renderWithProviders(<CommentCard author={{}} authorTestId="comment-card-author" />);

    expect(screen.getByTestId('comment-card-author').textContent).toBe('');
  });

  it('renders the external link with the label as tooltip title when externalUrl is provided', () => {
    renderWithProviders(
      <CommentCard
        externalUrl="https://github.com/octo-org/dev-inbox/pull/42"
        externalUrlLabel="Open on GitHub"
      />,
    );

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://github.com/octo-org/dev-inbox/pull/42');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('hides the external link when externalUrl is not provided', () => {
    renderWithProviders(<CommentCard author={{ displayName: 'Jane Doe' }} />);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders the body via RichContent respecting the provided format', () => {
    renderWithProviders(
      <CommentCard body={'**bold**'} format={ContentFormat.Markdown} bodyTestId="comment-card-body" />,
    );

    const body = screen.getByTestId('comment-card-body');
    expect(body.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders an empty body when body is not provided', () => {
    renderWithProviders(<CommentCard bodyTestId="comment-card-body" />);

    expect(screen.getByTestId('comment-card-body').textContent).toBe('');
  });
});
