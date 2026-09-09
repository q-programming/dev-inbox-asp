using System.Security.Claims;
using DevInbox.Web.Common;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;
using GeneratedItemSource = DevInbox.Web.Infrastructure.OpenApi.Generated.ItemSource;
using GeneratedInboxItemDetail = DevInbox.Web.Infrastructure.OpenApi.Generated.InboxItemDetail;
using GeneratedInboxSort = DevInbox.Web.Infrastructure.OpenApi.Generated.InboxSort;

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
    private InboxItemRepository _inboxItemRepository = default!;
    private readonly IInboxDetailService _detailService = Substitute.For<IInboxDetailService>();

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
        _inboxItemRepository = new InboxItemRepository(DataBase);
        _service = new InboxService(
            new InboxRepository(DataBase),
            _inboxItemRepository,
            _detailService,
            accessor);
    }

    public override async Task DisposeAsync()
    {
        await DataBase.Notes.ExecuteDeleteAsync();
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
        bool isDone = false, bool isSaved = false, Priority priority = Priority.None,
        DateTimeOffset? activityAt = null, bool isClosed = false, DateTimeOffset? createdAt = null)
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
            CreatedAt = createdAt ?? DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState
            {
                IsDone = isDone,
                IsSaved = isSaved,
                IsClosed = isClosed,
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
        // Saved is gated on not-done, so this saved item must count towards Saved.
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isDone: false, isSaved: true);
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.ReviewRequested, isDone: false, isSaved: false);
        await AddItemAsync(_user.Id, ItemSource.Ado, ItemType.WorkItem, InboxReason.Mentioned, priority: Priority.Critical);
        await AddItemAsync(_user.Id, ItemSource.Note, ItemType.Note, InboxReason.Note);
        // Belongs to another user - must not be counted.
        await AddItemAsync(_otherUser.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);
        // Closed — must be excluded from the inbox summary entirely.
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isClosed: true);
        // Done — MyPullRequests and GithubItems are gated on not-done, so this authored PR must not count.
        await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isDone: true);

        var summary = await _service.GetInboxSummaryAsync();

        Assert.Equal(5, summary.Total);
        Assert.Equal(4, summary.ToDo);
        Assert.Equal(1, summary.Saved);
        Assert.Equal(1, summary.NeedsAttention);
        Assert.Equal(1, summary.ReviewRequests);
        Assert.Equal(1, summary.Mentions);
        Assert.Equal(1, summary.MyPullRequests);
        Assert.Equal(1, summary.AdoItems);
        Assert.Equal(2, summary.GithubItems);
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

    [Fact(DisplayName = "ListInboxItemsAsync should default to most-recently-active-first when no sort is requested")]
    public async Task ListInboxItemsAsyncShouldDefaultToActivityDescAsync()
    {
        var oldest = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, activityAt: DateTimeOffset.UtcNow.AddMinutes(-10));
        var newest = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, activityAt: DateTimeOffset.UtcNow.AddMinutes(-1));

        var result = await _service.ListInboxItemsAsync(0, 10, null, null, null, null);

        Assert.Equal([newest.Id, oldest.Id], result.Items.Select(i => i.Id).ToArray());
    }

    [Fact(DisplayName = "ListInboxItemsAsync should sort by activity ascending when requested")]
    public async Task ListInboxItemsAsyncShouldSortByActivityAscAsync()
    {
        var oldest = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, activityAt: DateTimeOffset.UtcNow.AddMinutes(-10));
        var newest = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, activityAt: DateTimeOffset.UtcNow.AddMinutes(-1));

        var result = await _service.ListInboxItemsAsync(0, 10, null, null, null, null, GeneratedInboxSort.ActivityAsc);

        Assert.Equal([oldest.Id, newest.Id], result.Items.Select(i => i.Id).ToArray());
    }

    [Fact(DisplayName = "ListInboxItemsAsync should sort by priority descending when requested")]
    public async Task ListInboxItemsAsyncShouldSortByPriorityDescAsync()
    {
        var low = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, priority: Priority.Low);
        var critical = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, priority: Priority.Critical);
        var medium = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, priority: Priority.Medium);

        var result = await _service.ListInboxItemsAsync(0, 10, null, null, null, null, GeneratedInboxSort.PriorityDesc);

        Assert.Equal([critical.Id, medium.Id, low.Id], result.Items.Select(i => i.Id).ToArray());
    }

    [Fact(DisplayName = "ListInboxItemsAsync should sort by created date descending when requested")]
    public async Task ListInboxItemsAsyncShouldSortByCreatedDescAsync()
    {
        var older = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, createdAt: DateTimeOffset.UtcNow.AddDays(-2));
        var newer = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, createdAt: DateTimeOffset.UtcNow.AddDays(-1));

        var result = await _service.ListInboxItemsAsync(0, 10, null, null, null, null, GeneratedInboxSort.CreatedDesc);

        Assert.Equal([newer.Id, older.Id], result.Items.Select(i => i.Id).ToArray());
    }

    [Fact(DisplayName = "BulkUpdateInboxItemsAsync should mark only the requested items done, scoped to the current user")]
    public async Task BulkUpdateInboxItemsAsyncShouldMarkRequestedItemsDoneAsync()
    {
        var first = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);
        var second = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);
        var untouched = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);
        var otherUsersItem = await AddItemAsync(_otherUser.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);

        await _service.BulkUpdateInboxItemsAsync([first.Id, second.Id, otherUsersItem.Id], isDone: true, isSaved: null);

        var states = await DataBase.InboxItems.AsNoTracking().Include(i => i.State)
            .Where(i => i.Id == first.Id || i.Id == second.Id || i.Id == untouched.Id || i.Id == otherUsersItem.Id)
            .ToDictionaryAsync(i => i.Id, i => i.State.IsDone);

        Assert.True(states[first.Id]);
        Assert.True(states[second.Id]);
        Assert.False(states[untouched.Id]);
        // Belongs to another user — must be left untouched even though its id was included in the request.
        Assert.False(states[otherUsersItem.Id]);
    }

    [Fact(DisplayName = "BulkUpdateInboxItemsAsync should update isSaved and isDone independently when only one is provided")]
    public async Task BulkUpdateInboxItemsAsyncShouldUpdateOnlyProvidedFlagsAsync()
    {
        var item = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isDone: true, isSaved: false);

        await _service.BulkUpdateInboxItemsAsync([item.Id], isDone: null, isSaved: true);

        var reloaded = await DataBase.InboxItems.AsNoTracking().Include(i => i.State).SingleAsync(i => i.Id == item.Id);
        Assert.True(reloaded.State.IsSaved);
        // isDone was not part of this request — must remain whatever it was before.
        Assert.True(reloaded.State.IsDone);
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

    [Fact(DisplayName = "SyncAttachedNotesStateAsync should mark a note's inbox item done+closed once its target item is closed (e.g. PR merged)")]
    public async Task SyncAttachedNotesStateAsyncShouldMarkAttachedNoteDoneAndClosedAsync()
    {
        var prItem = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isDone: false, isClosed: false);
        var attachedNote = await AddNoteAsync(_user.Id, attachedToInboxItemId: prItem.Id);
        var standaloneNote = await AddNoteAsync(_user.Id, attachedToInboxItemId: null);

        // Simulate the PR getting merged/closed during a sync.
        prItem.State.IsDone = true;
        prItem.State.IsClosed = true;

        await _inboxItemRepository.SyncAttachedNotesStateAsync([prItem]);

        var reloadedAttachedNoteEnvelope = await DataBase.InboxItems.AsNoTracking().Include(i => i.State).SingleAsync(i => i.Id == attachedNote.InboxItemId);
        Assert.True(reloadedAttachedNoteEnvelope.State.IsDone);
        Assert.True(reloadedAttachedNoteEnvelope.State.IsClosed);

        // A standalone note (not attached to the PR) must be unaffected.
        var reloadedStandaloneNoteEnvelope = await DataBase.InboxItems.AsNoTracking().Include(i => i.State).SingleAsync(i => i.Id == standaloneNote.InboxItemId);
        Assert.False(reloadedStandaloneNoteEnvelope.State.IsDone);
        Assert.False(reloadedStandaloneNoteEnvelope.State.IsClosed);
    }

    [Fact(DisplayName = "SyncAttachedNotesStateAsync should reopen a note's inbox item when its target item is reopened")]
    public async Task SyncAttachedNotesStateAsyncShouldReopenAttachedNoteWhenParentReopensAsync()
    {
        var prItem = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored, isDone: true, isClosed: true);
        var attachedNote = await AddNoteAsync(_user.Id, attachedToInboxItemId: prItem.Id);
        attachedNote.InboxItem.State.IsDone = true;
        attachedNote.InboxItem.State.IsClosed = true;
        await DataBase.SaveChangesAsync();

        // Simulate the PR getting reopened during a sync.
        prItem.State.IsDone = false;
        prItem.State.IsClosed = false;

        await _inboxItemRepository.SyncAttachedNotesStateAsync([prItem]);

        var reloadedAttachedNoteEnvelope = await DataBase.InboxItems.AsNoTracking().Include(i => i.State).SingleAsync(i => i.Id == attachedNote.InboxItemId);
        Assert.False(reloadedAttachedNoteEnvelope.State.IsDone);
        Assert.False(reloadedAttachedNoteEnvelope.State.IsClosed);
    }

    [Fact(DisplayName = "DeleteInboxItemsBySourceAsync should remove items for the given source, along with any attached notes")]
    public async Task DeleteInboxItemsBySourceAsyncShouldRemoveItemsAndAttachedNotesAsync()
    {
        var githubItem = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);
        var otherGithubItem = await AddItemAsync(_user.Id, ItemSource.GitHub, ItemType.Issue, InboxReason.Mentioned);
        var adoItem = await AddItemAsync(_user.Id, ItemSource.Ado, ItemType.WorkItem, InboxReason.Assigned);
        var otherUserGithubItem = await AddItemAsync(_otherUser.Id, ItemSource.GitHub, ItemType.PR, InboxReason.Authored);

        var attachedNote = await AddNoteAsync(_user.Id, attachedToInboxItemId: githubItem.Id);
        var standaloneNote = await AddNoteAsync(_user.Id, attachedToInboxItemId: null);

        await _service.DeleteInboxItemsBySourceAsync(_user.Id, ItemSource.GitHub, organization: null, CancellationToken.None);

        var remainingItemIds = await DataBase.InboxItems.AsNoTracking().Select(i => i.Id).ToListAsync();
        Assert.DoesNotContain(githubItem.Id, remainingItemIds);
        Assert.DoesNotContain(otherGithubItem.Id, remainingItemIds);
        Assert.Contains(adoItem.Id, remainingItemIds);
        Assert.Contains(otherUserGithubItem.Id, remainingItemIds);

        // The note attached to the deleted GitHub item must be gone entirely — both the Note row and
        // its own InboxItem envelope — not merely detached via AttachedToInboxItemId being nulled out.
        var remainingNoteIds = await DataBase.Notes.AsNoTracking().Select(n => n.Id).ToListAsync();
        Assert.DoesNotContain(attachedNote.Id, remainingNoteIds);
        Assert.DoesNotContain(attachedNote.InboxItemId, remainingItemIds);
        Assert.Contains(standaloneNote.Id, remainingNoteIds);
        Assert.Contains(standaloneNote.InboxItemId, remainingItemIds);
    }

    private async Task<Note> AddNoteAsync(long inboxId, long? attachedToInboxItemId)
    {
        var envelope = new InboxItem
        {
            InboxId = inboxId,
            Source = ItemSource.Note,
            Type = ItemType.Note,
            Reason = InboxReason.Note,
            Title = "Test note",
            ActivityAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState { UpdatedAt = DateTimeOffset.UtcNow }
        };
        await DataBase.InboxItems.AddAsync(envelope);
        await DataBase.SaveChangesAsync();

        var note = new Note
        {
            InboxItemId = envelope.Id,
            InboxItem = envelope,
            AttachedToInboxItemId = attachedToInboxItemId,
            Title = "Note title",
            Body = "Note body",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        await DataBase.Notes.AddAsync(note);
        await DataBase.SaveChangesAsync();
        return note;
    }
}
