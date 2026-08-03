using System.Linq.Expressions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItemRepository(AppDbContext dbContext) : Repository<InboxItem>(dbContext), IInboxItemRepository
{
    public IQueryable<InboxItem> Query()
    {
        return Set;
    }

    public async Task<TResult?> GetInboxSummaryAsync<TResult>(long userId, Expression<Func<IGrouping<int, InboxItem>, TResult>> selector) where TResult : class
    {
        return await Set
            .AsNoTracking()
            .Where(item => item.InboxId == userId)
            .GroupBy(_ => 1)
            .Select(selector)
            .SingleOrDefaultAsync();
    }

    public async Task<(List<InboxItem> Items, long TotalElements)> GetInboxItemsFilteredAsync(int page, int size, long userId, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason)
    {
        var query = Set
            .AsNoTracking()
            .Include(x => x.State)
            .Where(i => i.InboxId == userId);

        if (source.HasValue)
        {
            query = query.Where(i => i.Source == source.Value);
        }

        if (itemType.HasValue)
        {
            query = query.Where(i => i.Type == itemType.Value);
        }

        if (reason.HasValue)
        {
            query = query.Where(i => i.Reason == reason.Value);
        }

        if (status is not null)
        {
            query = status switch
            {
                ItemStatus.Unread => query.Where(i => i.State.IsUnread),
                ItemStatus.Saved => query.Where(i => i.State.IsSaved),
                ItemStatus.Done => query.Where(i => i.State.IsDone),
                ItemStatus.Pinned => query.Where(i => i.State.IsPinned),
                _ => query
            };
        }

        var totalElements = await query.LongCountAsync();

        var items = await query
            .OrderByDescending(i => i.ActivityAt)
            .Skip(page * size)
            .Take(size)
            .ToListAsync();

        return (items, totalElements);
    }

    public Task<InboxItem?> GetByIdForUserAsync(long id, long userId)
    {
        return dbContext.InboxItems
            .AsNoTracking()
            .Include(i => i.State)
            .FirstOrDefaultAsync(i => i.Id == id && i.InboxId == userId);
    }
}
