using System.Security.Claims;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Inbox.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.Extensions.Caching.Memory;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;
using Priority = DevInbox.Web.Features.Inbox.Domain.Priority;

namespace DevInbox.Web.Features.Inbox;

public class InboxService(
    IInboxRepository inboxRepository,
    IInboxItemRepository inboxItemRepository,
    IInboxDetailService inboxDetailService,
    IHttpContextAccessor httpContextAccessor,
    IMemoryCache cache) : IInboxService, IService
{
    private readonly InboxMapper _inboxMapper = new();

    public async Task<InboxSummary> GetInboxSummaryAsync()
    {
        var userId = GetCurrentUserId();
        var now = DateTimeOffset.UtcNow;
        var summary = await inboxItemRepository.GetInboxSummaryAsync(userId, group => new InboxSummary
        {
            Total = group.LongCount(),
            ToDo = group.LongCount(item => !item.State.IsDone),
            Saved = group.LongCount(item => item.State.IsSaved && !item.State.IsDone),
            NeedsAttention = 0, // filled below via the shared predicates
            Stale = 0,
            ReviewRequests = group.LongCount(item =>
                item.Reason == InboxReason.ReviewRequested &&
                !item.State.IsDone),
            Mentions = group.LongCount(item =>
                item.Reason == InboxReason.Mentioned &&
                !item.State.IsDone),
            MyPullRequests = group.LongCount(item =>
                item.Source == ItemSource.GitHub &&
                item.Type == ItemType.PR &&
                item.Reason == InboxReason.Authored &&
                !item.State.IsDone),
            AssignedTo = group.LongCount(item =>
                item.Reason == InboxReason.Assigned &&
                !item.State.IsDone),
            AdoItems = group.LongCount(item =>
                item.Source == ItemSource.Ado &&
                !item.State.IsDone),
            GithubItems = group.LongCount(item =>
                item.Source == ItemSource.GitHub &&
                !item.State.IsDone)
        }) ?? new InboxSummary();

        // Notes counts standalone + attached notes alike — unlike the metrics above, which only reflect
        // items that show up as their own row in the main inbox listing (attached notes don't).
        summary.NeedsAttention = await inboxItemRepository.CountVisibleAsync(userId, InboxItemPredicates.NeedsAttention(now));
        summary.Stale = await inboxItemRepository.CountVisibleAsync(userId, InboxItemPredicates.Stale(now));
        summary.Notes = await inboxItemRepository.CountNotesAsync(userId);
        return summary;
    }

    public async Task<Domain.Inbox> GetUserInboxAsync()
    {
        var userId = GetCurrentUserId();
        return await GetUserInboxAsync(userId);
    }

    public async Task<Domain.Inbox> GetUserInboxAsync(long userId)
    {
        var inbox = await inboxRepository.GetByIdAsync(userId) ??
                    throw new NotFoundException($"Inbox not found for user {userId}");
        return inbox;
    }

    public async Task UpdateAsync(Domain.Inbox inbox)
    {
        await inboxRepository.UpdateAsync(inbox);
    }


    public async Task<InboxPage> ListInboxItemsAsync(
        PageRequest pageRequest,
        Infrastructure.OpenApi.Generated.ItemSource? source,
        Infrastructure.OpenApi.Generated.ItemType? itemType,
        ItemStatus? status,
        Infrastructure.OpenApi.Generated.InboxReason? reason,
        string? scope,
        string? searchTerm)
    {
        var userId = GetCurrentUserId();
        var (items, totalElements) = await inboxItemRepository.GetInboxItemsFilteredAsync(
            pageRequest,
            userId,
            (ItemSource?)source,
            (ItemType?)itemType,
            status,
            (InboxReason?)reason,
            scope,
            searchTerm);

        return new InboxPage
        {
            Items = items
                .Select(_inboxMapper.ToDto)
                .ToList(),
            TotalElements = totalElements,
            Page = pageRequest.Page,
            Size = pageRequest.Size
        };
    }

    public async Task<InboxItemDetail> GetInboxItemByIdAsync(long id)
    {
        var userId = GetCurrentUserId();
        var item = await inboxItemRepository.GetByIdForUserAsync(id, userId) ??
                   throw new NotFoundException($"Inbox item with ID {id} not found for user {userId}");
        var itemDto = _inboxMapper.ToInboxItemDetail(item);
        await inboxDetailService.PopulateAsync(item, itemDto);
        await inboxItemRepository.MarkViewedAsync(item.Id, DateTimeOffset.UtcNow);
        return itemDto;
    }

    public async Task MarkInboxItemDoneAsync(long id, bool isDone)
    {
        var userId = GetCurrentUserId();
        var item = await inboxItemRepository.GetByIdForUserAsync(id, userId) ??
                   throw new NotFoundException($"Inbox item with ID {id} not found for user {userId}");
        item.State.IsDone = isDone;
        item.State.UpdatedAt = DateTimeOffset.UtcNow;
        await inboxItemRepository.UpdateAsync(item);
    }

    public async Task SaveInboxItemAsync(long id, bool save)
    {
        var userId = GetCurrentUserId();
        var item = await inboxItemRepository.GetByIdForUserAsync(id, userId) ??
                   throw new NotFoundException($"Inbox item with ID {id} not found for user {userId}");
        item.State.IsSaved = save;
        item.State.UpdatedAt = DateTimeOffset.UtcNow;
        await inboxItemRepository.UpdateAsync(item);
    }


    public async Task BulkUpdateInboxItemsAsync(IReadOnlyCollection<long> ids, bool? isDone, bool? isSaved)
    {
        var userId = GetCurrentUserId();
        await inboxItemRepository.BulkUpdateStateAsync(userId, ids, isDone, isSaved);
    }

    public async Task DeleteInboxItemsBySourceAsync(long userId, ItemSource source, string? organization)
    {
        await inboxItemRepository.DeleteBySourceAsync(userId, source, organization);
        ClearUsersCache(userId);
    }

    public Task<string[]> GetUserTeamsAsync() =>
        GetCachedScopesAsync(GetCacheTeamKey, ItemType.WorkItem);

    public Task<string[]> GetUserRepositoriesAsync() =>
        GetCachedScopesAsync(GetCacheReposKey, ItemType.PR);

    /// <summary>
    /// Clears all caches for given user
    /// </summary>
    /// <param name="userId">User ID for which caches needs clearing</param>
    public void ClearUsersCache(long userId)
    {
        cache.Remove(GetCacheTeamKey(userId));
        cache.Remove(GetCacheReposKey(userId));
    }

    private async Task<string[]> GetCachedScopesAsync(Func<long, string> keyFor, ItemType type)
    {
        var userId = GetCurrentUserId();
        return await cache.GetOrCreateAsync(keyFor(userId), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30); // safety net
            return await inboxItemRepository.GetDistinctScopesAsync(userId, type);
        }) ?? [];
    }

    private static string GetCacheTeamKey(long userId)
    {
        return $"inbox:teams:{userId}";
    }

    private static string GetCacheReposKey(long userId)
    {
        return $"inbox:repos:{userId}";
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userIdClaim)
            ? throw new UnauthorizedException("User ID claim not found in the current context.")
            : long.Parse(userIdClaim);
    }
}
