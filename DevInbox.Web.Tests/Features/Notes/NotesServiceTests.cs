using System.Security.Claims;
using DevInbox.Web.Common;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes;
using DevInbox.Web.Features.Notes.Domain;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Notes;

public class NotesServiceTests
{
    private const long UserId = 42;
    private const long OtherUserId = 99;

    private readonly INoteRepository _repository;
    private readonly NotesService _service;

    public NotesServiceTests()
    {
        _repository = Substitute.For<INoteRepository>();
        _service = new NotesService(_repository, CreateAccessorWithClaim(UserId));
    }

    [Fact(DisplayName = "CreateNoteAsync should create standalone note with inbox envelope and persist it")]
    public async Task CreateNoteAsyncShouldPersistStandaloneNoteAsync()
    {
        var followUpAt = DateTimeOffset.UtcNow.AddDays(2);
        var tags = new[] { "todo", "urgent" };

        var result = await _service.CreateNoteAsync("My note", "Body", tags, followUpAt);

        await _repository.Received(1).AddAsync(Arg.Is<Note>(note =>
            note.Title == "My note" &&
            note.Body == "Body" &&
            note.AttachedToInboxItemId == null &&
            note.InboxItem.InboxId == UserId &&
            note.InboxItem.Source == ItemSource.Note &&
            note.InboxItem.Type == ItemType.Note &&
            note.InboxItem.Reason == InboxReason.Note &&
            note.InboxItem.State.FollowUpAt == followUpAt &&
            note.InboxItem.State.Tags.SequenceEqual(tags)));

        Assert.Equal("My note", result.Title);
        Assert.Equal("Body", result.Body);
        Assert.Equal(ItemSource.Note, result.InboxItem.Source);
    }

    [Fact(DisplayName = "CreateNoteAsync should attach note to target item when attachment id is provided")]
    public async Task CreateNoteAsyncShouldPersistAttachedNoteAsync()
    {
        const long attachedToInboxItemId = 123;
        _repository.GetAttachedToAsync(attachedToInboxItemId).Returns([]);

        var result = await _service.CreateNoteAsync("Attached note", null, null, null, attachedToInboxItemId);

        await _repository.Received(1).GetAttachedToAsync(attachedToInboxItemId);
        await _repository.Received(1).AddAsync(Arg.Is<Note>(note =>
            note.AttachedToInboxItemId == attachedToInboxItemId));
        Assert.Equal(attachedToInboxItemId, result.AttachedToInboxItemId);
    }

    [Fact(DisplayName = "CreateNoteAsync should throw ConflictException when attached target already has a note")]
    public async Task CreateNoteAsyncShouldThrowWhenAttachmentAlreadyExistsAsync()
    {
        const long attachedToInboxItemId = 123;
        _repository.GetAttachedToAsync(attachedToInboxItemId).Returns([BuildNote(UserId)]);

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => _service.CreateNoteAsync("Duplicate", null, null, null, attachedToInboxItemId));

