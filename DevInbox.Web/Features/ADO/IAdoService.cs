using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

public interface IAdoService
{
    Task<AdoWorkItemDetail> GetDetailsAsync(InboxItem item, CancellationToken cancellationToken);

    /// <summary>
    /// Synchronizes both ADO work items ("assigned to me" / authored) and pull requests
    /// (authored / review-requested, across every repo in every project the user's PAT can see)
    /// into the user's inbox.
    /// </summary>
    /// <param name="updatedSince">
    /// Lower bound for incremental syncs (null = first-ever/full sync — see <see cref="AdoService"/>).
    /// </param>
    /// <param name="forceFullSync">
    /// When true, also refreshes the cached project list (see <see cref="Domain.AdoProfile.ProjectsJson"/>)
    /// instead of reusing it, and widens the PR search to include completed/abandoned PRs.
    /// </param>
    Task SyncWorkItemsAsync(
        long userId,
        DateTimeOffset? updatedSince = null,
        bool forceFullSync = false,
        CancellationToken ct = default);

    /// <summary>Returns the Azure DevOps organizations currently usable by the given user's connected PAT.</summary>
    Task<IReadOnlyList<string>> GetOrganizationsAsync(long userId, CancellationToken ct = default);

    /// <summary>
    /// Adds an organization to the user's usable-organizations list, after validating the PAT can
    /// actually reach it (a cheap "list projects" probe). Throws <see cref="BadRequestException"/>
    /// if the PAT cannot access the given organization.
    /// </summary>
    Task<IReadOnlyList<string>> AddOrganizationAsync(long userId, string organizationName, CancellationToken ct = default);
}
