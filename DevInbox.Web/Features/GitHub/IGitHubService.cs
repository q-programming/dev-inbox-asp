using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub;

public interface IGitHubService
{
    Task SyncUserPRAsync(
        long userId,
        CancellationToken ct = default);

    Task<GitHubPullRequestDetail> GetDetailsAsync(InboxItem item);
}
