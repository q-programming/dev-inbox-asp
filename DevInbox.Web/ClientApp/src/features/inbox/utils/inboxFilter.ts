import { InboxReason, ItemSource, ItemStatus, ItemType } from '@api';

/** Filter criteria that can be applied to the inbox item listing via query params. */
export interface InboxFilter {
  source?: ItemSource;
  itemType?: ItemType;
  reason?: InboxReason;
  status?: ItemStatus;
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

  const query = params.toString();
  return query ? `?${query}` : '';
};

/** Parses an inbox filter back out of a `URLSearchParams` instance. */
export const parseInboxFilter = (searchParams: URLSearchParams): InboxFilter => ({
  source: (searchParams.get('source') as ItemSource) || undefined,
  itemType: (searchParams.get('itemType') as ItemType) || undefined,
  reason: (searchParams.get('reason') as InboxReason) || undefined,
  status: (searchParams.get('status') as ItemStatus) || undefined,
});
