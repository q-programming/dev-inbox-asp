using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Features.GitHub;

public class GitHubService(
    IGitHubProfileRepository repository,
    IInboxItemRepository inboxItemRepository,
    IGitHubClient gitHubClient,
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

        // item.InboxId doubles as the owning user's id (Inbox's key is the user's own id).
        var profile = await repository.GetByUserIdAsync(item.InboxId)
            ?? throw new InvalidOperationException($"No GitHub profile found for user {item.InboxId}.");

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for GitHub profile {profile.GitHubLogin}.");

        return await gitHubClient.GetPullRequestDetailAsync(accessToken, item.Repository, pullRequestNumber, ct: ct);
    }

    public async Task SyncUserPRAsync(
        long userId,
        DateTimeOffset? updatedSince = null,
        CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId);
        if (profile == null)
        {
            logger.LogWarning("No GitHub profile found for user {UserId}", userId);
            return;
        }
        //TODO Handle case when token expired or revoked, and refresh it if possible

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for GitHub profile {profile.GitHubLogin}.");

        // First-ever sync for this profile: only fetch currently-open PRs — closed/merged history
        // from before the user started using Dev Inbox isn't inbox-worthy. Incremental syncs use the
        // last successful sync time so both new activity and a close/merge in the meantime surface.
        var isInitialSync = updatedSince is null;

        logger.LogInformation(
            "[GitHub] Starting {SyncKind} sync for {GitHubLogin}",
            isInitialSync ? "initial (open PRs only)" : $"incremental (since {updatedSince:O})", profile.GitHubLogin);

        var pullRequests = await gitHubClient.GetPullRequestsInvolvingUserAsync(
            accessToken,
            profile.GitHubLogin,
            updatedSince ?? DateTimeOffset.UtcNow,
            openPullRequestsOnly: isInitialSync,
            ct);

        logger.LogInformation(
            "[GitHub] Fetched {Count} pull request(s) involving {GitHubLogin}",
            pullRequests.Count, profile.GitHubLogin);

        await UpsertInboxItemsAsync(profile, pullRequests);

        logger.LogInformation(
            "[GitHub] Synchronization completed for {GitHubLogin}",
            profile.GitHubLogin);
    }

    /// <summary>
    /// Creates a new <see cref="InboxItem"/> for each PR not seen before, and refreshes existing ones
    /// whose GitHub-side status (open/closed/merged) or activity (comment count or last-updated time)
    /// has moved on since the last sync.
    /// Existing items are matched by (Repository, ExternalId) — a PR number is only unique within its
    /// repository, so both are required; loaded in a single query rather than one lookup per PR.
    /// </summary>
    private async Task UpsertInboxItemsAsync(GitHubProfile profile, IReadOnlyList<GitHubPullRequestDTO> pullRequests)
    {
        if (pullRequests.Count == 0)
        {
            return;
        }

        var repositories = pullRequests.Select(pr => pr.RepositoryFullName).Distinct().ToList();
        var externalIds = pullRequests.Select(pr => pr.Number.ToString()).Distinct().ToList();

        var existingItems = await inboxItemRepository.GetExistingItemsAsync(
            profile.UserId, ItemSource.GitHub, ItemType.PR, repositories, externalIds);

        var existingByKey = existingItems.ToDictionary(i => BuildKey(i.Repository!, i.ExternalId!));

        var newItems = new List<InboxItem>();
        var updatedCount = 0;

        foreach (var pr in pullRequests)
        {
            if (existingByKey.TryGetValue(BuildKey(pr.RepositoryFullName, pr.Number.ToString()), out var existing))
            {
                if (UpdateExistingItem(existing, pr))
                {
                    updatedCount++;
                }
            }
            else
            {
                newItems.Add(CreateNewItem(profile, pr));
            }
        }

        if (newItems.Count > 0)
        {
            await inboxItemRepository.AddRangeAsync(newItems);
        }

        if (newItems.Count > 0 || updatedCount > 0)
        {
            await inboxItemRepository.SaveChangesAsync();
        }

        logger.LogInformation(
            "[GitHub] Upserted inbox items for {GitHubLogin}: {NewCount} new, {UpdatedCount} updated, {UnchangedCount} unchanged",
            profile.GitHubLogin, newItems.Count, updatedCount, pullRequests.Count - newItems.Count - updatedCount);
    }

    private static (string Repository, string ExternalId) BuildKey(string repository, string externalId) => (repository, externalId);

    /// <summary>
    /// Applies incoming PR data to an already-tracked <see cref="InboxItem"/> if anything relevant
    /// changed. Returns whether an update was applied.
    /// </summary>
    private static bool UpdateExistingItem(InboxItem existing, GitHubPullRequestDTO pr)
    {
        var isClosedOrMerged = IsClosedOrMerged(pr);
        var wasClosedOrMerged = existing.State.IsDone;
        var hasActivityChange = existing.CommentCount != pr.CommentsCount || existing.ActivityAt != pr.UpdatedAt;
        var justClosedOrMerged = isClosedOrMerged && !wasClosedOrMerged;
        var reopened = !isClosedOrMerged && wasClosedOrMerged;

        if (!hasActivityChange && !justClosedOrMerged && !reopened)
        {
            return false;
        }

        existing.Title = pr.Title;
        existing.CommentCount = pr.CommentsCount;
        existing.ActivityAt = pr.UpdatedAt;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.State.IsDone = isClosedOrMerged;

        // A PR being closed/merged is a status change, not something demanding fresh attention —
        // surface the updated state but don't re-flag it unread. Reopening or any other activity on
        // a still-open PR (new comments, review updates, etc.) does warrant re-surfacing as unread.
        if (reopened || (hasActivityChange && !isClosedOrMerged))
        {
            existing.State.IsUnread = true;
        }

        return true;
    }

    /// <summary>
    /// Builds a brand-new <see cref="InboxItem"/> for a PR not previously seen. Always unread — new
    /// to the inbox is always worth flagging, even if the PR itself was already closed/merged by the
    /// time we first saw it (e.g. closed since the last sync).
    /// </summary>
    private static InboxItem CreateNewItem(GitHubProfile profile, GitHubPullRequestDTO pr) => new()
    {
        InboxId = profile.UserId,
        Source = ItemSource.GitHub,
        Type = ItemType.PR,
        ExternalId = pr.Number.ToString(),
        Repository = pr.RepositoryFullName,
        Title = pr.Title,
        Reason = InferReason(pr, profile.GitHubLogin),
        CommentCount = pr.CommentsCount,
        ActivityAt = pr.UpdatedAt,
        CreatedAt = pr.CreatedAt,
        UpdatedAt = DateTimeOffset.UtcNow,
        State = new InboxItemState { IsUnread = true, IsDone = IsClosedOrMerged(pr) }
    };

    private static bool IsClosedOrMerged(GitHubPullRequestDTO pr) =>
        pr.Merged ||
        string.Equals(pr.State, GitHubPullRequestStates.Closed, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(pr.State, GitHubPullRequestStates.Merged, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Best-effort inference of why this PR is in involves:@me — GitHub's search doesn't tell us
    /// which qualifier matched, so this checks the same signals in priority order: authored first,
    /// then an outstanding review request, otherwise falls back to "mentioned" (covers the remaining
    /// involves: cases — assigned, commented-on, or actually @-mentioned — which aren't distinguishable
    /// from the search response alone).
    /// </summary>
    private static InboxReason InferReason(GitHubPullRequestDTO pr, string login)
    {
        if (string.Equals(pr.Author?.Login, login, StringComparison.OrdinalIgnoreCase))
        {
            return InboxReason.Authored;
        }

        if (pr.RequestedReviewers.Any(reviewer => string.Equals(reviewer, login, StringComparison.OrdinalIgnoreCase)))
        {
            return InboxReason.ReviewRequested;
        }

        return InboxReason.Mentioned;
    }
}

/// <summary>GraphQL PullRequestState string values, as returned by the GitHub search API.</summary>
internal static class GitHubPullRequestStates
{
    public const string Open = "OPEN";
    public const string Closed = "CLOSED";
    public const string Merged = "MERGED";
}
