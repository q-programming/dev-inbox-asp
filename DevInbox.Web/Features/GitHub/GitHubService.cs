using DevInbox.Web.Features.GitHub.Domain;

namespace DevInbox.Web.Features.GitHub;

public class GitHubService(
    IGitHubProfileRepository repository, ILogger<GitHubService> logger) : IService, IGitHubService
{
    public async Task SyncUserPRAsync(
        long userId,
        CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId);
        if (profile == null)
        {
            logger.LogWarning("No GitHub profile found for user {UserId}", userId);
            return;
        }
        //TODO Handle case when token expired or revoked, and refresh it if possible
        logger.LogInformation(
            "[GitHub] Starting sync for {GitHubLogin}",
            profile.GitHubLogin);

        for (var i = 1; i <= 5; i++)
        {
            ct.ThrowIfCancellationRequested();

            logger.LogInformation(
                "[GitHub] Fetching PR page {Page}",
                i);

            await Task.Delay(1000, ct);
        }

        logger.LogInformation(
            "[GitHub] Synchronization completed for {GitHubLogin}",
            profile.GitHubLogin);
    }
}
