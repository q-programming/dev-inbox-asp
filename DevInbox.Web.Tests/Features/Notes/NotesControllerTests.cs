using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;
using DomainInboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Tests.Features.Notes;

public class NotesControllerTests
{
    private readonly INotesService _notesService;
    private readonly NotesController _controller;

    public NotesControllerTests()
    {
        _notesService = Substitute.For<INotesService>();
        _controller = new NotesController(_notesService);
    }

    [Fact(DisplayName = "CreateNoteAsync should forward request values to service and return mapped dto")]
    public async Task CreateNoteAsyncShouldForwardRequestAndReturnMappedDtoAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var request = new CreateNoteRequest
        {
            Title = "New note",
            Body = "Text",
            Tags = ["a", "b"],
            FollowUpAt = now.AddDays(2),
            AttachedToInboxItemId = 123
        };
        _notesService.CreateNoteAsync(
                request.Title,
                request.Body,
                request.Tags,
                request.FollowUpAt,
                request.AttachedToInboxItemId)
            .Returns(BuildNote(request.Title, request.Body, request.Tags, request.FollowUpAt, request.AttachedToInboxItemId));

        var result = await _controller.CreateNoteAsync(request);

        await _notesService.Received(1).CreateNoteAsync(
            request.Title,
            request.Body,
            request.Tags,
            request.FollowUpAt,
            request.AttachedToInboxItemId);

        Assert.Equal("New note", result.Title);
        Assert.Equal("Text", result.Body);
        Assert.Equal(["a", "b"], result.Tags);
        Assert.Equal("123", result.LinkedItem.Id);
    }

    [Fact(DisplayName = "UpdateNoteAsync should forward id and body to service and return mapped dto")]
    public async Task UpdateNoteAsyncShouldForwardAndReturnMappedDtoAsync()
    {
        var request = new CreateNoteRequest
        {
            Title = "Updated title",
            Body = "Updated body",
            Tags = ["x"],
            FollowUpAt = DateTimeOffset.UtcNow.AddHours(1)
        };
        _notesService.UpdateNoteAsync(55, request.Title, request.Body, request.Tags, request.FollowUpAt)
            .Returns(BuildNote(request.Title, request.Body, request.Tags, request.FollowUpAt, null));

        var result = await _controller.UpdateNoteAsync(55, request);

        await _notesService.Received(1).UpdateNoteAsync(55, request.Title, request.Body, request.Tags, request.FollowUpAt);
        Assert.Equal("Updated title", result.Title);
        Assert.Equal("Updated body", result.Body);
        Assert.Equal(["x"], result.Tags);
    }

    [Fact(DisplayName = "DeleteNoteAsync should forward delete command to service")]
    public async Task DeleteNoteAsyncShouldForwardDeleteCommandAsync()
    {
        await _controller.DeleteNoteAsync(88);
        await _notesService.Received(1).DeleteNoteAsync(88);
    }

    private static Note BuildNote(string title, string? body, IEnumerable<string>? tags, DateTimeOffset? followUpAt, long? attachedToInboxItemId)
    {
        var now = DateTimeOffset.UtcNow;
        var attachedItem = attachedToInboxItemId.HasValue
            ? new InboxItem
            {
                Id = attachedToInboxItemId.Value,
                InboxId = 42,
                Source = DomainItemSource.GitHub,
                Type = DomainItemType.PR,
                Reason = DomainInboxReason.ReviewRequested,
                ExternalId = "pr-1",
                Title = "Target PR",
                ActivityAt = now,
                CreatedAt = now,
                UpdatedAt = now,
                State = new InboxItemState { UpdatedAt = now }
            }
            : null;

        var inboxItem = new InboxItem
        {
            Id = 501,
            InboxId = 42,
            Source = DomainItemSource.Note,
            Type = DomainItemType.Note,
            Reason = DomainInboxReason.Note,
            ExternalId = "note-1",
            Title = title,
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = new InboxItemState
            {
                UpdatedAt = now,
                Tags = tags?.ToArray() ?? [],
                FollowUpAt = followUpAt
            }
        };

        return new Note
        {
            Id = 77,
            Title = title,
            Body = body,
            CreatedAt = now,
            UpdatedAt = now,
            InboxItem = inboxItem,
            AttachedToInboxItemId = attachedToInboxItemId,
            AttachedToInboxItem = attachedItem
        };
    }
}
