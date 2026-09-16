using System.Linq.Expressions;
using DevInbox.Web.Features.Inbox.Config;
using DevInbox.Web.Features.Inbox.Exceptions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.FeatureManagement;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItemRepository(AppDbContext dbContext, IFeatureManager featureManager) : Repository<InboxItem>(dbContext), IInboxItemRepository
{
    /// <summary>
    /// Upper bound on how many rows (already scoped by userId/source/type/status/reason, but before
    /// decrypting Title and matching the search term) may be pulled into memory for a single search
    /// request while <see cref="InboxFeatureFlags.SearchScopeGuard"/> is enabled — see
    /// <see cref="Exceptions.SearchScopeTooBroadException"/>. Settable (not just a bare constant) so
    /// tests can exercise the guard without seeding 10000+ rows; production always uses the default.
    /// </summary>
    internal int MaxSearchCandidates { get; init; } = 10_000;

    public IQueryable<InboxItem> Query()
    {
        return Set;
    }

    public async Task<TResult?> GetInboxSummaryAsync<TResult>(long userId, Expression<Func<IGrouping<int, InboxItem>, TResult>> selector) where TResult : class
    {
        return await Set
            .AsNoTracking()
            .Where(item => item.InboxId == userId &&
                !item.State.IsClosed &&
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

    public async Task<(List<InboxItem> Items, long TotalElements)> GetInboxItemsFilteredAsync(PageRequest pageRequest, long userId, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason, string? searchTerm)
    {
        // Closed items (fully done with, e.g. a merged/closed PR) are excluded from every other
        // view — they only ever show up when the caller explicitly asks for the Closed status.
        var query = Set
            .AsNoTracking()
            .Include(x => x.State)
            .Where(i => i.InboxId == userId && (status == ItemStatus.Closed ? i.State.IsClosed : !i.State.IsClosed));

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
                ItemStatus.ToDo => query.Where(i => !i.State.IsDone),
                ItemStatus.Saved => query.Where(i => i.State.IsSaved),
                ItemStatus.Done => query.Where(i => i.State.IsDone),
                ItemStatus.Pinned => query.Where(i => i.State.IsPinned),
                _ => query
            };
        }

        // Every sort keeps ActivityAt desc as a stable tie-breaker/secondary key, so items with equal
        // priority/comment counts/etc. still fall back to the original "most recently active" order
        // instead of an arbitrary (and unstable across pages) database order.
        var orderedQuery = pageRequest.Sort switch
        {
            InboxSort.ActivityAsc => query.OrderBy(i => i.ActivityAt),
            InboxSort.PriorityDesc => query.OrderByDescending(i => i.State.Priority).ThenByDescending(i => i.ActivityAt),
            InboxSort.CreatedDesc => query.OrderByDescending(i => i.CreatedAt),
            InboxSort.CommentsDesc => query.OrderByDescending(i => i.CommentCount).ThenByDescending(i => i.ActivityAt),
            _ => query.OrderByDescending(i => i.ActivityAt),
        };

        List<InboxItem> items;
        long totalElements;

        var trimmedSearchTerm = searchTerm?.Trim();
        if (!string.IsNullOrEmpty(trimmedSearchTerm))
        {
            // Guard is itself feature-flagged — independent of whether search is used at all (search is
            // never disabled). While the flag is on, an overly broad candidate set (rows already scoped
            // by userId/source/type/status/reason, before decrypting Title) is rejected up front instead
            // of paying for an unbounded decrypt-and-scan below.
            if (await featureManager.IsEnabledAsync(InboxFeatureFlags.SearchScopeGuard))
            {
                var candidateCount = await query.LongCountAsync();
                if (candidateCount > MaxSearchCandidates)
                {
                    throw new SearchScopeTooBroadException();
                }
            }

            // Title is stored encrypted at rest (see AppDbContext's EncryptedStringConverter), so its
            // ciphertext bears no relationship to the plaintext — a server-side ILIKE/LIKE against the
            // column is both impossible to translate correctly and would never match. Every other
            // filter above still runs in SQL; only the search term is applied after the (already
            // userId/source/type/status/reason-scoped) rows are decrypted in memory, using an ordinary
            // case-insensitive string comparison — not a SQL pattern — so there is no SQL injection
            // surface and no LIKE wildcard-escaping concern either.
            var matched = (await orderedQuery.ToListAsync())
                .Where(i => i.Title != null && i.Title.Contains(trimmedSearchTerm, StringComparison.OrdinalIgnoreCase))
                .ToList();

            totalElements = matched.Count;
            items = matched
                .Skip(pageRequest.Page * pageRequest.Size)
                .Take(pageRequest.Size)
                .ToList();
        }
        else
        {
            totalElements = await query.LongCountAsync();
            items = await orderedQuery
                .Skip(pageRequest.Page * pageRequest.Size)
                .Take(pageRequest.Size)
                .ToListAsync();
        }

        await PopulateHasNoteAsync(items);

        return (items, totalElements);
    }

    public async Task BulkUpdateStateAsync(long userId, IReadOnlyCollection<long> ids, bool? isDone, bool? isSaved)
    {
        if (ids.Count == 0)
        {
            return;
        }

        var items = await Set
            .Include(i => i.State)
            .Where(i => i.InboxId == userId && ids.Contains(i.Id))
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        foreach (var item in items)
        {
            if (isDone.HasValue)
            {
                item.State.IsDone = isDone.Value;
            }

            if (isSaved.HasValue)
            {
                item.State.IsSaved = isSaved.Value;
            }

            item.State.UpdatedAt = now;
        }

        await Context.SaveChangesAsync();
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

    public Task<List<InboxItem>> GetExistingItemsAsync(
        long inboxId,
        ItemSource source,
        ItemType type,
        IReadOnlyCollection<string> repositories,
        IReadOnlyCollection<string> externalIds)
    {
        return Set
            .Include(i => i.State)
            .Where(i => i.InboxId == inboxId
                && i.Source == source
                && i.Type == type
                && i.Repository != null && repositories.Contains(i.Repository)
                && i.ExternalId != null && externalIds.Contains(i.ExternalId))
            .ToListAsync();
    }

    public async Task AddRangeAsync(IEnumerable<InboxItem> items)
    {
        await Set.AddRangeAsync(items);
    }

    public Task SaveChangesAsync()
    {
        return Context.SaveChangesAsync();
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

    public async Task SyncAttachedNotesStateAsync(IEnumerable<InboxItem> parentItems)
    {
        var parentsById = parentItems.ToDictionary(i => i.Id);
        if (parentsById.Count == 0)
        {
            return;
        }

        var attachedNotes = await dbContext.Notes
            .Include(note => note.InboxItem)
            .ThenInclude(item => item.State)
            .Where(note => note.AttachedToInboxItemId != null && parentsById.Keys.Contains(note.AttachedToInboxItemId.Value))
            .ToListAsync();

        if (attachedNotes.Count == 0)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        foreach (var note in attachedNotes)
        {
            var parent = parentsById[note.AttachedToInboxItemId!.Value];
            note.InboxItem.State.IsDone = parent.State.IsDone;
            note.InboxItem.State.IsClosed = parent.State.IsClosed;
            note.InboxItem.State.UpdatedAt = now;
        }

        await Context.SaveChangesAsync();
    }

    public async Task DeleteBySourceAsync(long userId, ItemSource source, string? organization = null)
    {
        var targetIds = await Set
            .Where(i => i.InboxId == userId && i.Source == source)
            .Where(i => organization == null || (i.Repository != null && i.Repository.StartsWith(organization + "/")))
            .Select(i => i.Id)
            .ToListAsync();

        if (targetIds.Count == 0)
        {
            return;
        }

        // A note attached to one of these items isn't meaningful once its target is gone, so it must
        // be deleted too
        var attachedNoteEnvelopeIds = await dbContext.Notes
            .Where(note => note.AttachedToInboxItemId != null && targetIds.Contains(note.AttachedToInboxItemId.Value))
            .Select(note => note.InboxItemId)
            .ToListAsync();

        var idsToDelete = attachedNoteEnvelopeIds.Count == 0
            ? targetIds
            : targetIds.Union(attachedNoteEnvelopeIds).ToList();

        // Single bulk DELETE for both the target items and any attached notes' envelopes — their
        // InboxItemState rows cascade-delete automatically via the existing FK configuration.
        await Set
            .Where(i => idsToDelete.Contains(i.Id))
            .ExecuteDeleteAsync();
    }
}
