using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub.Client;

public interface IGitHubClient
{
    Task<(GitHubUserProfileDTO Profile, string AccessToken)> GetCurrentUserAsync(
        string accessToken,
        CancellationToken ct = default);

    /// <summary>
    /// Fetches pull requests involving the given GitHub login that were updated at or after
    /// <paramref name="updatedSince"/> — equivalent to
    /// "is:pr involves:{login} archived:false updated:&gt;={updatedSince} sort:updated-desc" in the
    /// GitHub search UI. GitHub bumps a PR's "updated" timestamp on *any* activity (new commits,
    /// comments, reviews, label changes, close/merge), so passing the last sync time here captures
    /// both newly-involved PRs and changes to already-known PRs in a single query — no need for a
    /// separate lookup by PR number.
    /// Pages internally (GraphQL search page size is capped at 100) and returns the full,
    /// aggregated result — callers should not need to worry about cursors.
    /// </summary>
    /// <param name="accessToken">User's GitHub PAT.</param>
    /// <param name="login">GitHub login to search "involves:" for — pass the authenticated user's own login for @me.</param>
    /// <param name="updatedSince">Lower bound for the "updated:" qualifier — pass the inbox's last successful sync time. Ignored when <paramref name="openPullRequestsOnly"/> is true.</param>
    /// <param name="openPullRequestsOnly">
    /// When true, ignores <paramref name="updatedSince"/> and fetches only currently-open PRs, with
    /// no date bound. Intended for a first-time sync: closed/merged PRs from before the user started
    /// using Dev Inbox aren't inbox-worthy (nothing to act on), so there's no need to pull that
    /// history — just today's open, actionable set. Leave false for incremental syncs, where a
    /// close/merge that happens between syncs is itself worth surfacing.
    /// </param>
    Task<IReadOnlyList<GitHubPullRequestDTO>> GetPullRequestsInvolvingUserAsync(
        string accessToken,
        string login,
        DateTimeOffset updatedSince,
        bool openPullRequestsOnly = false,
        CancellationToken ct = default);

    /// <summary>
    /// Fetches full detail for a single pull request — repository, review state, requested reviewers
    /// and the most recent comments — used to populate the inbox item detail panel. One GraphQL round
    /// trip in place of what would otherwise be several REST calls (PR, reviews, requested reviewers,
    /// issue comments).
    /// </summary>
    /// <param name="accessToken">User's GitHub PAT.</param>
    /// <param name="repositoryFullName">e.g. "owner/repo" — matches <see cref="Inbox.Domain.InboxItem.Repository"/>.</param>
    /// <param name="pullRequestNumber">PR number within the repository — matches <see cref="Inbox.Domain.InboxItem.ExternalId"/>.</param>
    /// <param name="latestCommentsCount">How many of the most recent comments to include.</param>
    Task<GitHubPullRequestDetail> GetPullRequestDetailAsync(
        string accessToken,
        string repositoryFullName,
        int pullRequestNumber,
        int latestCommentsCount = 5,
        CancellationToken ct = default);
}
