using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Notes;

public class NotesController : INotesBaseController, IComponent
{
    public Task<System.Collections.Generic.ICollection<NoteDto>> ListNotesAsync()
        => throw new NotImplementedException();

    public Task<NoteDto> CreateNoteAsync(CreateNoteRequest note)
        => throw new NotImplementedException();

    public Task<NoteDto> UpdateNoteAsync(System.Guid id, CreateNoteRequest note)
        => throw new NotImplementedException();

    public Task DeleteNoteAsync(System.Guid id)
        => throw new NotImplementedException();
}
