using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.Notes.Domain;

public class NoteRepository(AppDbContext db) : Repository<Note>(db), INoteRepository
{
    /// <summary>Overrides the base FindAsync-based lookup to eagerly load the InboxItem envelope and its
    /// state — callers (e.g. NotesService.UpdateNoteAsync) rely on that graph being populated.</summary>
    public override async Task<Note> GetByIdAsync(long id)
    {
        return await Set
            .Include(note => note.InboxItem)
            .ThenInclude(item => item.State)
            .FirstOrDefaultAsync(note => note.Id == id)
            ?? throw new KeyNotFoundException($"{nameof(Note)} {id} not found");
    }

    public async Task<IEnumerable<Note>> GetAttachedToAsync(long inboxItemId)
    {
        return await Set
            .Include(note => note.InboxItem)
            .ThenInclude(item => item.State)
            .Where(note => note.AttachedToInboxItemId == inboxItemId)
            .OrderByDescending(note => note.UpdatedAt)
            .ToListAsync();
    }

    public Task<Note?> GetByInboxItemIdAsync(long inboxItemId)
    {
        return Set
            .Include(note => note.InboxItem)
            .ThenInclude(item => item.State)
            .Include(note => note.AttachedToInboxItem)
            .FirstOrDefaultAsync(note => note.InboxItemId == inboxItemId);
    }

    /// <summary>Deletes the note and its owned inbox envelope in one transaction so note items never
    /// linger in /inbox after deletion. The inbox envelope is the aggregate root for list/detail views;
    /// removing it also cascades state cleanup and prevents stale note detail lookups.</summary>
    public override async Task DeleteAsync(Note entity)
    {
        Context.InboxItems.Remove(entity.InboxItem);
        await Context.SaveChangesAsync();
    }
}
