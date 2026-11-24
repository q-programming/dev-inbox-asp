import { InboxReason, InboxSort, ItemSource, ItemStatus, ItemType } from '@api';
import { describe, expect, it } from 'vitest';
import {
  buildInboxSearch,
  clearFilterDimensions,
  mergeInboxFilter,
  parseInboxFilter,
  removeFilterDimension,
  toInboxSearchTerm,
} from './inboxFilter';

describe('inbox filter combining', () => {
  it('adds a new dimension to the current filter', () => {
    expect(mergeInboxFilter({ source: ItemSource.Github }, { status: ItemStatus.ToDo })).toEqual({
      source: ItemSource.Github,
      status: ItemStatus.ToDo,
    });
  });

  it('replaces a value of the same dimension', () => {
    expect(
      mergeInboxFilter({ status: ItemStatus.ToDo }, { status: ItemStatus.Closed }),
    ).toEqual({ status: ItemStatus.Closed });
  });

  it('toggles off a filter that is already applied', () => {
    const merged = mergeInboxFilter(
      { source: ItemSource.Github, status: ItemStatus.ToDo },
      { status: ItemStatus.ToDo },
    );
    expect(merged.status).toBeUndefined();
    expect(merged.source).toBe(ItemSource.Github);
  });

  it('resets filters but keeps sort when no target filter is given', () => {
    expect(
      mergeInboxFilter({ source: ItemSource.Ado, sort: InboxSort.PriorityDesc }, undefined),
    ).toEqual({ sort: InboxSort.PriorityDesc });
  });

  it('removes a single dimension and clears all dimensions', () => {
    const filter = { source: ItemSource.Ado, scope: 'org/repo', sort: InboxSort.ActivityAsc };
    expect(removeFilterDimension(filter, 'scope').scope).toBeUndefined();
    expect(clearFilterDimensions(filter)).toEqual({ sort: InboxSort.ActivityAsc });
  });
});

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
        term: undefined,
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
        term: undefined,
      });
    });

    it('should parse URLSearchParams created from a raw string', () => {
      expect(parseInboxFilter(new URLSearchParams('source=Github&itemType=PR'))).toEqual({
        source: ItemSource.Github,
        itemType: ItemType.PR,
        reason: undefined,
        term: undefined,
      });
    });

    it('should build and round-trip a sort value alongside other filters', () => {
      const filter = { source: ItemSource.Github, sort: InboxSort.PriorityDesc };
      const search = buildInboxSearch(filter);

      expect(search).toContain('sort=PriorityDesc');
      expect(parseInboxFilter(new URLSearchParams(search.slice(1)))).toEqual(filter);
    });

    it('should leave sort undefined when not present in the query string', () => {
      expect(parseInboxFilter(new URLSearchParams('source=Github')).sort).toBeUndefined();
    });

    it('should build and parse a search term', () => {
      const filter = { term: 'release notes' };
      const search = buildInboxSearch(filter);

      expect(search).toBe('?term=release+notes');
      expect(parseInboxFilter(new URLSearchParams(search.slice(1)))).toEqual(filter);
    });

    it('should preserve a term from a URL even when other filters are absent', () => {
      expect(parseInboxFilter(new URLSearchParams('term=release%20notes'))).toEqual({
        source: undefined,
        itemType: undefined,
        reason: undefined,
        status: undefined,
        sort: undefined,
        term: 'release notes',
      });
    });

    describe('toInboxSearchTerm', () => {
      it('should trim and preserve terms within the allowed length range', () => {
        expect(toInboxSearchTerm('  ab  ')).toBe('ab');
        expect(toInboxSearchTerm('a'.repeat(200))).toBe('a'.repeat(200));
      });

      it('should omit empty, whitespace-only, too-short, and too-long terms', () => {
        expect(toInboxSearchTerm()).toBeUndefined();
        expect(toInboxSearchTerm('   ')).toBeUndefined();
        expect(toInboxSearchTerm('a')).toBeUndefined();
        expect(toInboxSearchTerm('a'.repeat(201))).toBeUndefined();
      });
    });
  });
});
