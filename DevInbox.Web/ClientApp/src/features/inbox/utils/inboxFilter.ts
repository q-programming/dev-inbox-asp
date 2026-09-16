import { InboxReason, InboxSort, ItemSource, ItemStatus, ItemType } from '@api';

/** Filter criteria that can be applied to the inbox item listing via query params. */
export interface InboxFilter {
  source?: ItemSource;
  itemType?: ItemType;
  reason?: InboxReason;
  status?: ItemStatus;
  sort?: InboxSort;
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
  term: searchParams.get('term') || undefined,
});

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
