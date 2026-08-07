using System.Security.Claims;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes.Domain;

namespace DevInbox.Web.Features.Notes;

public class NotesService(INoteRepository repository, IHttpContextAccessor httpContextAccessor) : IService, INotesService
{
    public async Task<Note> CreateNoteAsync(string title, string? body, IEnumerable<string>? tags, DateTimeOffset? followUpAt, long? attachedToInboxItemId = null)
    {
        var userId = GetCurrentUserId();
        var now = DateTimeOffset.UtcNow;

        if (attachedToInboxItemId.HasValue)
        {
            var existing = await repository.GetAttachedToAsync(attachedToInboxItemId.Value);
            if (existing.Any())
            {
                throw new ConflictException($"Inbox item {attachedToInboxItemId} already has a note attached.");
            }
        }


        // Every note owns its own inbox envelope so it's filterable/sortable/pinnable like any other
        // inbox item. InboxId == the user's Inbox (Inbox.UserId is its PK) — no need to load it.
        var inboxItem = new InboxItem
        {
            InboxId = userId,
            Source = ItemSource.Note,
            Type = ItemType.Note,
            Title = title,
            Reason = InboxReason.Note,
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = new InboxItemState
            {
                Tags = tags?.ToArray() ?? [],
                FollowUpAt = followUpAt,
                UpdatedAt = now,
            },
        };

        var note = new Note
        {
            Title = title,
            Body = body,
            CreatedAt = now,
            UpdatedAt = now,
            InboxItem = inboxItem,
            AttachedToInboxItemId = attachedToInboxItemId,
        };

        await repository.AddAsync(note);
        return note;
    }

    public async Task<Note> UpdateNoteAsync(long id, string title, string? body, IEnumerable<string>? tags, DateTimeOffset? followUpAt)
    {
        var userId = GetCurrentUserId();
        var note = await repository.GetByIdAsync(id) ?? throw new NotFoundException($"Note with ID {id} not found.");
        if (note.InboxItem.InboxId != userId)
        {
            throw new UnauthorizedAccessException($"User {userId} is not authorized to update note {id}.");
        }
        var now = DateTimeOffset.UtcNow;

        note.Title = title;
        note.Body = body;
        note.UpdatedAt = now;
        note.InboxItem.Title = title;
        note.InboxItem.UpdatedAt = now;
        note.InboxItem.State.Tags = tags?.ToArray() ?? [];
        note.InboxItem.State.FollowUpAt = followUpAt;
        note.InboxItem.State.UpdatedAt = now;

        await repository.UpdateAsync(note);
        return note;
    }

    public async Task DeleteNoteAsync(long id)
    {
        var userId = GetCurrentUserId();
        var note = await repository.GetByIdAsync(id) ?? throw new NotFoundException($"Note with ID {id} not found.");
        if (note.InboxItem.InboxId != userId)
        {
            throw new UnauthorizedAccessException($"User {userId} is not authorized to delete note {id}.");
        }
        await repository.DeleteAsync(note);
    }

    public async Task<Note?> GetByInboxItemIdAsync(long inboxItemId)
    {
        var userId = GetCurrentUserId();
        var note = await repository.GetByInboxItemIdAsync(inboxItemId) ?? throw new NotFoundException($"Note with InboxItemId {inboxItemId} not found.");
        return note.InboxItem.InboxId != userId
            ? throw new UnauthorizedAccessException($"User {userId} is not authorized to access note with InboxItemId {inboxItemId}.")
            : note;
    }

    public async Task<Note?> GetAttachedNoteAsync(long inboxItemId)
    {
        var userId = GetCurrentUserId();
        var note = (await repository.GetAttachedToAsync(inboxItemId)).FirstOrDefault();
        return note is null || note.InboxItem.InboxId != userId ? null : note;
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userIdClaim)
            ? throw new UnauthorizedException("User ID claim not found in the current context.")
            : long.Parse(userIdClaim);
    }
}
