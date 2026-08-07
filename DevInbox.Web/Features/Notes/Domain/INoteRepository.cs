namespace DevInbox.Web.Features.Notes.Domain;

public interface INoteRepository : IRepository<Note>
{
    /// <summary>Notes attached to a specific inbox item (e.g. annotations on a GitHub PR or ADO work item).</summary>
    Task<IEnumerable<Note>> GetAttachedToAsync(long inboxItemId);

    /// <summary>The note behind a given InboxItem envelope (Source/Type = Note). Used by NoteDetailsProvider
    /// to hydrate InboxItemDetail.Note when the generic /inbox/item/{id} endpoint is resolving a note.</summary>
    Task<Note?> GetByInboxItemIdAsync(long inboxItemId);
}
