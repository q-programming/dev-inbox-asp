using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;
using DomainInboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Tests.Features.Notes;

public class NoteDetailsProviderTests
{
    private readonly INotesService _notesService;
    private readonly NoteDetailsProvider _provider;

    public NoteDetailsProviderTests()
    {
        _notesService = Substitute.For<INotesService>();
        _provider = new NoteDetailsProvider(_notesService);
    }

    [Fact(DisplayName = "Source should be Note")]
    public void SourceShouldBeNote()
    {
        Assert.Equal(DomainItemSource.Note, _provider.Source);
    }

    [Fact(DisplayName = "PopulateAsync should set dto.Note when note exists")]
    public async Task PopulateAsyncShouldHydrateNoteAsync()
    {
        var item = BuildInboxItem(15, 42, "Envelope title");
        var dto = new InboxItemDetail { Id = item.Id, Title = item.Title };
        var note = BuildNote(item, BuildInboxItem(300, 42, "Linked item"));
        _notesService.GetByInboxItemIdAsync(item.Id).Returns(note);

        await _provider.PopulateAsync(item, dto);

        Assert.NotNull(dto.Note);
        Assert.Equal(note.Id, dto.Note.NoteId);
        Assert.Equal(note.InboxItemId, dto.Note.InboxItemId);
        Assert.Equal(note.Title, dto.Note.Title);
        Assert.Equal(note.InboxItem.State.Tags, dto.Note.Tags);
        Assert.Equal(note.InboxItem.State.FollowUpAt, dto.Note.FollowUpAt);
        Assert.NotNull(dto.Note.LinkedItem);
        Assert.Equal(note.AttachedToInboxItemId!.Value.ToString(), dto.Note.LinkedItem.Id);
        Assert.Equal("Linked item", dto.Note.LinkedItem.Title);
    }

    [Fact(DisplayName = "PopulateAsync should leave dto.Note null when service returns null")]
    public async Task PopulateAsyncShouldLeaveDtoNoteNullWhenMissingAsync()
    {
        var item = BuildInboxItem(15, 42, "Envelope title");
        var dto = new InboxItemDetail { Id = item.Id, Title = item.Title };
        _notesService.GetByInboxItemIdAsync(item.Id).Returns((Note?)null);

        await _provider.PopulateAsync(item, dto);

        Assert.Null(dto.Note);
    }

    private static InboxItem BuildInboxItem(long id, long inboxId, string title)
    {
        var now = DateTimeOffset.UtcNow;
        return new InboxItem
        {
            Id = id,
            InboxId = inboxId,
            Source = DomainItemSource.Note,
            Type = DomainItemType.Note,
            Reason = DomainInboxReason.Note,
            ExternalId = $"ext-{id}",
            Title = title,
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = new InboxItemState { UpdatedAt = now }
        };
    }

    private static Note BuildNote(InboxItem envelope, InboxItem linkedItem)
    {
        var now = DateTimeOffset.UtcNow;
        envelope.State.Tags = ["a", "b"];
        envelope.State.FollowUpAt = now.AddDays(1);

        return new Note
        {
            Id = 9,
            InboxItemId = envelope.Id,
            InboxItem = envelope,
            Title = "Note title",
            Body = "Note body",
            CreatedAt = now,
            UpdatedAt = now,
            AttachedToInboxItemId = linkedItem.Id,
            AttachedToInboxItem = linkedItem
        };
    }
}
