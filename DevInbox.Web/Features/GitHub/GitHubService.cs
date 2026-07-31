namespace DevInbox.Web.Features.GitHub;

public class GitHubService(
    ILogger<GitHubService> logger)
    : IService, IGitHubService
{
    public async Task SyncUserPRAsync(
        string email,
        string githubToken,
        CancellationToken ct = default)
    {
        logger.LogInformation(
            "[GitHub] Starting sync for {Email} with token",
            email);

        for (var i = 1; i <= 5; i++)
        {
            ct.ThrowIfCancellationRequested();

            logger.LogInformation(
                "[GitHub] Fetching PR page {Page}",
                i);

            await Task.Delay(1000, ct);
        }

        logger.LogInformation(
            "[GitHub] Synchronization completed for {Email}",
            email);
    }
}
