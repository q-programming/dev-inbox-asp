import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { IntegrationType, ItemSource, type InboxItemSummary } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import InboxItemIcon from './InboxItemIcon';

function makeItem(overrides: Partial<InboxItemSummary> = {}): InboxItemSummary {
  return {
    sourceType: undefined,
    ...overrides,
  } as InboxItemSummary;
}

describe('InboxItemIcon', () => {
  describe('known source types', () => {
    it.each([
      [ItemSource.Ado, IntegrationType.Ado],
      [ItemSource.Github, IntegrationType.Github],
      [ItemSource.Note, 'note'],
    ])('renders the %s integration icon', (sourceType, expectedAlt) => {
      renderWithProviders(<InboxItemIcon item={makeItem({ sourceType })} />);

      const container = screen.getByTestId('inbox-item-icon');
      const icon = within(container).getByRole('img');

      expect(icon.getAttribute('alt')).toBe(expectedAlt);
      expect(icon.getAttribute('src')).toContain(`/${expectedAlt}.svg`);
    });
  });

  describe('unknown or missing source type', () => {
    it.each([
      ['unknown source type', 'Other'],
      ['undefined source type', undefined],
    ])('does not render an icon for %s', (_, sourceType) => {
      renderWithProviders(<InboxItemIcon item={makeItem({ sourceType } as Partial<InboxItemSummary>)} />);

      expect(screen.getByTestId('inbox-item-icon')).toBeTruthy();
      expect(screen.queryByRole('img')).toBeNull();
    });
  });
});
