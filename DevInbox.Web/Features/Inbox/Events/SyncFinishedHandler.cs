using DevInbox.Web.Features.Sync.Events;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Inbox.Events;

public class SyncFinishedHandler(
    IInboxService inboxService,
    ILogger<SyncFinishedHandler> logger)
    : IEventHandler<SyncFinishedEvent>
{
    public Task Handle(SyncFinishedEvent message, CancellationToken cancellationToken)
    {
        logger.LogDebug("Invalidating cache as there are some integration changes for user with {UserId}", message.UserId);
        inboxService.ClearUsersCache(message.UserId);
        return Task.CompletedTask;
    }
}
