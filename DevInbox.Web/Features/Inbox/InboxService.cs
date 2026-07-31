
using System.Security.Claims;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Inbox.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Infrastructure.Persistence;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;
using Priority = DevInbox.Web.Features.Inbox.Domain.Priority;

namespace DevInbox.Web.Features.Inbox;

public class InboxService(
    IInboxRepository inboxRepository,
    InboxItemRepository inboxItemRepository,
    IInboxDetailService inboxDetailService,
    IHttpContextAccessor httpContextAccessor,
    AppDbContext dbContext) : IInboxService, IService
{
    InboxMapper _inboxMapper = new();

    public async Task<InboxSummary> GetInboxSummaryAsync()
    {
        var userId = GetCurrentUserId();
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.AddDays(-7);

        return await dbContext.InboxItems
            .AsNoTracking()
            .Where(item => item.InboxId == userId)
            .GroupBy(_ => 1)
            .Select(group => new InboxSummary
            {
                Total = group.LongCount(),
                Unread = group.LongCount(item => item.State.IsUnread),
                Read = group.LongCount(item => !item.State.IsUnread),
                Saved = group.LongCount(item => item.State.IsSaved),
                NeedsAttention = group.LongCount(item =>
                    item.State.Priority == Priority.High ||
                    item.State.Priority == Priority.Critical ||
                    (item.State.FollowUpAt != null && item.State.FollowUpAt <= now)),
                Stale = group.LongCount(item =>
                    !item.State.IsDone &&
                    item.ActivityAt < staleBefore),
                ReviewRequests = group.LongCount(item =>
                    item.Reason == InboxReason.ReviewRequested),
                Mentions = group.LongCount(item =>
                    item.Reason == InboxReason.Mentioned),
                MyPullRequests = group.LongCount(item =>
                    item.Source == ItemSource.GitHub &&
                    item.Type == ItemType.PR &&
                    item.Reason == InboxReason.Authored),
                AdoItems = group.LongCount(item =>
                    item.Source == ItemSource.Ado),
                Notes = group.LongCount(item =>
                    item.Type == ItemType.Note)
            })
            .SingleOrDefaultAsync() ?? new InboxSummary();
    }

    public async Task<Domain.Inbox> GetUserInboxAsync()
    {
        var userId = GetCurrentUserId();
        return await GetUserInboxAsync(userId);
    }

    public async Task<Domain.Inbox> GetUserInboxAsync(long userId)
    {
        var inbox = await inboxRepository.GetByIdAsync(userId) ?? throw new NotFoundException($"Inbox not found for user {userId}");
        return inbox;
    }

    public async Task UpdateAsync(Domain.Inbox inbox)
    {
        await inboxRepository.UpdateAsync(inbox);
    }


    public async Task PutInboxSeedAsync()
    {
        var inbox = await inboxRepository.GetByIdAsync(GetCurrentUserId());
        var random = Random.Shared;
        var count = random.Next(1, 6);
        for (var i = 0; i < count; i++)
        {
            var source = RandomEnum<ItemSource>();
            var type = RandomEnum<ItemType>();
            var reason = RandomEnum<InboxReason>();
            var number = Random.Shared.Next(1000, 9999);
            var item = new InboxItem
            {
                InboxId = inbox.UserId,
                Source = source,
                ExternalId = number.ToString(),
                Type = type,
                Reason = reason,
                Title = $"{source} {type} #{number}",
                ActivityAt = DateTimeOffset.UtcNow.AddDays(-random.Next(0, 30)),
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(30, 90)),
                UpdatedAt = DateTimeOffset.UtcNow,
                State = new InboxItemState
                {
                    IsUnread = random.Next(100) < 50,
                    IsSaved = random.Next(100) < 25,
                    IsPinned = random.Next(100) < 15,
                    IsDone = random.Next(100) < 30,
                    Priority = RandomEnum<Priority>(),
                    PrivateNote = random.Next(100) < 30
                        ? $"Seed note {Guid.NewGuid():N}"[..18]
                        : null,

                    Tags =
                    [
                        PickRandomTag(),
                    PickRandomTag()
                    ],

                    FollowUpAt = random.Next(100) < 40
                        ? DateTimeOffset.UtcNow.AddDays(random.Next(-7, 14))
                        : null,

                    UpdatedAt = DateTimeOffset.UtcNow
                }
            };
            if (item.Source == ItemSource.GitHub)
            {
                item.Repository = $"company/repo-{random.Next(1, 100)}";
            }

            await inboxItemRepository.AddAsync(item);
        }
    }

    public async Task<InboxPage> ListInboxItemsAsync(int page, int size, Infrastructure.OpenApi.Generated.ItemSource? source, Infrastructure.OpenApi.Generated.ItemType? itemType, ItemStatus? status)
    {
        var userId = GetCurrentUserId();
        var (items, totalElements) = await inboxItemRepository.GetInboxItemsFilteredAsync(page, size, userId, (ItemSource?)source, (ItemType?)itemType, status);

        return new InboxPage
        {
            Items = items
                .Select(_inboxMapper.ToDto)
                .ToList(),
            TotalElements = totalElements,
            Page = page,
            Size = size
        };
    }

    public async Task<InboxItemDetail> GetInboxItemByIdAsync(long id)
    {
        var userId = GetCurrentUserId();
        var item = await inboxItemRepository.GetByIdForUserAsync(id, userId) ?? throw new NotFoundException($"Inbox item with ID {id} not found for user {userId}");
        var itemDto = _inboxMapper.ToInboxItemDetail(item);
        await inboxDetailService.PopulateAsync(item, itemDto);
        return itemDto;
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userIdClaim)
            ? throw new NotFoundException("User ID claim not found in the current context.")
            : long.Parse(userIdClaim);
    }

    private static T RandomEnum<T>() where T : struct, Enum
    {
        var values = Enum.GetValues<T>();
        return values[Random.Shared.Next(values.Length)];
    }

    private static string PickRandomTag()
    {
        string[] tags =
        [
            "backend",
            "frontend",
            "bug",
            "feature",
            "urgent",
            "github",
            "ado",
            "review",
            "refactor",
            "technical-debt"
        ];

        return tags[Random.Shared.Next(tags.Length)];
    }

}
