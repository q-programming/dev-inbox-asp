import { InboxReason, InboxSort, ItemSource, ItemStatus, ItemType } from '@api';

/** Filter criteria that can be applied to the inbox item listing via query params. */
export interface InboxFilter {
  source?: ItemSource;
  itemType?: ItemType;
  reason?: InboxReason;
  status?: ItemStatus;
  sort?: InboxSort;
  scope?: string;
  term?: string;
}

/** Builds a `?key=value` query string from an inbox filter (empty string when no filter). */
export const buildInboxSearch = (filter?: InboxFilter): string => {
  if (!filter) {
    return '';
  }

  const params = new URLSearchParams();
  if (filter.source) {
    params.set('source', filter.source);
  }
  if (filter.itemType) {
    params.set('itemType', filter.itemType);
  }
  if (filter.reason) {
    params.set('reason', filter.reason);
  }
  if (filter.status) {
    params.set('status', filter.status);
  }
  if (filter.sort) {
    params.set('sort', filter.sort);
  }
  if (filter.term) {
    params.set('term', filter.term);
  }
  if (filter.scope) {
    params.set('scope', filter.scope);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
};

/** Parses an inbox filter back out of a `URLSearchParams` instance. */
export const parseInboxFilter = (searchParams: URLSearchParams): InboxFilter => ({
  source: (searchParams.get('source') as ItemSource) || undefined,
  itemType: (searchParams.get('itemType') as ItemType) || undefined,
  reason: (searchParams.get('reason') as InboxReason) || undefined,
  status: (searchParams.get('status') as ItemStatus) || undefined,
  sort: (searchParams.get('sort') as InboxSort) || undefined,
  scope: searchParams.get('scope') || undefined,
  term: searchParams.get('term') || undefined,
});

/** Filter dimensions that are shown as dismissible chips and combinable from the sidebar. `sort` is excluded on purpose. */
export const FILTER_DIMENSIONS = ['source', 'itemType', 'reason', 'status', 'scope'] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

/** Dimensions of `filter` that are actually set. */
export const getActiveDimensions = (filter?: InboxFilter): FilterDimension[] =>
  FILTER_DIMENSIONS.filter((dimension) => !!filter?.[dimension]);

/** Returns the filter without the given dimension. */
export const removeFilterDimension = (filter: InboxFilter, dimension: FilterDimension): InboxFilter => ({
  ...filter,
  [dimension]: undefined,
});

/** Returns the filter with every filter dimension cleared (sort is preserved). */
export const clearFilterDimensions = (filter: InboxFilter): InboxFilter => ({ sort: filter.sort });

/** True when every dimension set in `target` is set to the same value in `current`. */
export const filterIncludes = (current: InboxFilter, target?: InboxFilter): boolean => {
  const dimensions = getActiveDimensions(target);
  return dimensions.length > 0 && dimensions.every((dimension) => current[dimension] === target?.[dimension]);
};

/**
 * Combines a sidebar item's filter into the currently active one.
 * - no target filter (plain "Inbox") resets all filters;
 * - a target already fully applied is toggled off;
 * - otherwise each of its dimensions overrides the current value, other dimensions are kept.
 */
export const mergeInboxFilter = (current: InboxFilter, target?: InboxFilter): InboxFilter => {
  if (getActiveDimensions(target).length === 0) {
    return clearFilterDimensions(current);
  }
  if (filterIncludes(current, target)) {
    return getActiveDimensions(target).reduce(removeFilterDimension, current);
  }
  const merged: InboxFilter = { ...current };
  getActiveDimensions(target).forEach((dimension) => {
    (merged as Record<string, string | undefined>)[dimension] = target?.[dimension];
  });
  return merged;
};

const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 200;

/** Normalizes raw user input into the `term` filter value, or `undefined` if the input is
 * empty/too short to be sent to the API. */
export const toInboxSearchTerm = (rawTerm?: string): string | undefined => {
  const trimmed = rawTerm?.trim();
  return trimmed && trimmed.length >= MIN_TERM_LENGTH && trimmed.length <= MAX_TERM_LENGTH
    ? trimmed
    : undefined;
};
