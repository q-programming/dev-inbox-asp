using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Sync.Events;

public record SyncFinishedEvent(long UserId) : IEvent
{
}
