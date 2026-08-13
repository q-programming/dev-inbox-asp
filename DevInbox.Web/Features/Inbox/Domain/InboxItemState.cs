using System.ComponentModel.DataAnnotations.Schema;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItemState
{
    public long Id { get; set; }
    public long InboxItemId { get; set; }
    [ForeignKey(nameof(InboxItemId))]
    public InboxItem InboxItem { get; set; } = null!;
    public bool IsSaved { get; set; }
    public bool IsPinned { get; set; }
    public bool IsDone { get; set; }
    /// <summary>
    /// Fully closed items (e.g. a merged/closed PR) no longer need to appear in the inbox at all,
    /// as opposed to <see cref="IsDone"/> which just reflects the user manually marking it reviewed.
    /// </summary>
    public bool IsClosed { get; set; }
    public Priority Priority { get; set; }
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
