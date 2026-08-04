import { InboxReason, ItemType } from '@api';
import { describe, expect, it } from 'vitest';
import { REASON_CHIP_COLOR, translateInboxReason, translateItemType } from './reason';

describe('reason utilities', () => {
  describe('translateInboxReason', () => {
    it('should translate each inbox reason to a human readable label', () => {
      expect(translateInboxReason(InboxReason.Assigned)).toBe('Assigned to me');
      expect(translateInboxReason(InboxReason.Mentioned)).toBe('Mentioned');
      expect(translateInboxReason(InboxReason.ReviewRequested)).toBe('Review requested');
      expect(translateInboxReason(InboxReason.Authored)).toBe('Authored by me');
      expect(translateInboxReason(InboxReason.FollowUp)).toBe('Follow up');
      expect(translateInboxReason(InboxReason.Note)).toBe('Note');
    });

    it('should return an empty string for unknown or undefined inbox reasons', () => {
      expect(translateInboxReason(InboxReason.Unknown)).toBe('');
      expect(translateInboxReason(undefined)).toBe('');
    });
  });

  describe('REASON_CHIP_COLOR', () => {
    it('should map known inbox reasons to the expected chip colors', () => {
      expect(REASON_CHIP_COLOR[InboxReason.ReviewRequested]).toBe('success');
      expect(REASON_CHIP_COLOR[InboxReason.Assigned]).toBe('info');
      expect(REASON_CHIP_COLOR[InboxReason.Mentioned]).toBe('warning');
      expect(REASON_CHIP_COLOR[InboxReason.Note]).toBe('warning');
      expect(REASON_CHIP_COLOR[InboxReason.Authored]).toBe('default');
      expect(REASON_CHIP_COLOR[InboxReason.FollowUp]).toBe('default');
    });

    it('should not define a chip color for unknown inbox reasons', () => {
      expect(REASON_CHIP_COLOR[InboxReason.Unknown]).toBeUndefined();
    });
  });

  describe('translateItemType', () => {
    it('should translate each item type to a human readable label', () => {
      expect(translateItemType(ItemType.PR)).toBe('Pull request');
      expect(translateItemType(ItemType.Issue)).toBe('Issue');
      expect(translateItemType(ItemType.WorkItem)).toBe('Work item');
      expect(translateItemType(ItemType.Note)).toBe('Note');
    });

    it('should return an empty string for undefined item types', () => {
      expect(translateItemType(undefined)).toBe('');
    });
  });
});
