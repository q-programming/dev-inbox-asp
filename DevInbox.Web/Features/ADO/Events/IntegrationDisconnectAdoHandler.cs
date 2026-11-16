using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.ADO.Events;

public class IntegrationDisconnectAdoHandler(
    IAdoProfileRepository profileRepository,
    ILogger<IntegrationDisconnectAdoHandler> logger)
    : IEventHandler<IntegrationDisconnectRequestEvent>
{
    public async Task Handle(IntegrationDisconnectRequestEvent message, CancellationToken cancellationToken)
    {
        if (message.Source == ItemSource.Ado && !string.IsNullOrEmpty(message.Organization))
        {
            logger.LogDebug("Removing Ado integration profile for user {UserId}", message.UserId);
            await profileRepository.DeleteByUserIdAndOrganizationAsync(message.UserId, message.Organization);
        }
    }
}
