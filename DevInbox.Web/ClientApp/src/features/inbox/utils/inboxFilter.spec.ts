import { InboxReason, ItemSource, ItemType } from '@api';
import { describe, expect, it } from 'vitest';
import { buildInboxSearch, parseInboxFilter } from './inboxFilter';

const toObject = (search: string): Record<string, string> =>
  Object.fromEntries(new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).entries());

describe('inboxFilter utilities', () => {
  describe('buildInboxSearch', () => {
    it('should return an empty string for an empty filter', () => {
      expect(buildInboxSearch()).toBe('');
      expect(buildInboxSearch({})).toBe('');
    });

    it('should build a query string with only defined filter fields', () => {
      expect(buildInboxSearch({ source: ItemSource.Github, reason: InboxReason.Assigned })).toBe(
        '?source=Github&reason=Assigned',
      );
    });

    it('should build a full query string that parses back independent of param order', () => {
      const search = buildInboxSearch({
        source: ItemSource.Ado,
        itemType: ItemType.WorkItem,
        reason: InboxReason.ReviewRequested,
      });

      expect(toObject(search)).toEqual({
        source: ItemSource.Ado,
        itemType: ItemType.WorkItem,
        reason: InboxReason.ReviewRequested,
      });
      expect(parseInboxFilter(new URLSearchParams(search.slice(1)))).toEqual({
        source: ItemSource.Ado,
        itemType: ItemType.WorkItem,
        reason: InboxReason.ReviewRequested,
      });
    });
  });

  describe('parseInboxFilter', () => {
    it('should round-trip with buildInboxSearch', () => {
      const filter = {
        source: ItemSource.Note,
        itemType: ItemType.Note,
        reason: InboxReason.Note,
      };

      const search = buildInboxSearch(filter);

      expect(parseInboxFilter(new URLSearchParams(search.slice(1)))).toEqual(filter);
    });

    it('should return undefined values when params are missing', () => {
      expect(parseInboxFilter(new URLSearchParams())).toEqual({
        source: undefined,
        itemType: undefined,
        reason: undefined,
      });
    });

    it('should parse URLSearchParams created from a raw string', () => {
      expect(parseInboxFilter(new URLSearchParams('source=Github&itemType=PR'))).toEqual({
        source: ItemSource.Github,
        itemType: ItemType.PR,
        reason: undefined,
      });
    });
  });
});
