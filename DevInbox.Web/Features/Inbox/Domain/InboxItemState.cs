using System.ComponentModel.DataAnnotations.Schema;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItemState
{
    public long Id { get; set; }
    public long InboxItemId { get; set; }
    [ForeignKey(nameof(InboxItemId))]
    public InboxItem InboxItem { get; set; } = null!;
    public bool IsUnread { get; set; } = true;
    public bool IsSaved { get; set; }
    public bool IsPinned { get; set; }
    public bool IsDone { get; set; }
    public Priority Priority { get; set; }
    public string? PrivateNote { get; set; }
    public string[] Tags { get; set; } = [];
    public DateTimeOffset? FollowUpAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public enum Priority
{
    None,
    Low,
    Medium,
    High,
    Critical
}