        Assert.Contains(attachedToInboxItemId.ToString(), ex.Message);
        await _repository.DidNotReceive().AddAsync(Arg.Any<Note>());
    }

    [Fact(DisplayName = "UpdateNoteAsync should update mutable note and inbox overlay fields")]
    public async Task UpdateNoteAsyncShouldUpdateMutableFieldsAsync()
    {
        var note = BuildNote(UserId);
        note.Id = 10;
        note.InboxItemId = 500;
        note.InboxItem.State.Tags = ["old"];
        note.InboxItem.State.FollowUpAt = DateTimeOffset.UtcNow.AddDays(-1);

        _repository.GetByIdAsync(10).Returns(note);
        var newFollowUpAt = DateTimeOffset.UtcNow.AddDays(3);
        var newTags = new[] { "new-1", "new-2" };

        var result = await _service.UpdateNoteAsync(10, "Updated title", "Updated body", newTags, newFollowUpAt);

        await _repository.Received(1).UpdateAsync(note);
        Assert.Same(note, result);
        Assert.Equal("Updated title", note.Title);
        Assert.Equal("Updated body", note.Body);
        Assert.Equal("Updated title", note.InboxItem.Title);
        Assert.Equal(newFollowUpAt, note.InboxItem.State.FollowUpAt);
        Assert.True(note.InboxItem.State.Tags.SequenceEqual(newTags));
    }

    [Fact(DisplayName = "UpdateNoteAsync should throw UnauthorizedAccessException for foreign user notes")]
    public async Task UpdateNoteAsyncShouldThrowForForeignUserAsync()
    {
        var foreignNote = BuildNote(OtherUserId);
        foreignNote.Id = 10;
        _repository.GetByIdAsync(10).Returns(foreignNote);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _service.UpdateNoteAsync(10, "Updated", "Body", ["tag"], DateTimeOffset.UtcNow));

        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Note>());
    }

    [Fact(DisplayName = "DeleteNoteAsync should delete note when it belongs to current user")]
    public async Task DeleteNoteAsyncShouldDeleteOwnedNoteAsync()
    {
        var note = BuildNote(UserId);
        note.Id = 77;
        _repository.GetByIdAsync(77).Returns(note);

        await _service.DeleteNoteAsync(77);

        await _repository.Received(1).DeleteAsync(note);
    }

    [Fact(DisplayName = "DeleteNoteAsync should throw UnauthorizedAccessException for foreign notes")]
    public async Task DeleteNoteAsyncShouldThrowForForeignUserAsync()
    {
        var foreignNote = BuildNote(OtherUserId);
        foreignNote.Id = 77;
        _repository.GetByIdAsync(77).Returns(foreignNote);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.DeleteNoteAsync(77));
        await _repository.DidNotReceive().DeleteAsync(Arg.Any<Note>());
    }

    [Fact(DisplayName = "GetByInboxItemIdAsync should return note when owned by current user")]
    public async Task GetByInboxItemIdAsyncShouldReturnOwnedNoteAsync()
    {
        var note = BuildNote(UserId);
        note.InboxItemId = 333;
        _repository.GetByInboxItemIdAsync(333).Returns(note);

        var result = await _service.GetByInboxItemIdAsync(333);

        Assert.Same(note, result);
    }

    [Fact(DisplayName = "GetByInboxItemIdAsync should throw UnauthorizedAccessException for foreign notes")]
    public async Task GetByInboxItemIdAsyncShouldThrowForForeignUserAsync()
    {
        var note = BuildNote(OtherUserId);
        note.InboxItemId = 333;
        _repository.GetByInboxItemIdAsync(333).Returns(note);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.GetByInboxItemIdAsync(333));
    }

    [Fact(DisplayName = "GetAttachedNoteAsync should return null when no attachment exists")]
    public async Task GetAttachedNoteAsyncShouldReturnNullWhenMissingAsync()
    {
        _repository.GetAttachedToAsync(222).Returns([]);

        var result = await _service.GetAttachedNoteAsync(222);

        Assert.Null(result);
    }

    [Fact(DisplayName = "GetAttachedNoteAsync should return null when attached note belongs to another user")]
    public async Task GetAttachedNoteAsyncShouldReturnNullForForeignUserAsync()
    {
        _repository.GetAttachedToAsync(222).Returns([BuildNote(OtherUserId)]);

        var result = await _service.GetAttachedNoteAsync(222);

        Assert.Null(result);
    }

    [Fact(DisplayName = "GetAttachedNoteAsync should return attached note when owned by current user")]
    public async Task GetAttachedNoteAsyncShouldReturnOwnedNoteAsync()
    {
        var note = BuildNote(UserId);
        note.AttachedToInboxItemId = 222;
        _repository.GetAttachedToAsync(222).Returns([note]);

        var result = await _service.GetAttachedNoteAsync(222);

        Assert.Same(note, result);
    }

    private static IHttpContextAccessor CreateAccessorWithClaim(long userId)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "TestAuth");
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return accessor;
    }

    private static Note BuildNote(long inboxOwnerUserId)
    {
        var now = DateTimeOffset.UtcNow;
        var state = new InboxItemState
        {
            UpdatedAt = now,
            Tags = []
        };
        var inboxItem = new InboxItem
        {
            InboxId = inboxOwnerUserId,
            Source = ItemSource.Note,
            Type = ItemType.Note,
            Reason = InboxReason.Note,
            Title = "Original title",
            ExternalId = "n-1",
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = state
        };
        return new Note
        {
            Id = 1,
            Title = "Original title",
            Body = "Original body",
            CreatedAt = now,
            UpdatedAt = now,
            InboxItem = inboxItem
        };
    }
}
