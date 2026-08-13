using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Inbox.Events;

public class IntegrationDisconnectedHandler(IInboxService inboxService, ILogger<IntegrationDisconnectedHandler> logger) : IEventHandler<IntegrationDisconnectedEvent>
{
    public async Task Handle(IntegrationDisconnectedEvent message, CancellationToken cancellationToken)
    {
        logger.LogInformation("Handling {ItemSource} integration disconnected event for user {UserId}", message.Source, message.UserId);
        await inboxService.DeleteInboxItemsBySourceAsync(message.UserId, message.Source, cancellationToken);
    }
}