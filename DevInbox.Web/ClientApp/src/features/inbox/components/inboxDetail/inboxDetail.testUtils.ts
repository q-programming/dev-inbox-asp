import { InboxItemDetail, ItemSource, ItemType } from '@api';

type InboxItemDetailOverrides = Partial<InboxItemDetail> & {
  ado?: NonNullable<InboxItemDetail['ado']> | undefined;
};

export function makeInboxItemDetail(
  overrides: InboxItemDetailOverrides = {},
): InboxItemDetail {
  return {
    id: 1,
    title: 'Test inbox item',
    source: ItemSource.Ado,
    itemType: ItemType.WorkItem,
    isDone: false,
    isSaved: false,
    ado: {
      url: 'https://dev.azure.com/example/project/_workitems/edit/123',
    },
    ...overrides,
  };
}
