using DevInbox.Web.Features.Notes.Domain;

namespace DevInbox.Web.Features.Notes;

public interface INotesService
{
    /// <param name="attachedToInboxItemId">Optional target inbox item (GitHub PR, ADO work item, ...) this note annotates. Null creates a standalone note.</param>
    Task<Note> CreateNoteAsync(string title, string? body, IEnumerable<string>? tags, DateTimeOffset? followUpAt, long? attachedToInboxItemId = null);
    Task<Note> UpdateNoteAsync(long id, string title, string? body, IEnumerable<string>? tags, DateTimeOffset? followUpAt);
    Task DeleteNoteAsync(long id);

    /// <summary>Looks up the note behind a given InboxItem envelope. Used by NoteDetailsProvider.</summary>
    Task<Note?> GetByInboxItemIdAsync(long inboxItemId);

    /// <summary>The single note (if any) attached to another inbox item (e.g. a GitHub PR or ADO work
    /// item). Used by InboxDetailService to hydrate InboxItemDetail.AttachedNote for any item type.</summary>
    Task<Note?> GetAttachedNoteAsync(long inboxItemId);
}
