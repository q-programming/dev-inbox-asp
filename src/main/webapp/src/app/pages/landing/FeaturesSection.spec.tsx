import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import FeaturesSection from './FeaturesSection';

const renderFeatures = () => renderWithProviders(<FeaturesSection />);

describe('FeaturesSection', () => {
  describe('feature cards', () => {
    it('should render all three feature cards', () => {
      renderFeatures();
      expect(screen.getByText('Unified Inbox')).toBeTruthy();
      expect(screen.getByText('Incremental Sync')).toBeTruthy();
      expect(screen.getByText('Personal Overlays')).toBeTruthy();
    });

    it('should render capability tags on the Unified Inbox card', () => {
      renderFeatures();
      expect(screen.getByText('Multi-account')).toBeTruthy();
      expect(screen.getByText('Keyboard Shortcuts')).toBeTruthy();
    });

    it('should render the private note preview on the Personal Overlays card', () => {
      renderFeatures();
      expect(screen.getByText('PRIVATE NOTE')).toBeTruthy();
    });
  });
});
