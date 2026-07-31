namespace DevInbox.Web.Features.GitHub;

public interface IGitHubService
{
    public Task SyncUserPRAsync(
        long userId,
        CancellationToken ct = default);
}
