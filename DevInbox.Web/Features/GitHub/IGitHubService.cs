using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub;

public interface IGitHubService
{
    /// <summary>
    /// Syncs pull requests involving the user's GitHub account into the inbox.
    /// </summary>
    /// <param name="userId">Dev Inbox user id.</param>
    /// <param name="updatedSince">
    /// Checkpoint to sync from — pass the inbox's last successful sync time. Null means this is the
    /// first sync for this profile: fetches only currently-open PRs instead of any closed/merged history.
    /// </param>
    Task SyncUserPRAsync(
        long userId,
        DateTimeOffset? updatedSince = null,
        CancellationToken ct = default);

    Task<GitHubPullRequestDetail> GetDetailsAsync(InboxItem item, CancellationToken ct = default);
}
