using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Infrastructure.Events;

/// /// <summary>
/// Requests removal of an integration's local data (profile and synced inbox items), published synchronously
/// by the disconnect endpoints and by account deletion. Each feature removes its own part in its own handler.
/// </summary>
/// <param name="Organization">
/// When set (Ado only), scopes cleanup to inbox items from that single organization, leaving other
/// connected organizations' items untouched. Null means "all items for this source" (always the
/// case for GitHub, which has only one connection per user).
/// </param>
public record IntegrationDisconnectRequestEvent(long UserId, ItemSource Source, string? Organization = null) : IEvent;
