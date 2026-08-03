using System.Linq.Expressions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Domain;

public interface IInboxItemRepository : IRepository<InboxItem>
{
    IQueryable<InboxItem> Query();
    Task<(List<InboxItem> Items, long TotalElements)> GetInboxItemsFilteredAsync(int page, int size, long userId, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason);

    Task<InboxItem?> GetByIdForUserAsync(long id, long userId);

    /// <summary>
    /// Groups all inbox items belonging to <paramref name="userId"/> into a single aggregate and
    /// projects it via <paramref name="selector"/>. The selector is an expression tree (not a plain
    /// delegate) so EF Core can translate the aggregation/projection into SQL instead of pulling every
    /// item into memory — the repository stays agnostic of the caller's DTO shape.
    /// </summary>
    Task<TResult?> GetInboxSummaryAsync<TResult>(long userId, Expression<Func<IGrouping<int, InboxItem>, TResult>> selector) where TResult : class;
}

