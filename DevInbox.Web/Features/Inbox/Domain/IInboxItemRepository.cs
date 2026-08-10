using System.Linq.Expressions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Domain;

public interface IInboxItemRepository : IRepository<InboxItem>
{
    IQueryable<InboxItem> Query();
    Task<(List<InboxItem> Items, long TotalElements)> GetInboxItemsFilteredAsync(int page, int size, long userId, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason);

    Task<InboxItem?> GetByIdForUserAsync(long id, long userId);

    /// <summary>
    /// Loads existing inbox items for the given source/type whose (Repository, ExternalId) key falls
    /// within the provided candidate sets — used to determine, in a single query, which of a batch of
    /// externally-fetched items (e.g. GitHub PRs) already exist locally, so callers can decide
    /// create-vs-update without a query per item.
    /// Repository and ExternalId narrow the *candidate* rows only (e.g. a PR number is unique within a
    /// repository, not globally) — callers must still match the exact (Repository, ExternalId) pair
    /// themselves once loaded. Returned entities are change-tracked (not AsNoTracking) so callers can
    /// mutate them directly and persist via <see cref="SaveChangesAsync"/>.
    /// </summary>
    Task<List<InboxItem>> GetExistingItemsAsync(
        long inboxId,
        ItemSource source,
        ItemType type,
        IReadOnlyCollection<string> repositories,
        IReadOnlyCollection<string> externalIds);

    /// <summary>Adds new items without saving — pair with <see cref="SaveChangesAsync"/> to batch
    /// inserts together with any updates made to entities returned by <see cref="GetExistingItemsAsync"/>.</summary>
    Task AddRangeAsync(IEnumerable<InboxItem> items);

    /// <summary>Persists all pending changes (new items added via <see cref="AddRangeAsync"/> and any
    /// mutations to tracked entities) in a single round trip.</summary>
    Task SaveChangesAsync();

    /// <summary>
    /// Groups all inbox items belonging to <paramref name="userId"/> into a single aggregate and
    /// projects it via <paramref name="selector"/>. The selector is an expression tree (not a plain
    /// delegate) so EF Core can translate the aggregation/projection into SQL instead of pulling every
    /// item into memory — the repository stays agnostic of the caller's DTO shape.
    /// </summary>
    Task<TResult?> GetInboxSummaryAsync<TResult>(long userId, Expression<Func<IGrouping<int, InboxItem>, TResult>> selector) where TResult : class;

    /// <summary>Total notes (standalone + attached to another item) belonging to <paramref name="userId"/>.
    /// Kept separate from GetInboxSummaryAsync because attached notes are excluded from that grouped
    /// query's "visible" set (they're surfaced inline on their target item, not as their own row).</summary>
    Task<long> CountNotesAsync(long userId);
}

