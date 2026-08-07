using System.Security.Claims;
using DevInbox.Web.Common;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;
using GeneratedItemSource = DevInbox.Web.Infrastructure.OpenApi.Generated.ItemSource;
using GeneratedInboxItemDetail = DevInbox.Web.Infrastructure.OpenApi.Generated.InboxItemDetail;

namespace DevInbox.Web.Tests.Features.Inbox;

/// <summary>
/// Integration tests for <see cref="InboxService"/> against a real PostgreSQL container, exercising
/// <see cref="InboxRepository"/>/<see cref="InboxItemRepository"/> and the raw EF Core query in
/// <see cref="InboxService.GetInboxSummaryAsync"/> end-to-end (not covered by the mocked unit tests).
/// The detail service is mocked as populating item details is out of scope here.
/// </summary>
public class InboxServiceIT : DatabaseIntegrationTest
{
    private User _user = default!;
    private User _otherUser = default!;
    private InboxService _service = default!;
    private readonly IInboxDetailService _detailService = Substitute.For<IInboxDetailService>();
    private readonly INotesService _notesService = Substitute.For<INotesService>();

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        _user = new User { FirstName = "Jan", LastName = "Kowalski", Email = "jan@example.com", Password = "hashed" };
        _otherUser = new User { FirstName = "Anna", LastName = "Nowak", Email = "anna@example.com", Password = "hashed" };
        await DataBase.Users.AddRangeAsync(_user, _otherUser);
        await DataBase.SaveChangesAsync();

        var userInbox = InboxEntity.CreateDefault();
        userInbox.UserId = _user.Id;
        var otherInbox = InboxEntity.CreateDefault();
        otherInbox.UserId = _otherUser.Id;
        await DataBase.Inboxes.AddRangeAsync(userInbox, otherInbox);
        await DataBase.SaveChangesAsync();

