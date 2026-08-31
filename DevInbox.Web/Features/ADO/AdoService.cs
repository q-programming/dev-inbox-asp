using System.Text.Json;
using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Features.ADO;

public class AdoService(
    IAdoProfileRepository repository,
    IInboxItemRepository inboxItemRepository,
    IAdoClient adoClient,
    ILogger<AdoService> logger) : IService, IAdoService
{
    /// <summary>
    /// How long the cached organization list (<see cref="AdoProfile.OrganizationsJson"/>) is
    /// trusted before a normal sync re-discovers/re-probes it.
    /// </summary>
    private static readonly TimeSpan OrganizationsCacheTtl = TimeSpan.FromHours(24);

    /// <summary>
    /// How long the cached project list (<see cref="AdoProfile.ProjectsJson"/>) is trusted before a
    /// normal sync re-discovers it — bounds the "a project was added/removed" staleness window
    /// without paying the discovery call (<c>GET _apis/projects</c>) on every single sync.
    /// </summary>
    private static readonly TimeSpan ProjectsCacheTtl = TimeSpan.FromHours(24);

    /// <summary>Work item states treated as "done" across the common ADO process templates (Agile, Scrum, Basic, CMMI) — process-specific states beyond these aren't distinguishable via a single shared WIQL query.</summary>
    private static readonly string[] ClosedWorkItemStates = ["Closed", "Resolved", "Removed", "Done"];

    public async Task<AdoWorkItemDetail> GetDetailsAsync(InboxItem item, CancellationToken ct)
    {
        if (item.ExternalId is null || item.Repository is null)
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has no ADO organization/project reference to look up.");
        }

        // item.InboxId doubles as the owning user's id (Inbox's key is the user's own id).
        var profile = await repository.GetByUserIdAsync(item.InboxId)
            ?? throw new InvalidOperationException($"No ADO profile found for user {item.InboxId}.");

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for ADO profile {profile.AdoLogin}.");

        return item.Type == ItemType.PR
            ? await GetPullRequestDetailsAsync(accessToken, item, ct)
            : await GetWorkItemDetailsAsync(accessToken, item, ct);
    }

    private async Task<AdoWorkItemDetail> GetWorkItemDetailsAsync(string accessToken, InboxItem item, CancellationToken ct)
    {
        // Work items are keyed "{organization}/{project}" — see BuildWorkItemRepository.
        var parts = item.Repository!.Split('/', 2);
        if (parts.Length != 2)
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has a malformed ADO project reference '{item.Repository}' — expected \"organization/project\".");
        }
        var (organization, project) = (parts[0], parts[1]);

        if (!int.TryParse(item.ExternalId, out var workItemId))
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has a non-numeric ADO work item id '{item.ExternalId}'.");
        }

        var workItem = await adoClient.GetWorkItemDetailAsync(accessToken, organization, workItemId, ct);
        var comments = await adoClient.GetWorkItemCommentsAsync(accessToken, organization, project, workItemId, ct);
        var parentRelation = workItem.Relations?.FirstOrDefault(r => r.Rel == "System.LinkTypes.Hierarchy-Reverse");

        return new AdoWorkItemDetail
        {
            WorkItemId = workItem.Id.ToString(),
            Project = workItem.Fields.TeamProject ?? project,
            Title = workItem.Fields.Title ?? string.Empty,
            WorkItemType = workItem.Fields.WorkItemType ?? string.Empty,
            State = workItem.Fields.State ?? string.Empty,
            Description = workItem.Fields.Description ?? string.Empty,
            Area = workItem.Fields.AreaPath ?? string.Empty,
            AssignedTo = MapPerson(workItem.Fields.AssignedTo),
            CreatedAt = workItem.Fields.CreatedDate ?? DateTimeOffset.UtcNow,
            UpdatedAt = workItem.Fields.ChangedDate ?? DateTimeOffset.UtcNow,
            Url = $"https://dev.azure.com/{organization}/{Uri.EscapeDataString(project)}/_workitems/edit/{workItem.Id}",
            Tags = SplitTags(workItem.Fields.Tags),
            Parent = parentRelation is null ? null : MapParentWorkItem(parentRelation),
            Comments = [.. comments
                .OrderByDescending(c => c.CreatedDate)
                .Select(c => new CommentPreview
                {
                    Author = MapPerson(c.CreatedBy),
                    Body = c.Text ?? string.Empty,
                    CreatedAt = c.CreatedDate
                })]
        };
    }

    private async Task<AdoWorkItemDetail> GetPullRequestDetailsAsync(string accessToken, InboxItem item, CancellationToken ct)
    {
        // Pull requests are keyed "{organization}/{project}/{repository}" — see BuildPrRepository.
        var parts = item.Repository!.Split('/', 3);
        if (parts.Length != 3)
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has a malformed ADO repository reference '{item.Repository}' — expected \"organization/project/repository\".");
        }
        var (organization, project, repositoryName) = (parts[0], parts[1], parts[2]);

        if (!int.TryParse(item.ExternalId, out var pullRequestId))
        {
            throw new InvalidOperationException($"Inbox item {item.Id} has a non-numeric ADO pull request id '{item.ExternalId}'.");
        }

        var pr = await adoClient.GetPullRequestDetailAsync(accessToken, organization, project, repositoryName, pullRequestId, ct);
        var threads = await adoClient.GetPullRequestThreadsAsync(accessToken, organization, project, repositoryName, pullRequestId, ct);

        // System-generated status threads (votes cast, commits pushed, etc.) have commentType
        // "system" rather than "text" — filtered out so only human-authored comments surface.
        var comments = threads
            .SelectMany(t => t.Comments)
            .Where(c => string.Equals(c.CommentType, "text", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(c.Content))
            .OrderByDescending(c => c.PublishedDate)
            .Select(c => new CommentPreview
            {
                Author = MapPerson(c.Author),
                Body = c.Content ?? string.Empty,
                CreatedAt = c.PublishedDate
            })
            .ToList();

        return new AdoWorkItemDetail
        {
            WorkItemId = pr.PullRequestId.ToString(),
            Project = project,
            Title = pr.Title,
            WorkItemType = "Pull Request",
            State = pr.Status,
            Description = pr.Description ?? string.Empty,
            Area = repositoryName,
            AssignedTo = MapPerson(pr.CreatedBy),
            CreatedAt = pr.CreationDate,
            UpdatedAt = pr.ClosedDate ?? pr.CreationDate,
            Url = $"https://dev.azure.com/{organization}/{Uri.EscapeDataString(project)}/_git/{Uri.EscapeDataString(repositoryName)}/pullrequest/{pullRequestId}",
            Tags = [],
            Comments = comments
        };
    }

    private static PersonReference? MapPerson(AdoIdentityRefDTO? identity) =>
        identity is null ? null : new PersonReference { DisplayName = identity.DisplayName, Login = identity.UniqueName };

    private static List<string> SplitTags(string? tags) =>
        string.IsNullOrWhiteSpace(tags)
            ? []
            : [.. tags.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];

    /// <summary>
    /// The parent relation only carries the parent's REST url (no title/type) — extracting the id
    /// from it avoids an extra "fetch the parent's title" call for what is, at most, a secondary
    /// detail-view breadcrumb.
    /// </summary>
    private static LinkedItem MapParentWorkItem(AdoWorkItemRelationDTO relation)
    {
        var id = relation.Url.Split('/').LastOrDefault() ?? relation.Url;
        return new LinkedItem { Id = id, Title = $"Work item {id}", Type = "WorkItem", Url = relation.Url };
    }

    public async Task SyncWorkItemsAsync(
        long userId,
        DateTimeOffset? updatedSince = null,
        bool forceFullSync = false,
        CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId);
        if (profile == null)
        {
            logger.LogWarning("No ADO profile found for user {UserId}", userId);
            return;
        }
        if (profile.Status != Sync.Domain.IntegrationStatus.Active)
        {
            logger.LogWarning("ADO profile for user {UserId} is not active (status: {Status})", userId, profile.Status);
            return;
        }

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for ADO profile {profile.AdoLogin}.");

        // A first-ever sync (updatedSince is null) has no incremental checkpoint to filter by, so
        // it's treated the same as a forced full sync for the purposes of scoping the WIQL query.
        var isInitialSync = updatedSince is null || forceFullSync;

        logger.LogInformation(
            "[ADO] Starting {SyncKind} sync for {AdoLogin}",
            isInitialSync ? "initial/full" : $"incremental (since {updatedSince:O})", profile.AdoLogin);

        IReadOnlyList<AdoProjectRef> projects;
        try
        {
            var organizations = await ResolveOrganizationsAsync(profile, accessToken, forceFullSync, ct);
            projects = await ResolveProjectsAsync(profile, accessToken, organizations, forceFullSync, ct);
        }
        catch (Exception ex) when (IsUnauthorized(ex))
        {
            await MarkInvalidAsync(profile, ex);
            return;
        }

        if (projects.Count == 0)
        {
            logger.LogInformation("[ADO] No accessible projects for {AdoLogin} — nothing to sync", profile.AdoLogin);
            return;
        }

        try
        {
            var results = await Task.WhenAll(projects.Select(project => SyncProjectAsync(profile, accessToken, project, updatedSince, isInitialSync, ct)));

            var workItems = results.SelectMany(r => r.WorkItems).ToList();
            var pullRequests = results.SelectMany(r => r.PullRequests).ToList();

            logger.LogInformation(
                "[ADO] Fetched {WorkItemCount} work item(s) and {PrCount} pull request(s) across {ProjectCount} project(s) for {AdoLogin}",
                workItems.Count, pullRequests.Count, projects.Count, profile.AdoLogin);

            await UpsertWorkItemsAsync(profile, workItems);
            await UpsertPullRequestsAsync(profile, pullRequests);
        }
        catch (Exception ex) when (IsUnauthorized(ex))
        {
            await MarkInvalidAsync(profile, ex);
            return;
        }

        logger.LogInformation("[ADO] Synchronization completed for {AdoLogin}", profile.AdoLogin);
    }

    /// <summary>
    /// Returns the cached organization list from <see cref="AdoProfile.OrganizationsJson"/> when
    /// still fresh, otherwise re-discovers it (accounts lookup) and re-probes every candidate,
    /// merging in any manually-added organizations already on the profile so a stale/failed
    /// discovery never silently drops them.
    /// </summary>
    private async Task<IReadOnlyList<string>> ResolveOrganizationsAsync(
        AdoProfile profile,
        string accessToken,
        bool forceFullSync,
        CancellationToken ct)
    {
        var cacheIsStale = forceFullSync
            || string.IsNullOrEmpty(profile.OrganizationsJson)
            || profile.OrganizationsSyncedAt is null
            || DateTimeOffset.UtcNow - profile.OrganizationsSyncedAt > OrganizationsCacheTtl;

        if (!cacheIsStale)
        {
            var cached = JsonSerializer.Deserialize<List<AdoOrganizationRef>>(profile.OrganizationsJson!);
            if (cached is { Count: > 0 })
            {
                return cached.Select(o => o.Name).ToList();
            }
        }

        var manuallyAdded = string.IsNullOrEmpty(profile.OrganizationsJson)
            ? []
            : JsonSerializer.Deserialize<List<AdoOrganizationRef>>(profile.OrganizationsJson!) ?? [];

        var organizations = await DiscoverOrganizationsAsync(profile.AdoUserId, accessToken, ct);
        var merged = organizations
            .Select(o => o.Name)
            .Concat(manuallyAdded.Select(o => o.Name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        await PersistOrganizationsAsync(profile, merged);
        return merged;
    }

    /// <summary>
    /// Discovers every organization the user's PAT can reach, via the accounts API followed by a
    /// cheap "list projects" probe per candidate — the accounts API alone isn't trustworthy since a
    /// PAT scoped to a single organization can still list others there that it can't actually call.
    /// </summary>
    private async Task<List<AdoOrganizationRef>> DiscoverOrganizationsAsync(string memberId, string accessToken, CancellationToken ct)
    {
        var candidates = await adoClient.GetAccountsAsync(accessToken, memberId, ct);
        var usable = new List<AdoOrganizationRef>();

        foreach (var candidate in candidates)
        {
            if (await ProbeOrganizationAsync(candidate.AccountName, accessToken, ct))
            {
                usable.Add(new AdoOrganizationRef(candidate.AccountName));
            }
        }

        return usable;
    }

    /// <summary>
    /// Checks whether the PAT can actually reach the given organization — a single cheap
    /// <c>GET _apis/projects?$top=1</c> call. Used both for auto-discovered candidates and for
    /// manually-added organization names.
    /// </summary>
    private async Task<bool> ProbeOrganizationAsync(string organization, string accessToken, CancellationToken ct)
    {
        try
        {
            await adoClient.GetProjectsAsync(accessToken, organization, ct);
            return true;
        }
        catch (HttpRequestException ex)
        {
            // Any non-2xx here (401/403 access denied, 404 unknown org name, etc.) means this
            // organization isn't usable with the stored PAT — unlike the outer sync's 401-only
            // check, this must not be narrowed to 401 alone, since an inaccessible/nonexistent
            // organization is expected and shouldn't be conflated with "the whole PAT is invalid".
            logger.LogInformation(ex, "[ADO] Organization '{Organization}' is not reachable by the stored PAT — dropping it", organization);
            return false;
        }
    }

    private async Task PersistOrganizationsAsync(AdoProfile profile, List<string> organizations)
    {
        profile.OrganizationsJson = JsonSerializer.Serialize(organizations.Select(o => new AdoOrganizationRef(o)).ToList());
        profile.OrganizationsSyncedAt = DateTimeOffset.UtcNow;
        await repository.UpdateAsync(profile);
    }

    /// <summary>
    /// Returns the cached project list from <see cref="AdoProfile.ProjectsJson"/> when it's still
    /// fresh, otherwise re-discovers it (one <see cref="IAdoClient.GetProjectsAsync"/> call per
    /// organization) and persists the refreshed cache — saving discovery calls on every
    /// normal/incremental sync.
    /// </summary>
    private async Task<IReadOnlyList<AdoProjectRef>> ResolveProjectsAsync(
        AdoProfile profile,
        string accessToken,
        IReadOnlyList<string> organizations,
        bool forceFullSync,
        CancellationToken ct)
    {
        var cacheIsStale = forceFullSync
            || string.IsNullOrEmpty(profile.ProjectsJson)
            || profile.ProjectsSyncedAt is null
            || DateTimeOffset.UtcNow - profile.ProjectsSyncedAt > ProjectsCacheTtl;

        if (!cacheIsStale)
        {
            var cached = JsonSerializer.Deserialize<List<AdoProjectRef>>(profile.ProjectsJson!);
            if (cached is { Count: > 0 })
            {
                return cached;
            }
        }

        var projectRefs = new List<AdoProjectRef>();
        foreach (var organization in organizations)
        {
            var projects = await adoClient.GetProjectsAsync(accessToken, organization, ct);
            projectRefs.AddRange(projects.Select(p => new AdoProjectRef(organization, p.Id, p.Name)));
        }

        profile.ProjectsJson = JsonSerializer.Serialize(projectRefs);
        profile.ProjectsSyncedAt = DateTimeOffset.UtcNow;
        await repository.UpdateAsync(profile);

        return projectRefs;
    }

    /// <summary>
    /// Runs the work item WIQL+batch and the two PR searches (creator/reviewer) for a single
    /// project — 4 calls total (1 WIQL + 1 batch + 2 PR searches), the unit of parallelism across
    /// projects in <see cref="SyncWorkItemsAsync"/>.
    /// </summary>
    private async Task<(List<(AdoWorkItemDTO WorkItem, string Organization)> WorkItems, List<(AdoPullRequestDTO PullRequest, string Organization, InboxReason Reason)> PullRequests)> SyncProjectAsync(
        AdoProfile profile,
        string accessToken,
        AdoProjectRef project,
        DateTimeOffset? updatedSince,
        bool isInitialSync,
        CancellationToken ct)
    {
        var wiql = BuildWiql(updatedSince, isInitialSync);
        var ids = await adoClient.QueryWorkItemIdsAsync(accessToken, project.Organization, project.Name, wiql, ct);
        var workItems = ids.Count == 0
            ? []
            : (await adoClient.GetWorkItemsBatchAsync(accessToken, project.Organization, project.Name, ids, ct))
                .Select(w => (w, project.Organization)).ToList();

        // Two separate searches (creatorId / reviewerId) rather than one, since Azure DevOps'
        // pull request search criteria only accepts one identity filter per call — the search also
        // doubles as reason-inference: whichever call a PR came from tells us Authored vs
        // ReviewRequested without needing extra client-side comparisons.
        var authored = await adoClient.GetPullRequestsAsync(
            accessToken, project.Organization, project.Name, creatorId: profile.AdoUserId, ct: ct);
        var reviewRequested = await adoClient.GetPullRequestsAsync(
            accessToken, project.Organization, project.Name, reviewerId: profile.AdoUserId, ct: ct);

        var seenIds = new HashSet<int>();
        var pullRequests = new List<(AdoPullRequestDTO, string, InboxReason)>();
        foreach (var pr in authored)
        {
            if (seenIds.Add(pr.PullRequestId))
            {
                pullRequests.Add((pr, project.Organization, InboxReason.Authored));
            }
        }
        foreach (var pr in reviewRequested)
        {
            if (seenIds.Add(pr.PullRequestId))
            {
                pullRequests.Add((pr, project.Organization, InboxReason.ReviewRequested));
            }
        }

        return (workItems, pullRequests);
    }

    /// <summary>    /// Builds the WIQL used to find work items "assigned to or authored by" the current user. A
    /// first-time/full sync has no incremental checkpoint, so it isn't date-bounded at all — there's
    /// no "open work items only" equivalent (state is process-template specific), so the initial
    /// sync is simply unbounded by date.
    /// </summary>
    private static string BuildWiql(DateTimeOffset? updatedSince, bool isInitialSync)
    {
        var where = "([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me)";
        if (!isInitialSync && updatedSince is { } since)
        {
            // WIQL date literals are 'YYYY-MM-DD' — no time-of-day precision.
            where += $" AND [System.ChangedDate] >= '{since:yyyy-MM-dd}'";
        }

        return $"SELECT [System.Id] FROM WorkItems WHERE {where} ORDER BY [System.ChangedDate] DESC";
    }

    private async Task UpsertWorkItemsAsync(AdoProfile profile, List<(AdoWorkItemDTO WorkItem, string Organization)> workItems)
    {
        if (workItems.Count == 0)
        {
            return;
        }

        var repositories = workItems.Select(w => BuildWorkItemRepository(w.Organization, w.WorkItem)).Distinct().ToList();
        var externalIds = workItems.Select(w => w.WorkItem.Id.ToString()).Distinct().ToList();

        var existingItems = await inboxItemRepository.GetExistingItemsAsync(
            profile.UserId, ItemSource.Ado, ItemType.WorkItem, repositories, externalIds);
        var existingByKey = existingItems.ToDictionary(i => (i.Repository!, i.ExternalId!));

        var newItems = new List<InboxItem>();
        var updatedCount = 0;

        foreach (var (workItem, organization) in workItems)
        {
            var key = (BuildWorkItemRepository(organization, workItem), workItem.Id.ToString());
            if (existingByKey.TryGetValue(key, out var existing))
            {
                if (UpdateExistingWorkItem(existing, workItem))
                {
                    updatedCount++;
                }
            }
            else
            {
                newItems.Add(CreateWorkItem(profile, organization, workItem));
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
            "[ADO] Upserted work items for {AdoLogin}: {NewCount} new, {UpdatedCount} updated",
            profile.AdoLogin, newItems.Count, updatedCount);
    }

    private async Task UpsertPullRequestsAsync(AdoProfile profile, List<(AdoPullRequestDTO PullRequest, string Organization, InboxReason Reason)> pullRequests)
    {
        if (pullRequests.Count == 0)
        {
            return;
        }

        var repositories = pullRequests.Select(p => BuildPrRepository(p.Organization, p.PullRequest)).Distinct().ToList();
        var externalIds = pullRequests.Select(p => p.PullRequest.PullRequestId.ToString()).Distinct().ToList();

        var existingItems = await inboxItemRepository.GetExistingItemsAsync(
            profile.UserId, ItemSource.Ado, ItemType.PR, repositories, externalIds);
        var existingByKey = existingItems.ToDictionary(i => (i.Repository!, i.ExternalId!));

        var newItems = new List<InboxItem>();
        var updatedCount = 0;

        foreach (var (pr, organization, reason) in pullRequests)
        {
            var key = (BuildPrRepository(organization, pr), pr.PullRequestId.ToString());
            if (existingByKey.TryGetValue(key, out var existing))
            {
                if (UpdateExistingPullRequest(existing, pr))
                {
                    updatedCount++;
                }
            }
            else
            {
                newItems.Add(CreatePullRequest(profile, organization, pr, reason));
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
            "[ADO] Upserted pull requests for {AdoLogin}: {NewCount} new, {UpdatedCount} updated",
            profile.AdoLogin, newItems.Count, updatedCount);
    }

    /// <summary>"{organization}/{project}/{repo}" — disambiguates repos with the same name across different ADO projects and organizations.</summary>
    private static string BuildPrRepository(string organization, AdoPullRequestDTO pr) => $"{organization}/{pr.Repository.Project.Name}/{pr.Repository.Name}";

    /// <summary>"{organization}/{project}" — disambiguates projects with the same name across different ADO organizations.</summary>
    private static string BuildWorkItemRepository(string organization, AdoWorkItemDTO workItem) => $"{organization}/{workItem.Fields.TeamProject}";

    private static bool UpdateExistingWorkItem(InboxItem existing, AdoWorkItemDTO workItem)
    {
        var isClosed = IsClosedWorkItem(workItem);
        var wasClosed = existing.State.IsClosed;
        var hasActivityChange = existing.ActivityAt != workItem.Fields.ChangedDate;
        var closedStateChanged = isClosed != wasClosed;

        if (!hasActivityChange && !closedStateChanged)
        {
            return false;
        }

        existing.Title = workItem.Fields.Title;
        existing.ActivityAt = workItem.Fields.ChangedDate ?? existing.ActivityAt;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.State.IsClosed = isClosed;
        if (closedStateChanged && isClosed)
        {
            existing.State.IsDone = true;
        }
        else if (hasActivityChange || closedStateChanged)
        {
            existing.State.IsDone = false;
        }

        return true;
    }

    private static InboxItem CreateWorkItem(AdoProfile profile, string organization, AdoWorkItemDTO workItem)
    {
        var isClosed = IsClosedWorkItem(workItem);
        return new InboxItem
        {
            InboxId = profile.UserId,
            Source = ItemSource.Ado,
            Type = ItemType.WorkItem,
            ExternalId = workItem.Id.ToString(),
            Repository = BuildWorkItemRepository(organization, workItem),
            Title = workItem.Fields.Title,
            Reason = InferWorkItemReason(workItem, profile.AdoUserId),
            ActivityAt = workItem.Fields.ChangedDate ?? DateTimeOffset.UtcNow,
            CreatedAt = workItem.Fields.CreatedDate ?? DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState { IsDone = isClosed, IsClosed = isClosed }
        };
    }

    private static bool UpdateExistingPullRequest(InboxItem existing, AdoPullRequestDTO pr)
    {
        var isClosed = IsClosedPullRequest(pr);
        var wasClosed = existing.State.IsClosed;
        var activity = pr.ClosedDate ?? pr.CreationDate;
        var hasActivityChange = existing.ActivityAt != activity;
        var closedStateChanged = isClosed != wasClosed;

        if (!hasActivityChange && !closedStateChanged)
        {
            return false;
        }

        existing.Title = pr.Title;
        existing.ActivityAt = activity;
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        existing.State.IsClosed = isClosed;
        if (closedStateChanged && isClosed)
        {
            existing.State.IsDone = true;
        }
        else if (hasActivityChange || closedStateChanged)
        {
            existing.State.IsDone = false;
        }

        return true;
    }

    private static InboxItem CreatePullRequest(AdoProfile profile, string organization, AdoPullRequestDTO pr, InboxReason reason)
    {
        var isClosed = IsClosedPullRequest(pr);
        return new InboxItem
        {
            InboxId = profile.UserId,
            Source = ItemSource.Ado,
            Type = ItemType.PR,
            ExternalId = pr.PullRequestId.ToString(),
            Repository = BuildPrRepository(organization, pr),
            Title = pr.Title,
            Reason = reason,
            ActivityAt = pr.ClosedDate ?? pr.CreationDate,
            CreatedAt = pr.CreationDate,
            UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState { IsDone = isClosed, IsClosed = isClosed }
        };
    }

    private static bool IsClosedWorkItem(AdoWorkItemDTO workItem) =>
        workItem.Fields.State is { } state && ClosedWorkItemStates.Contains(state, StringComparer.OrdinalIgnoreCase);

    private static bool IsClosedPullRequest(AdoPullRequestDTO pr) =>
        !string.Equals(pr.Status, "active", StringComparison.OrdinalIgnoreCase);

    private static InboxReason InferWorkItemReason(AdoWorkItemDTO workItem, string adoUserId)
    {
        if (string.Equals(workItem.Fields.CreatedBy?.Id, adoUserId, StringComparison.OrdinalIgnoreCase))
        {
            return InboxReason.Authored;
        }

        return InboxReason.Assigned;
    }

    public async Task<IReadOnlyList<string>> GetOrganizationsAsync(long userId, CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId)
            ?? throw new BadRequestException("No Azure DevOps integration is connected.");

        if (string.IsNullOrEmpty(profile.OrganizationsJson))
        {
            return [];
        }

        var cached = JsonSerializer.Deserialize<List<AdoOrganizationRef>>(profile.OrganizationsJson);
        return cached?.Select(o => o.Name).ToList() ?? [];
    }

    public async Task<IReadOnlyList<string>> AddOrganizationAsync(long userId, string organizationName, CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId)
            ?? throw new BadRequestException("No Azure DevOps integration is connected.");

        var accessToken = profile.AccessToken
            ?? throw new BadRequestException("No Azure DevOps integration is connected.");

        if (!await ProbeOrganizationAsync(organizationName, accessToken, ct))
        {
            throw new BadRequestException($"The connected Azure DevOps PAT cannot access organization '{organizationName}'.");
        }

        var existing = string.IsNullOrEmpty(profile.OrganizationsJson)
            ? []
            : JsonSerializer.Deserialize<List<AdoOrganizationRef>>(profile.OrganizationsJson) ?? [];

        var merged = existing.Select(o => o.Name)
            .Append(organizationName)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        await PersistOrganizationsAsync(profile, merged);
        return merged;
    }

    private async Task MarkInvalidAsync(AdoProfile profile, Exception ex)
    {
        // The stored PAT was rejected by Azure DevOps — most likely expired/revoked. Flag it so the
        // user is prompted to reconnect rather than failing silently on every future sync attempt.
        logger.LogWarning(ex, "[ADO] Token rejected for {AdoLogin} — marking integration invalid", profile.AdoLogin);
        profile.Status = Sync.Domain.IntegrationStatus.Invalid;
        await repository.UpdateAsync(profile);
    }

    private static bool IsUnauthorized(Exception ex) =>
        ex is HttpRequestException { StatusCode: System.Net.HttpStatusCode.Unauthorized };
}
