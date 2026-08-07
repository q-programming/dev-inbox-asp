using DevInbox.Web.Features.Notes.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Notes;

// Notes are inbox items — browse/list them via GET /inbox/items?source=Note or GET /inbox/item/{id}
// (see NoteDetailsProvider). This controller only covers note-specific write actions.
public class NotesController(INotesService notesService) : INotesBaseController, IComponent
{
    private readonly NotesMapper _mapper = new();

    public async Task<NoteDetail> CreateNoteAsync(CreateNoteRequest note)
    {
        var createdNote = await notesService.CreateNoteAsync(
            note.Title,
            note.Body,
            note.Tags,
            note.FollowUpAt,
            note.AttachedToInboxItemId);
        return _mapper.ToDetail(createdNote);
    }

    public async Task<NoteDetail> UpdateNoteAsync(long id, CreateNoteRequest note)
    {
        var updatedNote = await notesService.UpdateNoteAsync(id, note.Title, note.Body, note.Tags, note.FollowUpAt);
        return _mapper.ToDetail(updatedNote);
    }

    public Task DeleteNoteAsync(long id)
    {
        return notesService.DeleteNoteAsync(id);
    }
}
