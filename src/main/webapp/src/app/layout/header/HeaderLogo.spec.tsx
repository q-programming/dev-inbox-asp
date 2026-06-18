import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import HeaderLogo from './HeaderLogo.tsx';

describe('HeaderLogo', () => {
  it('should render the Dev Inbox wordmark', () => {
    renderWithProviders(<HeaderLogo />);
    expect(screen.getByText('Dev Inbox')).toBeTruthy();
  });

  it('should render the logo image with alt text', () => {
    renderWithProviders(<HeaderLogo />);
    expect(screen.getByAltText('Dev Inbox')).toBeTruthy();
  });

  it('should render as a link', () => {
    renderWithProviders(<HeaderLogo />);
    expect(screen.getByRole('link', { name: /dev inbox/i })).toBeTruthy();
  });
});
