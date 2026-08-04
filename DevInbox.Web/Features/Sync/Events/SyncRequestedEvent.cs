using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Sync.Events;

public record SyncRequestedEvent(long UserId, string Email) : IEvent
{
}
