using System.Security.Claims;
using DevInbox.Web.Common;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;

namespace DevInbox.Web.Tests.Features.Notes;

public class NotesServiceIT : DatabaseIntegrationTest
{
    private User _user = default!;
    private User _otherUser = default!;
    private NotesService _service = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        _user = new User { FirstName = "Jan", LastName = "Kowalski", Email = "jan-notes@example.com", Password = "hashed" };
        _otherUser = new User { FirstName = "Anna", LastName = "Nowak", Email = "anna-notes@example.com", Password = "hashed" };
        await DataBase.Users.AddRangeAsync(_user, _otherUser);
        await DataBase.SaveChangesAsync();

        await DataBase.Inboxes.AddRangeAsync(
            new InboxEntity { UserId = _user.Id, SyncStatus = SyncStatus.Idle, Version = 0, LastUpdatedAt = DateTimeOffset.UtcNow },
            new InboxEntity { UserId = _otherUser.Id, SyncStatus = SyncStatus.Idle, Version = 0, LastUpdatedAt = DateTimeOffset.UtcNow });
        await DataBase.SaveChangesAsync();

        _service = new NotesService(new NoteRepository(DataBase), CreateAccessorWithClaim(_user.Id));
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

    [Fact(DisplayName = "CreateNoteAsync should persist standalone note with note inbox item envelope")]
    public async Task CreateNoteAsyncShouldPersistStandaloneNoteAsync()
    {
        var followUpAt = DateTimeOffset.UtcNow.AddDays(2);
        var tags = new[] { "todo", "urgent" };

        var created = await _service.CreateNoteAsync("Standalone", "Body text", tags, followUpAt);

        Assert.True(created.Id > 0);
        Assert.True(created.InboxItemId > 0);

        var persisted = await DataBase.Notes
            .Include(note => note.InboxItem)
            .ThenInclude(item => item.State)
            .SingleAsync(note => note.Id == created.Id);

        Assert.Equal("Standalone", persisted.Title);
        Assert.Equal("Body text", persisted.Body);
        Assert.Null(persisted.AttachedToInboxItemId);
        Assert.Equal(_user.Id, persisted.InboxItem.InboxId);
        Assert.Equal(ItemSource.Note, persisted.InboxItem.Source);
        Assert.Equal(ItemType.Note, persisted.InboxItem.Type);
        Assert.Equal(InboxReason.Note, persisted.InboxItem.Reason);
        Assert.True(persisted.InboxItem.State.Tags.SequenceEqual(tags));
        Assert.Equal(followUpAt, persisted.InboxItem.State.FollowUpAt);
    }

    [Fact(DisplayName = "CreateNoteAsync should persist attached note and GetAttachedNoteAsync should retrieve it")]
    public async Task CreateNoteAsyncShouldPersistAndFetchAttachedNoteAsync()
    {
        var target = await AddTargetInboxItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, "Target PR");

