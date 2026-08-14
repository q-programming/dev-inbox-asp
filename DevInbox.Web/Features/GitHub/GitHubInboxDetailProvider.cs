using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub;

public class GitHubInboxDetailProvider(IGitHubService gitHubService) : IInboxDetailProvider, IService
{
    public Inbox.Domain.ItemSource Source => Inbox.Domain.ItemSource.GitHub;

    public async Task PopulateAsync(InboxItem item, InboxItemDetail dto, CancellationToken cancellationToken = default)
    {
        dto.Github = await gitHubService.GetDetailsAsync(item, cancellationToken);
    }
}
