import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { InboxReason, Priority, type InboxItemSummary } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import InboxItemBadges from './InboxItemBadge';

function makeItem(overrides: Partial<InboxItemSummary> = {}): InboxItemSummary {
  return {
    reason: undefined,
    priority: undefined,
    ...overrides,
  } as InboxItemSummary;
}

describe('InboxItemBadges', () => {
  describe('when reason and priority are present', () => {
    it('renders both chips with the correct enum attributes', () => {
      renderWithProviders(
        <InboxItemBadges
          item={makeItem({
            reason: InboxReason.ReviewRequested,
            priority: Priority.High,
          })}
        />,
      );

      const reasonChip = screen.getByTestId('inbox-reason-chip');
      const priorityChip = screen.getByTestId('inbox-priority-chip');

      expect(reasonChip).toHaveAttribute('data-reason', InboxReason.ReviewRequested);
      expect(priorityChip).toHaveAttribute('data-priority', Priority.High);
    });
  });

  describe('when reason or priority should be hidden', () => {
    it.each([
      ['reason is undefined', makeItem()],
      ['reason is unknown', makeItem({ reason: InboxReason.Unknown })],
      ['priority is undefined', makeItem({ reason: InboxReason.Assigned })],
      ['priority is none', makeItem({ reason: InboxReason.Assigned, priority: Priority.None })],
    ])('omits the corresponding chips when %s', (_description, item) => {
      renderWithProviders(<InboxItemBadges item={item} />);

      if(!item.reason || item.reason === InboxReason.Unknown) {
        expect(screen.queryByTestId('inbox-reason-chip')).toBeNull();
      }
      else {
        expect(screen.getByTestId('inbox-reason-chip')).toBeTruthy();
      }

      if(!item.priority || item.priority === Priority.None) {
        expect(screen.queryByTestId('inbox-priority-chip')).toBeNull();
      }
      else {
        expect(screen.getByTestId('inbox-priority-chip')).toBeTruthy();
      }
    });
  });
});