        var accessor = CreateAccessorWithClaim(_user.Id);
        _service = new InboxService(
            new InboxRepository(DataBase),
            new InboxItemRepository(DataBase),
            _detailService,
            _notesService,
            accessor);
    }

    public override async Task DisposeAsync()
    {
        await DataBase.InboxItemStates.ExecuteDeleteAsync();
        await DataBase.InboxItems.ExecuteDeleteAsync();
        await DataBase.Inboxes.ExecuteDeleteAsync();
        await DataBase.Users.ExecuteDeleteAsync();
        await base.DisposeAsync();
    }

    private static IHttpContextAccessor CreateAccessorWithClaim(long userId)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "TestAuth");
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return accessor;
    }

    private async Task<InboxItem> AddItemAsync(long inboxId, ItemSource source, ItemType type, InboxReason reason,
        bool isUnread = true, bool isSaved = false, Priority priority = Priority.None,
        DateTimeOffset? activityAt = null, bool isDone = false)
    {
        var item = new InboxItem
        {
            InboxId = inboxId,
            Source = source,
            Type = type,
            Reason = reason,
            ExternalId = Guid.NewGuid().ToString("N")[..8],
            Title = "Test item",
            ActivityAt = activityAt ?? DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState
            {
                IsUnread = isUnread,
                IsSaved = isSaved,
                IsDone = isDone,
                Priority = priority,
                UpdatedAt = DateTimeOffset.UtcNow
            }
        };
        await DataBase.InboxItems.AddAsync(item);
        await DataBase.SaveChangesAsync();
        return item;
    }

    [Fact(DisplayName = "GetInboxSummaryAsync should aggregate counts across the current user's items only")]
    public async Task GetInboxSummaryAsyncShouldAggregateCountsForCurrentUserAsync()
    {
        // Read (not unread) — MyPullRequests/Saved don't require unread, so this item can be read
        // without breaking the Unread-gated ReviewRequests/Mentions/AdoItems counts below.
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isUnread: false, isSaved: true);
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.ReviewRequested, isUnread: true);
        await AddItemAsync(_user.Id, ItemSource.Ado, ItemType.WorkItem, InboxReason.Mentioned, priority: Priority.Critical);
        await AddItemAsync(_user.Id, ItemSource.Note, ItemType.Note, InboxReason.Note);
        // Belongs to another user - must not be counted.
        await AddItemAsync(_otherUser.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);

        var summary = await _service.GetInboxSummaryAsync();

        Assert.Equal(4, summary.Total);
        Assert.Equal(3, summary.Unread);
        Assert.Equal(1, summary.Read);
        Assert.Equal(1, summary.Saved);
        Assert.Equal(1, summary.NeedsAttention);
        Assert.Equal(1, summary.ReviewRequests);
        Assert.Equal(1, summary.Mentions);
        Assert.Equal(1, summary.MyPullRequests);
        Assert.Equal(1, summary.AdoItems);
        Assert.Equal(1, summary.Notes);
    }

    [Fact(DisplayName = "GetInboxSummaryAsync should return an empty summary when the user has no items")]
    public async Task GetInboxSummaryAsyncShouldReturnEmptySummaryWhenNoItemsAsync()
    {
        var summary = await _service.GetInboxSummaryAsync();

        Assert.Equal(0, summary.Total);
    }

    [Fact(DisplayName = "ListInboxItemsAsync should filter by source and paginate against the real database")]
    public async Task ListInboxItemsAsyncShouldFilterAndPaginateAsync()
    {
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, activityAt: DateTimeOffset.UtcNow.AddMinutes(-1));
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.Issue, InboxReason.Mentioned, activityAt: DateTimeOffset.UtcNow.AddMinutes(-2));
        await AddItemAsync(_user.Id, ItemSource.Ado, ItemType.WorkItem, InboxReason.Assigned, activityAt: DateTimeOffset.UtcNow.AddMinutes(-3));

        var result = await _service.ListInboxItemsAsync(0, 1, GeneratedItemSource.Github, null, null, null);

        Assert.Equal(2, result.TotalElements);
        _ = Assert.Single(result.Items);
        Assert.Equal(0, result.Page);
        Assert.Equal(1, result.Size);
    }

    [Fact(DisplayName = "GetInboxItemByIdAsync should return the item detail when it belongs to the current user")]
    public async Task GetInboxItemByIdAsyncShouldReturnDetailWhenOwnedByUserAsync()
    {
        var item = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);

        var detail = await _service.GetInboxItemByIdAsync(item.Id);

        Assert.Equal(item.Title, detail.Title);
        await _detailService.Received(1).PopulateAsync(Arg.Any<InboxItem>(), detail, Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "GetInboxItemByIdAsync should throw NotFoundException when the item belongs to a different user")]
    public async Task GetInboxItemByIdAsyncShouldThrowWhenItemBelongsToAnotherUserAsync()
    {
        var item = await AddItemAsync(_otherUser.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);

        _ = await Assert.ThrowsAsync<NotFoundException>(() => _service.GetInboxItemByIdAsync(item.Id));
        await _detailService.DidNotReceive().PopulateAsync(Arg.Any<InboxItem>(), Arg.Any<GeneratedInboxItemDetail>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "PutInboxSeedAsync should persist between 1 and 5 items linked to the current user's inbox")]
    public async Task PutInboxSeedAsyncShouldPersistItemsForCurrentUserAsync()
    {
        await _service.PutInboxSeedAsync();

        var persisted = await DataBase.InboxItems.AsNoTracking().Where(i => i.InboxId == _user.Id).ToListAsync();

        Assert.InRange(persisted.Count, 1, 5);
        Assert.All(persisted, i => Assert.Equal(_user.Id, i.InboxId));
    }

    [Fact(DisplayName = "UpdateAsync should persist changes made to the inbox")]
    public async Task UpdateAsyncShouldPersistInboxChangesAsync()
    {
        var inbox = await _service.GetUserInboxAsync();
        inbox.SyncStatus = SyncStatus.Running;
        inbox.Version += 1;

        await _service.UpdateAsync(inbox);

        await using var context = BuildDbContext();
        var reloaded = await context.Inboxes.AsNoTracking().SingleAsync(i => i.UserId == _user.Id);
        Assert.Equal(SyncStatus.Running, reloaded.SyncStatus);
        Assert.Equal(inbox.Version, reloaded.Version);
    }
}
