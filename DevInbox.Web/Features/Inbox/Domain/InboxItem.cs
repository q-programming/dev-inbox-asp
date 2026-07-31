using System.ComponentModel.DataAnnotations.Schema;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItem
{
    public long Id { get; set; }
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
