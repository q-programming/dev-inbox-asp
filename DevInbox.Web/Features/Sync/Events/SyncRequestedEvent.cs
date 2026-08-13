using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Sync.Events;

/// <summary>
/// Requests a sync of all integrations for a user. <see cref="ForceFullSync"/> tells GitHub (and any
/// other integration that distinguishes initial vs. incremental sync) to ignore the inbox's last sync
/// checkpoint and re-fetch from scratch — used when an integration was just (re)connected, since the
/// existing checkpoint predates any data for it.
/// </summary>
public record SyncRequestedEvent(long UserId, string Email, bool ForceFullSync = false) : IEvent
{
}
