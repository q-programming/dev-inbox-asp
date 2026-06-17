import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import SettingsPage from './SettingsPage';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import { Density, Theme } from '@shared/theme/theme';

const baseProfile = {
  firstName: 'Jane',
  lastName: 'Dev',
  theme: Theme.LIGHT,
  density: Density.RELAXED,
  fontSize: 14,
};

beforeEach(() => {
  useUserStore.setState({ status: AuthStatus.AUTHENTICATED, profile: baseProfile, identity: null });
});

describe('SettingsPage', () => {
  describe('hash-based anchor scroll', () => {
    let mockScrollIntoView: ReturnType<typeof vi.fn>;
    let spyGetElementById: ReturnType<typeof vi.spyOn>;
    let spyRaf: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockScrollIntoView = vi.fn();
      spyGetElementById = vi.spyOn(document, 'getElementById').mockReturnValue({
        scrollIntoView: mockScrollIntoView,
      } as unknown as HTMLElement);
      spyRaf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });
    });

    afterEach(() => {
      spyGetElementById.mockRestore();
      spyRaf.mockRestore();
    });

    it('scrolls to the element matching the hash on mount', async () => {
      renderWithProviders(<SettingsPage />, { initialEntries: ['/settings#integrations'] });
      await waitFor(() => {
        expect(spyGetElementById).toHaveBeenCalledWith('integrations');
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      });
    });

    it('scrolls to the appearance section when hash is #appearance', async () => {
      renderWithProviders(<SettingsPage />, { initialEntries: ['/settings#appearance'] });
      await waitFor(() => {
        expect(spyGetElementById).toHaveBeenCalledWith('appearance');
      });
    });

    it('does not call scrollIntoView when there is no hash', () => {
      renderWithProviders(<SettingsPage />, { initialEntries: ['/settings'] });
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });
  });
});
