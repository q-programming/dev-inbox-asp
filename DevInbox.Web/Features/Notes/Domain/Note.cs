using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Features.Notes.Domain;

/// <summary>
/// A personal note. Every note owns exactly one <see cref="InboxItem"/> envelope (Source/Type = Note)
/// so it participates in the unified inbox listing/filtering/state (unread, pinned, tags, follow-up, ...)
/// exactly like a GitHub PR or ADO work item — no need to duplicate that overlay here.
/// </summary>
[Table("notes")]
public class Note
{
    public long Id { get; set; }

    public string? Title { get; set; }

    public string? Body { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>The note's own inbox envelope. 1:1 — deleting it deletes the note (owned content).</summary>
    [Required]
    public long InboxItemId { get; set; }

    [ForeignKey(nameof(InboxItemId))]
    [Required]
    public required InboxItem InboxItem { get; set; }

    /// <summary>
    /// Optional target this note is attached to (e.g. a GitHub PR or ADO work item's envelope).
    /// Null means the note is standalone. Several notes may point at the same target item over time.
    /// </summary>
    public long? AttachedToInboxItemId { get; set; }

    [ForeignKey(nameof(AttachedToInboxItemId))]
    public InboxItem? AttachedToInboxItem { get; set; }
}
