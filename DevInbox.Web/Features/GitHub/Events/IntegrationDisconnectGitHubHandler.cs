using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.GitHub.Events;

public class IntegrationDisconnectGitHubHandler(
    IGitHubProfileRepository profileRepository,
    ILogger<IntegrationDisconnectGitHubHandler> logger)
    : IEventHandler<IntegrationDisconnectRequestEvent>
{
    public async Task Handle(IntegrationDisconnectRequestEvent message, CancellationToken cancellationToken)
    {
        if (message.Source == ItemSource.GitHub)
        {
            logger.LogDebug("Removing GitHub integration profile for user {UserId}", message.UserId);
            await profileRepository.DeleteByUserIdAsync(message.UserId);
        }
    }
}
