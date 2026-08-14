
using System.Security.Claims;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Inbox.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;
using Priority = DevInbox.Web.Features.Inbox.Domain.Priority;

namespace DevInbox.Web.Features.Inbox;

public class InboxService(
    IInboxRepository inboxRepository,
    IInboxItemRepository inboxItemRepository,
    IInboxDetailService inboxDetailService,
    Notes.INotesService notesService,
    IHttpContextAccessor httpContextAccessor) : IInboxService, IService
{
    InboxMapper _inboxMapper = new();

    public async Task<InboxSummary> GetInboxSummaryAsync()
    {
        var userId = GetCurrentUserId();
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.AddDays(-7);

        var summary = await inboxItemRepository.GetInboxSummaryAsync(userId, group => new InboxSummary
        {
            Total = group.LongCount(),
            ToDo = group.LongCount(item => !item.State.IsDone),
            Saved = group.LongCount(item => item.State.IsSaved && !item.State.IsDone),
            NeedsAttention = group.LongCount(item =>
                item.State.Priority == Priority.High ||
                item.State.Priority == Priority.Critical ||
                (item.State.FollowUpAt != null && item.State.FollowUpAt <= now)),
            Stale = group.LongCount(item =>
                !item.State.IsDone &&
                item.ActivityAt < staleBefore),
            ReviewRequests = group.LongCount(item =>
                item.Reason == InboxReason.ReviewRequested &&
                !item.State.IsDone),
            Mentions = group.LongCount(item =>
                item.Reason == InboxReason.Mentioned &&
                !item.State.IsDone),
            MyPullRequests = group.LongCount(item =>
                item.Source == ItemSource.GitHub &&
                item.Type == ItemType.PR &&
                item.Reason == InboxReason.Authored),
            AdoItems = group.LongCount(item =>
                item.Source == ItemSource.Ado &&
                !item.State.IsDone),
        }) ?? new InboxSummary();

        // Notes counts standalone + attached notes alike — unlike the metrics above, which only reflect
        // items that show up as their own row in the main inbox listing (attached notes don't).
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
            var source = RandomEnum(ItemSource.Other, ItemSource.Note);
            var number = Random.Shared.Next(1000, 9999);

            // Notes are domain objects in their own right (they own their InboxItem envelope), so they
            // can't be seeded as a bare InboxItem like GitHub/Ado/Other — route them through NotesService.
            if (source == ItemSource.Note)
            {
                var tags = new[] { PickRandomTag(), PickRandomTag() };
                var followUpAt = random.Next(100) < 40
                    ? DateTimeOffset.UtcNow.AddDays(random.Next(-7, 14))
                    : (DateTimeOffset?)null;

                await notesService.CreateNoteAsync(
                    $"Seed note #{number}",
                    $"Seed note body {Guid.NewGuid():N}"[..24],
                    tags,
                    followUpAt);
                continue;
            }

            var type = RandomEnum<ItemType>();
            var reason = RandomEnum<InboxReason>();
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
                    IsDone = random.Next(100) < 50,
                    IsSaved = random.Next(100) < 25,
                    IsPinned = random.Next(100) < 15,
                    IsClosed = random.Next(100) < 15,
                    Priority = RandomEnum<Priority>(),

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
                item.CommentCount = 2;
            }

            await inboxItemRepository.AddAsync(item);

            // Occasionally attach a note to demonstrate the "note attached to another item" flow —
            // still routed through NotesService so it gets its own InboxItem envelope + FK.
            if (random.Next(100) < 30)
            {
                await notesService.CreateNoteAsync(
                    $"Note on {item.Title}",
                    $"Seed attached note {Guid.NewGuid():N}"[..24],
                    [PickRandomTag()],
                    null,
                    item.Id);
            }
        }
    }

    public async Task<InboxPage> ListInboxItemsAsync(int page, int size, Infrastructure.OpenApi.Generated.ItemSource? source, Infrastructure.OpenApi.Generated.ItemType? itemType, ItemStatus? status, Infrastructure.OpenApi.Generated.InboxReason? reason)
    {
        var userId = GetCurrentUserId();
        var (items, totalElements) = await inboxItemRepository.GetInboxItemsFilteredAsync(page, size, userId, (ItemSource?)source, (ItemType?)itemType, status, (InboxReason?)reason);

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

    public async Task MarkInboxItemDoneAsync(long id, bool isDone)
    {
        var userId = GetCurrentUserId();
        var item = await inboxItemRepository.GetByIdForUserAsync(id, userId) ?? throw new NotFoundException($"Inbox item with ID {id} not found for user {userId}");
        item.State.IsDone = isDone;
        item.State.UpdatedAt = DateTimeOffset.UtcNow;
        await inboxItemRepository.UpdateAsync(item);
    }

    public async Task SaveInboxItemAsync(long id, bool save)
    {
        var userId = GetCurrentUserId();
        var item = await inboxItemRepository.GetByIdForUserAsync(id, userId) ?? throw new NotFoundException($"Inbox item with ID {id} not found for user {userId}");
        item.State.IsSaved = save;
        item.State.UpdatedAt = DateTimeOffset.UtcNow;
        await inboxItemRepository.UpdateAsync(item);
    }


    public async Task DeleteInboxItemsBySourceAsync(long userId, ItemSource source, CancellationToken cancellationToken)
    {
        await inboxItemRepository.DeleteBySourceAsync(userId, source);
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userIdClaim)
            ? throw new UnauthorizedException("User ID claim not found in the current context.")
            : long.Parse(userIdClaim);
    }

    private static T RandomEnum<T>(params T[] excluded) where T : struct, Enum
    {
        var values = Enum.GetValues<T>()
        .Where(value => !excluded.Contains(value))
        .ToArray();
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
