namespace DevInbox.Web.Features.GitHub;

public interface IGitHubService
{
    public Task SyncUserPRAsync(
        string email,
        string githubToken,
        CancellationToken ct = default);
}
