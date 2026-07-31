using DevInbox.Web.Features.GitHub.Client.DTO;

namespace DevInbox.Web.Features.GitHub.Client;

public interface IGitHubClient
{
    Task<(GitHubUserProfileDTO Profile, string AccessToken)> GetCurrentUserAsync(
        string accessToken,
        CancellationToken ct = default);

    Task SearchPullRequestsAsync(
        string accessToken,
        string query,
        CancellationToken ct = default);
}
