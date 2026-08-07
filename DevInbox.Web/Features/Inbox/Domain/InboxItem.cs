using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Notes.Domain;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItem
{
    public long Id { get; set; }
    /// <summary>Native id in the source system (e.g. PR number, ADO work item id). Null for locally-authored items such as Notes, which have no external system to dedupe against.</summary>
    public string? ExternalId { get; set; }
    public ItemSource Source { get; set; }
    public ItemType Type { get; set; }
    public string? Title { get; set; }
    public string? Repository { get; set; }
    public long InboxId { get; set; }
    [ForeignKey(nameof(InboxId))]
    public Inbox Inbox { get; set; } = null!;
    public InboxItemState State { get; set; } = null!;
    public InboxReason Reason { get; set; } = InboxReason.Unknown;
    public DateTimeOffset ActivityAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Note? Note { get; set; }
    public long CommentCount { get; set; }

    /// <summary>Whether another note is attached to this item (Note.AttachedToInboxItemId == Id).
    /// Not a persisted column — a note's attachment is the single source of truth (Note.AttachedToInboxItemId),
    /// so this is populated transiently by IInboxItemRepository.GetInboxItemsFilteredAsync via one batched
    /// query per page rather than duplicating/denormalizing the flag onto every InboxItem row.</summary>
    [NotMapped]
    public bool HasNote { get; set; }
}

public enum ItemSource
{
    GitHub,
    Ado,
    Note,
    Other
}

public enum ItemType
{
    PR, Issue, WorkItem, Note
}
public enum InboxReason
{
    Unknown,
    ReviewRequested,
    Mentioned,
    Assigned,
    Authored,
    FollowUp,
    Note
}
