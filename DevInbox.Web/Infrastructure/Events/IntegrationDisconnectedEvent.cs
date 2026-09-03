using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Infrastructure.Events;

/// <param name="Organization">
/// When set (Ado only), scopes cleanup to inbox items from that single organization, leaving other
/// connected organizations' items untouched. Null means "all items for this source" (always the
/// case for GitHub, which has only one connection per user).
/// </param>
public record IntegrationDisconnectedEvent(long UserId, ItemSource Source, string? Organization = null) : IEvent;