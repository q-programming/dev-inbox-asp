using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Sync.Events;

public class SyncRequestedEventHandler(ISyncService syncService) : IEventHandler<SyncRequestedEvent>
{
    public async Task Handle(SyncRequestedEvent message, CancellationToken cancellationToken)
    {
        await syncService.SynchronizeIntegrations(message.UserId, message.Email, message.ForceFullSync, cancellationToken);
    }

}
