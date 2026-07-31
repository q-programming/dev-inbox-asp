using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Domain;

public interface IInboxItemRepository : IRepository<InboxItem>
{
    IQueryable<InboxItem> Query();
    Task<(List<InboxItem> Items, long TotalElements)> GetInboxItemsFilteredAsync(int page, int size, long userId, ItemSource? source, ItemType? itemType, ItemStatus? status);

    Task<InboxItem?> GetByIdForUserAsync(long id, long userId);
}
