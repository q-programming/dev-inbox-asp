using DevInbox.Web.Common.Utils;
using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.GitHub.Events;

public class UserAuthenticatedGithubEventHandler(IGitHubService gitHubService, ILogger<UserAuthenticatedGithubEventHandler> logger) : IEventHandler<UserAuthenticatedEvent>
{
    public async Task Handle(UserAuthenticatedEvent message, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(message.GithubToken))
        {
            logger.LogWarning("No token recived while logging in for user {Email}", EmailUtils.MaskEmail(message.Email));
        }
        else
        {
            await gitHubService.SyncUserPRAsync(message.Email, message.GithubToken, cancellationToken);
        }

    }
}
