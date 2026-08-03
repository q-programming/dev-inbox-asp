import { InboxReason, ItemType } from '@api';
import type { ChipProps } from '@mui/material/Chip';

/** Human readable label for an inbox reason, used in badge chips across the inbox feature. */
export const translateInboxReason = (reason?: InboxReason): string => {
  switch (reason) {
    case InboxReason.Assigned:
      return 'Assigned to me';
    case InboxReason.Mentioned:
      return 'Mentioned';
    case InboxReason.ReviewRequested:
      return 'Review requested';
    case InboxReason.Authored:
      return 'Authored by me';
    case InboxReason.FollowUp:
      return 'Follow up';
    case InboxReason.Note:
      return 'Note';
    default:
      return '';
  }
};

/** Maps an inbox reason to the chip colour that best conveys its intent. */
export const REASON_CHIP_COLOR: Partial<Record<InboxReason, ChipProps['color']>> = {
  [InboxReason.ReviewRequested]: 'success',
  [InboxReason.Assigned]: 'info',
  [InboxReason.Mentioned]: 'warning',
  [InboxReason.Note]: 'warning',
  [InboxReason.Authored]: 'default',
  [InboxReason.FollowUp]: 'default',
};

/** Human readable label for an item type, used in detail panel headers. */
export const translateItemType = (itemType?: ItemType): string => {
  switch (itemType) {
    case ItemType.PR:
      return 'Pull request';
    case ItemType.Issue:
      return 'Issue';
    case ItemType.WorkItem:
      return 'Work item';
    case ItemType.Note:
      return 'Note';
    default:
      return '';
  }
};
