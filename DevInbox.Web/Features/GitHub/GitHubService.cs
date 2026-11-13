using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Config;
using Microsoft.Extensions.Options;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using GraphQL.Client.Http;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Features.GitHub;

public class GitHubService(
    IGitHubProfileRepository repository,
    IInboxItemRepository inboxItemRepository,
    IGitHubClient gitHubClient,
    IOptions<GithubOptions> options,
    ILogger<GitHubService> logger) : IService, IGitHubService
{
    /// <summary>
    /// Gets full detail for a GitHub PR inbox item by calling the GitHub GraphQL API directly —
    /// repository, review state, requested reviewers and latest comments, none of which are stored
    /// locally on the <see cref="InboxItem"/> itself.
    /// </summary>
    public async Task<GitHubPullRequestDetail> GetDetailsAsync(InboxItem item, CancellationToken ct = default)
    {
        if (item.Repository is null || item.ExternalId is null)
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has no GitHub repository/PR number to look up.");
        }

        if (!int.TryParse(item.ExternalId, out var pullRequestNumber))
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has a non-numeric GitHub PR number '{item.ExternalId}'.");
        }

        var repoParts = item.Repository.Split('/', 2);
        if (repoParts.Length != 2)
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has a malformed GitHub repository name '{item.Repository}' — expected \"owner/repo\".");
        }

        // item.InboxId doubles as the owning user's id (Inbox's key is the user's own id).
        var profile = await repository.GetByUserIdAsync(item.InboxId)
            ?? throw new InvalidOperationException($"No GitHub profile found for user {item.InboxId}.");

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for GitHub profile {profile.GitHubLogin}.");

        return await gitHubClient.GetPullRequestDetailAsync(accessToken, repoParts[0], repoParts[1], pullRequestNumber, options.Value.LatestCommentsCount, ct);
    }

    public async Task<IReadOnlyList<InboxItemChange>> SyncUserPRAsync(
        long userId,
        DateTimeOffset? updatedSince = null,
        CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId);
        if (profile == null)
        {
            logger.LogWarning("No GitHub profile found for user {UserId}", userId);
            return [];
        }
        if (profile.Status != Sync.Domain.IntegrationStatus.Active)
        {
            logger.LogWarning("GitHub profile for user {UserId} is not active (status: {Status})", userId, profile.Status);
            return [];
        }

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for GitHub profile {profile.GitHubLogin}.");

        // First-ever sync for this profile: only fetch currently-open PRs — closed/merged history
        // from before the user started using Dev Inbox isn't inbox-worthy. Incremental syncs use the
        // last successful sync time so both new activity and a close/merge in the meantime surface.
        var isInitialSync = updatedSince is null;

        logger.LogDebug(
            "[GitHub] Starting {SyncKind} sync for {GitHubLogin}",
            isInitialSync ? "initial (open PRs only)" : $"incremental (since {updatedSince:O})", profile.GitHubLogin);

        IReadOnlyList<GitHubPullRequestDTO> pullRequests;
        try
        {
            var searchQuery = BuildSearchQuery("involves", profile.GitHubLogin, updatedSince, isInitialSync);
            pullRequests = await gitHubClient.GetPullRequestsInvolvingUserAsync(accessToken, searchQuery, ct);
        }
        catch (Exception ex) when (IsUnauthorized(ex))
        {
            // The stored token was rejected by GitHub — most likely an expired/revoked PAT, or a
            // revoked OAuth App grant. Flag it so the user is prompted to reconnect rather than
            // failing silently on every future sync attempt.
            logger.LogWarning(ex, "[GitHub] Token rejected for {GitHubLogin} — marking integration invalid", profile.GitHubLogin);
            profile.Status = Sync.Domain.IntegrationStatus.Invalid;
            await repository.UpdateAsync(profile);
            return [];
        }

        logger.LogDebug(
            "[GitHub] Fetched {Count} pull request(s) involving {GitHubLogin}",
            pullRequests.Count, profile.GitHubLogin);

        logger.LogDebug(
            "[GitHub] Synchronization completed for {GitHubLogin}",
            profile.GitHubLogin);

        var mentionedNodeIds = await FetchMentionedNodeIdsAsync(profile, accessToken, pullRequests, updatedSince, isInitialSync, ct);
        return await UpsertInboxItemsAsync(profile, pullRequests, mentionedNodeIds);

    }

    /// <summary>
    /// "involves:" can't distinguish a real @-mention from assignment or plain commenting, so PRs that
    /// no direct signal (author, review, assignee) explains are checked against a "mentions:" search.
    /// Skipped entirely when nothing needs it. Returns null when the lookup fails, in which case
    /// <see cref="InferReason"/> falls back to treating unexplained PRs as mentions — a failed
    /// secondary lookup must not break the sync.
    /// </summary>
    private async Task<IReadOnlySet<string>?> FetchMentionedNodeIdsAsync(
        GitHubProfile profile,
        string accessToken,
        IReadOnlyList<GitHubPullRequestDTO> pullRequests,
        DateTimeOffset? updatedSince,
        bool isInitialSync,
        CancellationToken ct)
    {
        if (!pullRequests.Any(pr => InferDirectReason(pr, profile.GitHubLogin) is null))
        {
            return new HashSet<string>();
        }

        try
        {
            var query = BuildSearchQuery("mentions", profile.GitHubLogin, updatedSince, isInitialSync);
            return await gitHubClient.GetPullRequestNodeIdsAsync(accessToken, query, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "[GitHub] Mentions lookup failed for {GitHubLogin} — falling back to approximate reasons", profile.GitHubLogin);
            return null;
        }
    }

    /// <summary>
    /// Creates a new <see cref="InboxItem"/> for each PR not seen before, and refreshes existing ones
    /// whose GitHub-side status (open/closed/merged) or activity (comment count or last-updated time)
    /// has moved on since the last sync.
    /// Existing items are matched by (Repository, ExternalId) — a PR number is only unique within its
    /// repository, so both are required; loaded in a single query rather than one lookup per PR.
    /// </summary>
    private async Task<IReadOnlyList<InboxItemChange>> UpsertInboxItemsAsync(
        GitHubProfile profile,
        IReadOnlyList<GitHubPullRequestDTO> pullRequests,
        IReadOnlySet<string>? mentionedNodeIds)
    {
        if (pullRequests.Count == 0)
        {
            return [];
        }

        var repositories = pullRequests.Select(pr => pr.RepositoryFullName).Distinct().ToList();
        var externalIds = pullRequests.Select(pr => pr.Number.ToString()).Distinct().ToList();

        var existingItems = await inboxItemRepository.GetExistingItemsAsync(
            profile.UserId, ItemSource.GitHub, ItemType.PR, repositories, externalIds);

        var existingByKey = existingItems.ToDictionary(i => BuildKey(i.Repository!, i.ExternalId!));

        var newItems = new List<InboxItem>();
        var updatedItems = new List<InboxItem>();

        foreach (var pr in pullRequests)
        {
            var reason = InferReason(pr, profile.GitHubLogin, mentionedNodeIds);
            if (existingByKey.TryGetValue(BuildKey(pr.RepositoryFullName, pr.Number.ToString()), out var existing))
            {
                if (UpdateExistingItem(existing, pr, reason))
                {
                    updatedItems.Add(existing);
                }
            }
            else
            {
                newItems.Add(CreateNewItem(profile, pr, reason));
            }
        }

        if (newItems.Count > 0)
        {
            await inboxItemRepository.AddRangeAsync(newItems);
        }

        if (newItems.Count > 0 || updatedItems.Count > 0)
        {
            await inboxItemRepository.SaveChangesAsync();
        }

        if (updatedItems.Count > 0)
        {
            await inboxItemRepository.SyncAttachedNotesStateAsync(updatedItems);
        }

        logger.LogDebug(
            "[GitHub] Upserted inbox items for {GitHubLogin}: {NewCount} new, {UpdatedCount} updated, {UnchangedCount} unchanged",
            profile.GitHubLogin, newItems.Count, updatedItems.Count, pullRequests.Count - newItems.Count - updatedItems.Count);
        return [
            .. newItems.Select(item => new InboxItemChange(item, ItemChangeKind.Created)),
            .. updatedItems.Select(item => new InboxItemChange(item, ItemChangeKind.Updated))
        ];
    }

    /// <summary>
    /// Builds the GitHub search query used to find PRs "involving" a user for a sync
    /// </summary>
    /// <param name="qualifier">GitHub search qualifier naming the user's relationship to the PR — "involves" or "mentions".</param>
    /// <param name="login">GitHub login to search the qualifier for.</param>
    /// <param name="updatedSince">Lower bound for the "updated:" qualifier — ignored when <paramref name="openPullRequestsOnly"/> is true.</param>
    /// <param name="openPullRequestsOnly">
    /// When true, ignores <paramref name="updatedSince"/> and searches only currently-open PRs, with
    /// no date bound. Used for a first-time sync: closed/merged PRs from before the user started
    /// using Dev Inbox aren't inbox-worthy (nothing to act on), so there's no need to pull that
    /// history — just today's open, actionable set. Otherwise, an incremental sync catches both new
    /// PRs and activity on already-known ones (including a close/merge that happened during this
    /// window — that IS inbox-worthy, unlike historical closed PRs from before the user's first sync).
    /// </param>
    private static string BuildSearchQuery(string qualifier, string login, DateTimeOffset? updatedSince, bool openPullRequestsOnly)
    {
        if (openPullRequestsOnly)
        {
            return $"is:pr {qualifier}:{login} is:open archived:false sort:updated-desc";
        }

        // GitHub's date qualifiers expect YYYY-MM-DD for issue/PR search — not a full ISO datetime.
        var since = updatedSince ?? DateTimeOffset.UtcNow;
        return $"is:pr {qualifier}:{login} archived:false updated:>={since:yyyy-MM-dd} sort:updated-desc";
    }

    /// <summary>
    /// True when the given exception represents an HTTP 401 from GitHub. Two distinct exception
    /// shapes carry this: plain <see cref="HttpRequestException"/> from <c>GetCurrentUserAsync</c>'s
    /// REST call, and <see cref="GraphQLHttpRequestException"/> — raised by the GraphQL client for
    /// any non-2xx HTTP response, which is how an expired/revoked token surfaces from the GraphQL PR
    /// search/detail calls.
    /// </summary>
    private static bool IsUnauthorized(Exception ex) => ex switch
    {
        HttpRequestException httpEx => httpEx.StatusCode == System.Net.HttpStatusCode.Unauthorized,
        GraphQLHttpRequestException graphQlEx => graphQlEx.StatusCode == System.Net.HttpStatusCode.Unauthorized,
        _ => false
    };

    private static (string Repository, string ExternalId) BuildKey(string repository, string externalId) => (repository, externalId);

    /// <summary>
    /// Applies incoming PR data to an already-tracked <see cref="InboxItem"/> if anything relevant
    /// changed. Returns whether an update was applied.
    /// </summary>
    private static bool UpdateExistingItem(InboxItem existing, GitHubPullRequestDTO pr, InboxReason reason)
    {
        var isClosedOrMerged = IsClosedOrMerged(pr);
        var wasClosed = existing.State.IsClosed;
        var hasActivityChange = existing.CommentCount != pr.CommentsCount || existing.ActivityAt != pr.UpdatedAt;
        var closedStateChanged = isClosedOrMerged != wasClosed;
        var reasonChanged = existing.Reason != reason;

        if (!hasActivityChange && !closedStateChanged && !reasonChanged)
        {
            return false;
        }

        existing.Reason = reason;
        existing.Title = pr.Title;
        existing.CommentCount = pr.CommentsCount;
        existing.ActivityAt = pr.UpdatedAt;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.State.IsClosed = isClosedOrMerged;
        // Freshly closed/merged means there's nothing left to review, so mark it done
        // automatically. Otherwise, any fresh activity (new comments, review updates) or
        // reopening means the item is worth another look, so clear the "done" mark
        // regardless of whether it was already reviewed.
        if (closedStateChanged && isClosedOrMerged)
        {
            existing.State.IsDone = true;
        }
        else if (hasActivityChange || closedStateChanged)
        {
            existing.State.IsDone = false;
        }
        return true;
    }

    /// <summary>
    /// Builds a brand-new <see cref="InboxItem"/> for a PR not previously seen. Starts as not done,
    /// since new-to-the-inbox items are always worth reviewing — unless the PR is already
    /// closed/merged (e.g. closed since the last sync), in which case it's created as both closed
    /// and done right away, since it never needs to be reviewed.
    /// </summary>
    private static InboxItem CreateNewItem(GitHubProfile profile, GitHubPullRequestDTO pr, InboxReason reason)
    {
        var isClosedOrMerged = IsClosedOrMerged(pr);
        return new()
        {
            InboxId = profile.UserId,
            Source = ItemSource.GitHub,
            Type = ItemType.PR,
            ExternalId = pr.Number.ToString(),
            Repository = pr.RepositoryFullName,
            Title = pr.Title,
            Reason = reason,
            CommentCount = pr.CommentsCount,
            ActivityAt = pr.UpdatedAt,
            CreatedAt = pr.CreatedAt,
            UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState { IsDone = isClosedOrMerged, IsClosed = isClosedOrMerged }
        };
    }

    private static bool IsClosedOrMerged(GitHubPullRequestDTO pr) =>
        pr.Merged ||
        string.Equals(pr.State, GitHubPullRequestStates.Closed, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(pr.State, GitHubPullRequestStates.Merged, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Works out why this PR is in involves:@me, in priority order: authored, review requested,
    /// already reviewed (kept under ReviewRequested — the user acted as a reviewer), assigned, then
    /// an actual @-mention confirmed by the "mentions:" search. Anything left (e.g. only commented)
    /// is Unknown. When the mentions lookup failed (<paramref name="mentionedNodeIds"/> is null) the
    /// remainder is approximated as Mentioned, the previous behavior.
    /// </summary>
    private static InboxReason InferReason(GitHubPullRequestDTO pr, string login, IReadOnlySet<string>? mentionedNodeIds)
    {
        var direct = InferDirectReason(pr, login);
        if (direct is not null)
        {
            return direct.Value;
        }

        return mentionedNodeIds is null || mentionedNodeIds.Contains(pr.NodeId)
            ? InboxReason.Mentioned
            : InboxReason.Unknown;
    }

    /// <summary>Reasons derivable from the PR data itself, without an extra search. Null when none applies.</summary>
    private static InboxReason? InferDirectReason(GitHubPullRequestDTO pr, string login)
    {
        if (IsLogin(pr.Author?.Login, login))
        {
            return InboxReason.Authored;
        }

        if (pr.RequestedReviewers.Any(reviewer => IsLogin(reviewer, login)) ||
            pr.Reviews.Any(review => IsLogin(review.ReviewerLogin, login)))
        {
            return InboxReason.ReviewRequested;
        }

        if (pr.Assignees.Any(assignee => IsLogin(assignee, login)))
        {
            return InboxReason.Assigned;
        }

        return null;
    }

    private static bool IsLogin(string? candidate, string login) =>
        string.Equals(candidate, login, StringComparison.OrdinalIgnoreCase);
}

/// <summary>GraphQL PullRequestState string values, as returned by the GitHub search API.</summary>
internal static class GitHubPullRequestStates
{
    public const string Open = "OPEN";
    public const string Closed = "CLOSED";
    public const string Merged = "MERGED";
}
