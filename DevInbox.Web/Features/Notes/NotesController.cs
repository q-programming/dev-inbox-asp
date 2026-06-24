using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Notes;

public class NotesController : INotesBaseController, IComponent
{
    public Task<ICollection<NoteDto>> ListNotesAsync()
    {
        throw new ServiceNotImplementedException();
    }

    public Task<NoteDto> CreateNoteAsync(CreateNoteRequest note)
    {
        throw new ServiceNotImplementedException();
    }

    public Task<NoteDto> UpdateNoteAsync(System.Guid id, CreateNoteRequest note)
    {
        throw new ServiceNotImplementedException();
    }

    public Task DeleteNoteAsync(System.Guid id)
    {
        throw new ServiceNotImplementedException();
    }
}
