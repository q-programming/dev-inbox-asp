using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Sync.Events;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;

namespace DevInbox.Web.Features.GitHub;

/// <summary>
/// Handles integration connection endpoints — GitHub and ADO PAT connect/disconnect.
/// The GitHub OAuth App flow is handled by <see cref="Identity.UserController"/> since it's tied to login.
/// </summary>
public class IntegrationsController(
    IGitHubIntegrationService gitHubIntegrationService,
    IAdoIntegrationService adoIntegrationService,
    IUserService userService,
    IPublisher publisher) : IIntegrationsBaseController, IComponent
{
    public async Task<IntegrationDto> ConnectAdoPatAsync(ConnectPatRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Organization))
        {
            throw new BadRequestException("An Azure DevOps organization name is required.");
        }

        var user = await userService.GetCurrentUserAsync();
        var integration = await adoIntegrationService.ConnectPatAsync(user.Id, body.Organization, body.Token, body.ExpiresAt);
        // Freshly connected — the inbox's last sync checkpoint predates any data from this
        // organization, so force a full sync rather than an incremental one that would find
        // nothing new. This also performs the first project discovery for this organization, since
        // none is cached yet.
        await publisher.PublishAsync(new SyncRequestedEvent(user.Id, user.Email, ForceFullSync: true));
        return integration;
    }

    public async Task<IntegrationDto> ConnectGithubPatAsync(ConnectPatRequest body)
    {
        var user = await userService.GetCurrentUserAsync();
        var integration = await gitHubIntegrationService.ConnectPatAsync(user.Id, body.Token, body.ExpiresAt);
        // Freshly connected — the inbox's last sync checkpoint predates any GitHub data, so force a
        // full (open-PRs) sync rather than an incremental one that would find nothing new.
        await publisher.PublishAsync(new SyncRequestedEvent(user.Id, user.Email, ForceFullSync: true));
        return integration;
    }

    public async Task DisconnectAdoAsync(string organization)
    {
        var user = await userService.GetCurrentUserAsync();
        await adoIntegrationService.DisconnectAsync(user.Id, organization);
        // Cleanup runs synchronously — the user expects previously-synced items from this
        // organization gone from their inbox immediately, not eventually via a background handler.
        // Other connected organizations' items are untouched (see IntegrationDisconnectedEvent).
        await publisher.Publish(new IntegrationDisconnectedEvent(user.Id, ItemSource.Ado, organization));
    }

    public async Task DisconnectGithubAsync()
    {
        var user = await userService.GetCurrentUserAsync();
        await gitHubIntegrationService.DisconnectAsync(user.Id);
        // Cleanup runs synchronously — the user expects previously-synced GitHub items gone from
        // their inbox immediately, not eventually via a background handler.
        await publisher.Publish(new IntegrationDisconnectedEvent(user.Id, ItemSource.GitHub));
    }
}
