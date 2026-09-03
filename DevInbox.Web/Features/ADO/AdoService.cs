using DevInbox.Web.Common.Utils;
using System.Text.Json;
using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Config;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.Extensions.Options;
using InboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using ItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using ItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Features.ADO;

public class AdoService(
    IAdoProfileRepository repository,
    IInboxItemRepository inboxItemRepository,
    IAdoClient adoClient,
    IOptions<AdoOptions> options,
    ILogger<AdoService> logger) : IService, IAdoService
{
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

        // Both work item and PR Repository encodings start with "{organization}/..." — see
        // BuildWorkItemRepository/BuildPrRepository — so the organization can be extracted before
        // knowing which shape the rest of the string has.
        var organization = item.Repository.Split('/', 2)[0];

        // item.InboxId doubles as the owning user's id (Inbox's key is the user's own id).
        var profile = await repository.GetByUserIdAndOrganizationAsync(item.InboxId, organization)
            ?? throw new InvalidOperationException($"No ADO profile found for user {item.InboxId} and organization '{organization}'.");

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for ADO profile {profile.AdoLogin}.");

        try
        {
            return item.Type == ItemType.PR
                ? await GetPullRequestDetailsAsync(accessToken, item, ct)
                : await GetWorkItemDetailsAsync(accessToken, item, ct);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // The work item/PR/project no longer exists on the ADO side (deleted, project removed,// permissions revoked, ...) 
            logger.LogInformation(
                "[ADO] Item {ItemId} (external id {ExternalId}) no longer exists on Azure DevOps — removing stale inbox item",
                item.Id, item.ExternalId);
            await inboxItemRepository.DeleteAsync(item);
            throw new NotFoundException($"ADO item {item.ExternalId} no longer exists and has been removed from your inbox.");
        }
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
            DescriptionFormat = ContentFormatDetector.Detect(workItem.Fields.Description),
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
                    BodyFormat = ContentFormatDetector.Detect(c.Text),
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
                BodyFormat = ContentFormatDetector.Detect(c.Content),
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
            DescriptionFormat = ContentFormatDetector.Detect(pr.Description),
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
        // Each profile is a distinct organization+PAT pair — sync every connected organization
        // independently so one org's failure (invalid PAT, unauthorized, etc.) doesn't block the
        // others.
        var profiles = await repository.GetAllByUserIdAsync(userId);
        if (profiles.Count == 0)
        {
            logger.LogWarning("No ADO profile found for user {UserId}", userId);
            return;
        }

        foreach (var profile in profiles)
        {
            await SyncProfileAsync(profile, updatedSince, forceFullSync, ct);
        }
    }

    private async Task SyncProfileAsync(
        AdoProfile profile,
        DateTimeOffset? updatedSince,
        bool forceFullSync,
        CancellationToken ct)
    {
        if (profile.Status != Sync.Domain.IntegrationStatus.Active)
        {
            logger.LogWarning("ADO profile for user {UserId}/organization {Organization} is not active (status: {Status})", profile.UserId, profile.Organization, profile.Status);
            return;
        }

        var accessToken = profile.AccessToken
            ?? throw new InvalidOperationException($"No stored access token for ADO profile {profile.AdoLogin}.");

        // A first-ever sync (updatedSince is null) has no incremental checkpoint to filter by, so
        // it's treated the same as a forced full sync for the purposes of scoping the WIQL query.
        var isInitialSync = updatedSince is null || forceFullSync;

        logger.LogInformation(
            "[ADO] Starting {SyncKind} sync for {AdoLogin} (organization {Organization})",
            isInitialSync ? "initial/full" : $"incremental (since {updatedSince:O})", profile.AdoLogin, profile.Organization);

        IReadOnlyList<AdoProjectRef> projects;
        try
        {
            projects = await ResolveProjectsAsync(profile, accessToken, forceFullSync, ct);
        }
        catch (Exception ex) when (IsUnauthorized(ex))
        {
            await MarkInvalidAsync(profile, ex);
            return;
        }

        if (projects.Count == 0)
        {
            logger.LogInformation("[ADO] No accessible projects for {AdoLogin} (organization {Organization}) — nothing to sync", profile.AdoLogin, profile.Organization);
            return;
        }

        try
        {
            var results = await Task.WhenAll(projects.Select(project => SyncProjectAsync(profile, accessToken, project, updatedSince, isInitialSync, ct)));

            var workItems = results.SelectMany(r => r.WorkItems).ToList();
            var pullRequests = results.SelectMany(r => r.PullRequests).ToList();
            var staleProjectCount = results.Count(r => r.ProjectIsStale);

            logger.LogInformation(
                "[ADO] Fetched {WorkItemCount} work item(s) and {PrCount} pull request(s) across {ProjectCount} project(s) for {AdoLogin} (organization {Organization}){StaleSuffix}",
                workItems.Count, pullRequests.Count, projects.Count, profile.AdoLogin, profile.Organization,
                staleProjectCount > 0 ? $" ({staleProjectCount} stale project(s) skipped, cache invalidated)" : string.Empty);

            await UpsertWorkItemsAsync(profile, workItems);
            await UpsertPullRequestsAsync(profile, pullRequests);

            // At least one cached project 404'd (renamed/deleted/access revoked since it was last
            // discovered) — drop the cache so the *next* sync re-runs discovery instead of hitting
            // the same dead project on every future sync until the 24h TTL happens to expire.
            if (staleProjectCount > 0)
            {
                profile.ProjectsJson = null;
                profile.ProjectsSyncedAt = null;
                await repository.UpdateAsync(profile);
            }
        }
        catch (Exception ex) when (IsUnauthorized(ex))
        {
            await MarkInvalidAsync(profile, ex);
            return;
        }

        logger.LogInformation("[ADO] Synchronization completed for {AdoLogin} (organization {Organization})", profile.AdoLogin, profile.Organization);
    }

    /// <summary>
    /// Returns the cached project list from <see cref="AdoProfile.ProjectsJson"/> when it's still
    /// fresh, otherwise re-discovers it (a single <see cref="IAdoClient.GetProjectsAsync"/> call for
    /// this profile's organization) and persists the refreshed cache — saving a discovery call on
    /// every normal/incremental sync.
    /// </summary>
    private async Task<IReadOnlyList<AdoProjectRef>> ResolveProjectsAsync(
        AdoProfile profile,
        string accessToken,
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

        var projects = await adoClient.GetProjectsAsync(accessToken, profile.Organization, ct);
        var projectRefs = projects.Select(p => new AdoProjectRef(p.Id, p.Name)).DistinctBy(p => p.Id).ToList();

        profile.ProjectsJson = JsonSerializer.Serialize(projectRefs);
        profile.ProjectsSyncedAt = DateTimeOffset.UtcNow;
        await repository.UpdateAsync(profile);

        return projectRefs;
    }

    /// <summary>
    /// Runs the work item WIQL+batch and the two PR searches (creator/reviewer) for a single
    /// project — 4 calls total (1 WIQL + 1 batch + 2 PR searches), the unit of parallelism across
    /// projects in <see cref="SyncProfileAsync"/>. A 404 anywhere in here means the project itself
    /// is gone/inaccessible (renamed, deleted, permissions revoked — the cached project list is
    /// stale) rather than a real error, so it's isolated to this one project (<see cref="ProjectIsStale"/>)
    /// instead of failing the whole <c>Task.WhenAll</c> batch and losing every other project's results.
    /// </summary>
    private async Task<(List<AdoWorkItemDTO> WorkItems, List<(AdoPullRequestDTO PullRequest, InboxReason Reason)> PullRequests, bool ProjectIsStale)> SyncProjectAsync(
        AdoProfile profile,
        string accessToken,
        AdoProjectRef project,
        DateTimeOffset? updatedSince,
        bool isInitialSync,
        CancellationToken ct)
    {
        try
        {
            var wiql = BuildWiql(updatedSince, isInitialSync);
            var ids = await adoClient.QueryWorkItemIdsAsync(accessToken, profile.Organization, project.Name, wiql, ct);
            var workItems = ids.Count == 0
                ? []
                : (await adoClient.GetWorkItemsBatchAsync(accessToken, profile.Organization, project.Name, ids, ct)).ToList();

            // Two separate searches (creatorId / reviewerId) rather than one, since Azure DevOps'
            // pull request search criteria only accepts one identity filter per call — the search also
            // doubles as reason-inference: whichever call a PR came from tells us Authored vs
            // ReviewRequested without needing extra client-side comparisons. A first-ever sync only
            // asks for currently-active PRs (mirrors GitHub's "is:open" initial-sync bound); an
            // incremental sync widens to "all" statuses so a close/abandon that happened since the last
            // sync still surfaces (see IsClosedPullRequest/CreatePullRequest for how that's handled).
            var searchStatus = isInitialSync ? AdoPullRequestSearchStatus.Active : AdoPullRequestSearchStatus.All;
            var authored = await adoClient.GetPullRequestsAsync(
                accessToken, profile.Organization, project.Name, searchStatus, creatorId: profile.AdoUserId, ct: ct);
            var reviewRequested = await adoClient.GetPullRequestsAsync(
                accessToken, profile.Organization, project.Name, searchStatus, reviewerId: profile.AdoUserId, ct: ct);

            var seenIds = new HashSet<int>();
            var pullRequests = new List<(AdoPullRequestDTO, InboxReason)>();
            foreach (var pr in authored)
            {
                if (seenIds.Add(pr.PullRequestId))
                {
                    pullRequests.Add((pr, InboxReason.Authored));
                }
            }
            foreach (var pr in reviewRequested)
            {
                if (seenIds.Add(pr.PullRequestId))
                {
                    pullRequests.Add((pr, InboxReason.ReviewRequested));
                }
            }

            return (workItems, pullRequests, false);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            logger.LogWarning(
                "[ADO] Project '{Project}' ({Organization}) returned 404 — likely renamed/deleted/inaccessible since it was last discovered; skipping it for this sync",
                project.Name, profile.Organization);
            return ([], [], true);
        }
    }

    /// <summary>
    /// Builds the WIQL used to find work items "assigned to or authored by" the current user.
    /// Work items have no universal "open" state across Azure DevOps process templates, so unlike
    /// GitHub's PR-based initial sync (which just asks for <c>is:open</c>), a first-time sync is
    /// bounded by a rolling date cutoff instead (<see cref="AdoOptions.InitialSyncLookbackDays"/>) —
    /// this keeps the initial call's payload/cost bounded regardless of project age, without relying
    /// on state names that vary per template (Agile/Scrum/Basic/CMMI).
    /// </summary>
    private string BuildWiql(DateTimeOffset? updatedSince, bool isInitialSync)
    {
        var where = "([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me)";
        var since = isInitialSync
            ? DateTimeOffset.UtcNow.AddDays(-options.Value.InitialSyncLookbackDays)
            : updatedSince;
        if (since is { } cutoff)
        {
            // WIQL date literals are 'YYYY-MM-DD' — no time-of-day precision.
            where += $" AND [System.ChangedDate] >= '{cutoff:yyyy-MM-dd}'";
        }

        return $"SELECT [System.Id] FROM WorkItems WHERE {where} ORDER BY [System.ChangedDate] DESC";
    }

    private async Task UpsertWorkItemsAsync(AdoProfile profile, List<AdoWorkItemDTO> workItems)
    {
        if (workItems.Count == 0)
        {
            return;
        }

        var repositories = workItems.Select(w => BuildWorkItemRepository(profile.Organization, w)).Distinct().ToList();
        var externalIds = workItems.Select(w => w.Id.ToString()).Distinct().ToList();

        var existingItems = await inboxItemRepository.GetExistingItemsAsync(
            profile.UserId, ItemSource.Ado, ItemType.WorkItem, repositories, externalIds);
        var existingByKey = existingItems.ToDictionary(i => (i.Repository!, i.ExternalId!));

        var newItems = new List<InboxItem>();
        var newItemKeys = new HashSet<(string Repository, string ExternalId)>();
        var updatedCount = 0;

        foreach (var workItem in workItems)
        {
            var key = (BuildWorkItemRepository(profile.Organization, workItem), workItem.Id.ToString());
            if (existingByKey.TryGetValue(key, out var existing))
            {
                if (UpdateExistingWorkItem(existing, workItem))
                {
                    updatedCount++;
                }
            }
            else if (newItemKeys.Add(key))
            {
                // Guards against the same work item id appearing more than once in this batch
                // (e.g. a project list momentarily containing a duplicate entry) — without this,
                // every duplicate occurrence would otherwise create its own separate InboxItem row,
                // since existingByKey only reflects rows already persisted before this call started.
                newItems.Add(CreateWorkItem(profile, profile.Organization, workItem));
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

    private async Task UpsertPullRequestsAsync(AdoProfile profile, List<(AdoPullRequestDTO PullRequest, InboxReason Reason)> pullRequests)
    {
        if (pullRequests.Count == 0)
        {
            return;
        }

        var repositories = pullRequests.Select(p => BuildPrRepository(profile.Organization, p.PullRequest)).Distinct().ToList();
        var externalIds = pullRequests.Select(p => p.PullRequest.PullRequestId.ToString()).Distinct().ToList();

        var existingItems = await inboxItemRepository.GetExistingItemsAsync(
            profile.UserId, ItemSource.Ado, ItemType.PR, repositories, externalIds);
        var existingByKey = existingItems.ToDictionary(i => (i.Repository!, i.ExternalId!));

        var newItems = new List<InboxItem>();
        var newItemKeys = new HashSet<(string Repository, string ExternalId)>();
        var updatedCount = 0;

        foreach (var (pr, reason) in pullRequests)
        {
            var key = (BuildPrRepository(profile.Organization, pr), pr.PullRequestId.ToString());
            if (existingByKey.TryGetValue(key, out var existing))
            {
                if (UpdateExistingPullRequest(existing, pr))
                {
                    updatedCount++;
                }
            }
            else if (newItemKeys.Add(key))
            {
                // See the matching guard in UpsertWorkItemsAsync — protects against the same PR
                // appearing more than once in this batch (e.g. across duplicate project entries).
                newItems.Add(CreatePullRequest(profile, profile.Organization, pr, reason));
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
            Reason = InferWorkItemReason(workItem, profile),
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
        AdoPullRequestSearchStatusExtensions.ParseStatus(pr.Status) != AdoPullRequestSearchStatus.Active;

    /// <summary>
    /// "Assigned to me" vs "authored by me": <see cref="AdoWorkItemFieldsDTO.AssignedTo"/> takes
    /// priority over <see cref="AdoWorkItemFieldsDTO.CreatedBy"/> — a work item the current user
    /// both created and is currently assigned to is more actionable as "assigned to me" than
    /// "authored by me" (mirrors how GitHub's reason inference treats an active review/assignment
    /// as more relevant than plain authorship). Falls back to "authored" only when the current user
    /// isn't the assignee, and to "assigned" if neither identity matches (WIQL only ever returns
    /// items matching <c>AssignedTo = @Me OR CreatedBy = @Me</c>, so one of the two always should).
    /// Matching is done via identity id primarily, but some Azure DevOps organizations (notably ones
    /// migrated between identity providers) return a different "id" from <c>_apis/connectionData</c>
    /// than the one embedded in work item identity-ref fields — so the profile's stored email
    /// (<see cref="AdoProfile.AdoEmail"/>) is checked too as a resilient fallback, since
    /// <c>uniqueName</c> stays stable across both surfaces.
    /// </summary>
    private static InboxReason InferWorkItemReason(AdoWorkItemDTO workItem, AdoProfile profile)
    {
        if (IsMe(workItem.Fields.AssignedTo, profile))
        {
            return InboxReason.Assigned;
        }

        if (IsMe(workItem.Fields.CreatedBy, profile))
        {
            return InboxReason.Authored;
        }

        return InboxReason.Assigned;
    }

    private static bool IsMe(AdoIdentityRefDTO? identity, AdoProfile profile) =>
        string.Equals(identity?.Id, profile.AdoUserId, StringComparison.OrdinalIgnoreCase)
        || (!string.IsNullOrEmpty(profile.AdoEmail) && string.Equals(identity?.UniqueName, profile.AdoEmail, StringComparison.OrdinalIgnoreCase));

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
