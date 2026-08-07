using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Notes.Mapper;

[Mapper]
public partial class NotesMapper
{
    /// <summary>Applies mutable fields from an incoming create/update request onto an existing or new note.
    /// Id/InboxItem*/AttachedToInboxItem* must stay untouched here — they are set only at creation.</summary>
    [MapperIgnoreTarget(nameof(Note.Id))]
    [MapperIgnoreTarget(nameof(Note.InboxItemId))]
    [MapperIgnoreTarget(nameof(Note.InboxItem))]
    [MapperIgnoreTarget(nameof(Note.AttachedToInboxItemId))]
    [MapperIgnoreTarget(nameof(Note.AttachedToInboxItem))]
    [MapperIgnoreTarget(nameof(Note.CreatedAt))]
    [MapperIgnoreTarget(nameof(Note.UpdatedAt))]
    [MapperIgnoreSource(nameof(CreateNoteRequest.Tags))]
    [MapperIgnoreSource(nameof(CreateNoteRequest.FollowUpAt))]
    public partial void UpdateFromRequest(CreateNoteRequest request, Note target);

    /// <summary>Maps a Note to NoteDetail — the single shape returned both standalone (POST/PUT /notes)
    /// and nested under InboxItemDetail.note (via NoteDetailsProvider). Tags/FollowUpAt are pulled from
    /// the note's own InboxItemState; when nested under InboxItemDetail those values are also present a
    /// level up, which is an accepted duplication in exchange for NoteDetail being self-sufficient
    /// standalone. AttachedToInboxItem is projected into LinkedItem (singular — a note attaches to at
    /// most one item, per AttachedToInboxItemId being a single nullable FK) through MapAttachedItem
    /// below — Mapperly picks that method up automatically since its signature (InboxItem? -> LinkedItem?)
    /// matches what's needed for that member, so no manual object construction is required in callers.</summary>
    [MapProperty(nameof(Note.Id), nameof(NoteDetail.NoteId))]
    [MapProperty(nameof(Note.InboxItemId), nameof(NoteDetail.InboxItemId))]
    [MapProperty(nameof(Note.AttachedToInboxItem), nameof(NoteDetail.LinkedItem))]
    [MapProperty($"{nameof(Note.InboxItem)}.{nameof(InboxItem.State)}.{nameof(InboxItemState.Tags)}", nameof(NoteDetail.Tags))]
    [MapProperty($"{nameof(Note.InboxItem)}.{nameof(InboxItem.State)}.{nameof(InboxItemState.FollowUpAt)}", nameof(NoteDetail.FollowUpAt))]
    [MapperIgnoreSource(nameof(Note.AttachedToInboxItemId))]
    public partial NoteDetail ToDetail(Note note);

    private static LinkedItem? MapAttachedItem(InboxItem? item) =>
        item is null
            ? null
            : new LinkedItem { Id = item.Id.ToString(), Title = item.Title, Type = item.Source.ToString() };
}
