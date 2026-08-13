using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub.Client;

public interface IGitHubClient
{
    Task<(GitHubUserProfileDTO Profile, string AccessToken)> GetCurrentUserAsync(
        string accessToken,
        CancellationToken ct = default);

    /// <summary>
    /// Runs a GitHub search (issues/PR search API) with the given, already-built query string and
    /// returns the full, aggregated result set. Paging (GraphQL search page size is capped at 100)
    /// and the safety cap on pages fetched are handled internally — callers should not need to worry
    /// about cursors.
    /// </summary>
    /// <param name="accessToken">User's GitHub PAT.</param>
    /// <param name="searchQuery">
    /// A complete GitHub search query, e.g. "is:pr involves:octocat archived:false updated:&gt;=2024-01-01 sort:updated-desc".
    /// Building the query (which qualifiers to include, date bounds, etc.) is the caller's
    /// responsibility — the client only knows how to execute a search and page through it.
    /// </param>
    Task<IReadOnlyList<GitHubPullRequestDTO>> GetPullRequestsInvolvingUserAsync(
        string accessToken,
        string searchQuery,
        CancellationToken ct = default);

    /// <summary>
    /// Fetches full detail for a single pull request — repository, review state, requested reviewers
    /// and the most recent comments — used to populate the inbox item detail panel. One GraphQL round
    /// trip in place of what would otherwise be several REST calls (PR, reviews, requested reviewers,
    /// issue comments).
    /// </summary>
    /// <param name="accessToken">User's GitHub PAT.</param>
    /// <param name="owner">Repository owner, e.g. "octocat" for "octocat/hello-world".</param>
    /// <param name="name">Repository name, e.g. "hello-world" for "octocat/hello-world".</param>
    /// <param name="pullRequestNumber">PR number within the repository — matches <see cref="Inbox.Domain.InboxItem.ExternalId"/>.</param>
    /// <param name="latestCommentsCount">How many of the most recent comments to include.</param>
    Task<GitHubPullRequestDetail> GetPullRequestDetailAsync(
        string accessToken,
        string owner,
        string name,
        int pullRequestNumber,
        int latestCommentsCount = 5,
        CancellationToken ct = default);
}