        var created = await _service.CreateNoteAsync("Attached", "Body", ["a"], null, target.Id);
        var fetched = await _service.GetAttachedNoteAsync(target.Id);

        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched!.Id);
        Assert.Equal(target.Id, fetched.AttachedToInboxItemId);
    }

    [Fact(DisplayName = "CreateNoteAsync should enforce one-note-per-attached-item and throw ConflictException")]
    public async Task CreateNoteAsyncShouldThrowConflictWhenSecondAttachmentIsCreatedAsync()
    {
        var target = await AddTargetInboxItemAsync(_user.Id, ItemSource.Ado, ItemType.WorkItem, "Target work item");
        _ = await _service.CreateNoteAsync("First", null, null, null, target.Id);

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateNoteAsync("Second", null, null, null, target.Id));
    }

    [Fact(DisplayName = "UpdateNoteAsync should persist note fields and inbox state overlay updates")]
    public async Task UpdateNoteAsyncShouldPersistChangesAsync()
    {
        var created = await _service.CreateNoteAsync("Original", "Old body", ["old"], DateTimeOffset.UtcNow.AddDays(1));
        var newFollowUpAt = DateTimeOffset.UtcNow.AddDays(5);

        var updated = await _service.UpdateNoteAsync(created.Id, "Updated", "New body", ["x", "y"], newFollowUpAt);

        Assert.Equal("Updated", updated.Title);

        var reloaded = await DataBase.Notes
            .Include(note => note.InboxItem)
            .ThenInclude(item => item.State)
            .SingleAsync(note => note.Id == created.Id);
        Assert.Equal("Updated", reloaded.Title);
        Assert.Equal("New body", reloaded.Body);
        Assert.Equal("Updated", reloaded.InboxItem.Title);
        Assert.True(reloaded.InboxItem.State.Tags.SequenceEqual(["x", "y"]));
        Assert.Equal(newFollowUpAt, reloaded.InboxItem.State.FollowUpAt);
    }

    [Fact(DisplayName = "DeleteNoteAsync should remove note row and its inbox envelope")]
    public async Task DeleteNoteAsyncShouldRemoveNoteAndEnvelopeAsync()
    {
        var created = await _service.CreateNoteAsync("To delete", "Body", null, null);

        await _service.DeleteNoteAsync(created.Id);

        Assert.False(await DataBase.Notes.AnyAsync(note => note.Id == created.Id));
        Assert.False(await DataBase.InboxItems.AnyAsync(item => item.Id == created.InboxItemId));
        Assert.False(await DataBase.InboxItemStates.AnyAsync(state => state.InboxItemId == created.InboxItemId));
    }

    [Fact(DisplayName = "DeleteNoteAsync should not delete the target inbox item for attached notes")]
    public async Task DeleteNoteAsyncShouldNotDeleteAttachedTargetItemAsync()
    {
        var target = await AddTargetInboxItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, "Target PR");
        var created = await _service.CreateNoteAsync("Attached", "Body", null, null, target.Id);

        await _service.DeleteNoteAsync(created.Id);

        Assert.False(await DataBase.Notes.AnyAsync(note => note.Id == created.Id));
        Assert.False(await DataBase.InboxItems.AnyAsync(item => item.Id == created.InboxItemId));
        Assert.True(await DataBase.InboxItems.AnyAsync(item => item.Id == target.Id));
    }

    [Fact(DisplayName = "GetByInboxItemIdAsync should throw UnauthorizedAccessException for foreign user's note")]
    public async Task GetByInboxItemIdAsyncShouldThrowForForeignNoteAsync()
    {
        var foreignNoteEnvelope = await AddTargetInboxItemAsync(_otherUser.Id, ItemSource.Note, ItemType.Note, "Foreign envelope");
        var now = DateTimeOffset.UtcNow;
        await DataBase.Notes.AddAsync(new Note
        {
            Title = "Foreign",
            Body = "Secret",
            CreatedAt = now,
            UpdatedAt = now,
            InboxItemId = foreignNoteEnvelope.Id,
            InboxItem = foreignNoteEnvelope
        });
        await DataBase.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.GetByInboxItemIdAsync(foreignNoteEnvelope.Id));
    }

    [Fact(DisplayName = "Deleting attached target inbox item should SetNull on note.AttachedToInboxItemId")]
    public async Task DeletingAttachedTargetShouldSetNullOnAttachmentFkAsync()
    {
        var target = await AddTargetInboxItemAsync(_user.Id, ItemSource.GitHub, ItemType.PR, "Target PR");
        var created = await _service.CreateNoteAsync("Attached", "Body", null, null, target.Id);

        await DataBase.InboxItems.Where(item => item.Id == target.Id).ExecuteDeleteAsync();

        var reloaded = await DataBase.Notes.AsNoTracking().SingleAsync(note => note.Id == created.Id);
        Assert.Null(reloaded.AttachedToInboxItemId);
    }

    private async Task<InboxItem> AddTargetInboxItemAsync(long inboxId, ItemSource source, ItemType type, string title)
    {
        var now = DateTimeOffset.UtcNow;
        var item = new InboxItem
        {
            InboxId = inboxId,
            Source = source,
            Type = type,
            Reason = InboxReason.Assigned,
            ExternalId = Guid.NewGuid().ToString("N")[..8],
            Title = title,
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = new InboxItemState
            {
                UpdatedAt = now
            }
        };
        await DataBase.InboxItems.AddAsync(item);
        await DataBase.SaveChangesAsync();
        return item;
    }

    private static IHttpContextAccessor CreateAccessorWithClaim(long userId)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "TestAuth");
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return accessor;
    }
}
