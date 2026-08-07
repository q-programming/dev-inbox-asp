using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Notes;

/// <summary>
/// Hydrates InboxItemDetail.Note when the generic /inbox/item/{id} endpoint resolves an item whose
/// Source is Note. Unlike GitHub/ADO providers, this doesn't call out to an external API — the note
/// content is already the source of truth in our own database, so it's fetched straight through
/// INotesService (the same service NotesController uses).
/// </summary>
public class NoteDetailsProvider(INotesService notesService) : IInboxDetailProvider, IService
{
    private readonly NotesMapper _mapper = new();

    public Inbox.Domain.ItemSource Source => Inbox.Domain.ItemSource.Note;

    public async Task PopulateAsync(InboxItem item, InboxItemDetail dto, CancellationToken cancellationToken = default)
    {
        var note = await notesService.GetByInboxItemIdAsync(item.Id);
        if (note is null)
        {
            return;
        }

        dto.Note = _mapper.ToDetail(note);
    }
}

