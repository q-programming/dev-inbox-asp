import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import PersonAvatar from './PersonAvatar';

describe('PersonAvatar', () => {
  it('renders two-letter initials for a multi-word display name', () => {
    renderWithProviders(<PersonAvatar person={{ displayName: 'Jane Doe' }} />);

    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('renders a single-letter initial for a one-word display name', () => {
    renderWithProviders(<PersonAvatar person={{ displayName: 'Cher' }} />);

    expect(screen.getByText('C')).toBeTruthy();
  });

  it('falls back to login-derived initials when no displayName is given', () => {
    renderWithProviders(<PersonAvatar person={{ login: 'jane' }} />);

    expect(screen.getByText('J')).toBeTruthy();
  });

  it('falls back to login-derived initials when displayName is blank', () => {
    renderWithProviders(<PersonAvatar person={{ displayName: '  ', login: 'octocat' }} />);

    expect(screen.getByText('O')).toBeTruthy();
  });

  it('renders a fallback question mark when no person is given', () => {
    renderWithProviders(<PersonAvatar />);

    expect(screen.getByText('?')).toBeTruthy();
  });

  it('renders a fallback question mark when person has neither displayName nor login', () => {
    renderWithProviders(<PersonAvatar person={{}} />);

    expect(screen.getByText('?')).toBeTruthy();
  });

  it('uses the avatarUrl as the image src when present', () => {
    renderWithProviders(
      <PersonAvatar person={{ displayName: 'Jane Doe', avatarUrl: 'https://example.com/jane.png' }} />,
    );

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/jane.png');
  });

  it('does not render an image and falls back to initials when avatarUrl is absent', () => {
    renderWithProviders(<PersonAvatar person={{ displayName: 'Jane Doe' }} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('JD')).toBeTruthy();
  });
});
