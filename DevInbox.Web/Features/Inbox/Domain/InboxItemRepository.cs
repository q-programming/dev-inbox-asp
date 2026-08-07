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
            .Where(item => item.InboxId == userId &&
                (item.Source != ItemSource.Note || item.Note!.AttachedToInboxItemId == null))
            .GroupBy(_ => 1)
            .Select(selector)
            .SingleOrDefaultAsync();
    }

    public Task<long> CountNotesAsync(long userId)
    {
        return Set
            .AsNoTracking()
            .Where(item => item.InboxId == userId && item.Type == ItemType.Note)
            .LongCountAsync();
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

        // Notes attached to another item aren't their own inbox entry — they're surfaced inline on the
        // item they annotate — unless the caller explicitly asked for the dedicated Notes view.
        if (itemType != ItemType.Note)
        {
            query = query.Where(i => i.Source != ItemSource.Note || i.Note!.AttachedToInboxItemId == null);
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

        await PopulateHasNoteAsync(items);

        return (items, totalElements);
    }

    public async Task<InboxItem?> GetByIdForUserAsync(long id, long userId)
    {
        var item = await dbContext.InboxItems
            .AsNoTracking()
            .Include(i => i.State)
            .FirstOrDefaultAsync(i => i.Id == id && i.InboxId == userId);

        if (item is not null)
        {
            await PopulateHasNoteAsync([item]);
        }

        return item;
    }

    /// <summary>Batches the "does this item have a note attached" lookup into a single query for the
    /// whole page/item set, instead of a per-item existence check (N+1). An item can have at most one
    /// attached note (enforced in NotesService), so a Contains-based set lookup is enough.</summary>
    private async Task PopulateHasNoteAsync(List<InboxItem> items)
    {
        var ids = items.Select(i => i.Id).ToArray();
        if (ids.Length == 0)
        {
            return;
        }

        var idsWithNotes = await dbContext.Notes
            .AsNoTracking()
            .Where(note => note.AttachedToInboxItemId != null && ids.Contains(note.AttachedToInboxItemId.Value))
            .Select(note => note.AttachedToInboxItemId!.Value)
            .ToHashSetAsync();

        foreach (var item in items)
        {
            item.HasNote = idsWithNotes.Contains(item.Id);
        }
    }
}
