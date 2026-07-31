using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Identity.Domain;

namespace DevInbox.Web.Features.Inbox.Domain;

public sealed class Inbox
{
    [Key]
    public long UserId { get; set; }
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
    public long Version { get; set; }
    public DateTimeOffset LastUpdatedAt { get; set; }
    public DateTimeOffset? LastSyncStartedAt { get; set; }
    public DateTimeOffset? LastSyncCompletedAt { get; set; }
    public SyncStatus SyncStatus { get; set; }

    public static Inbox CreateDefault()
    {
        return new Inbox
        {
            Version = 0,
            SyncStatus = SyncStatus.Idle,
            LastUpdatedAt = DateTimeOffset.UtcNow
        };
    }
}
