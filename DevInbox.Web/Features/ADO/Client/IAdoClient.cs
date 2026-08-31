using DevInbox.Web.Features.ADO.Client.DTO;

namespace DevInbox.Web.Features.ADO.Client;

public interface IAdoClient
{
    /// <summary>
    /// Resolves the profile of the PAT's owning user via <c>GET _apis/profile/profiles/me</c> —
    /// used to validate a PAT at connect time (a bad/expired PAT fails this call) and to seed the
    /// stored <see cref="Domain.AdoProfile"/>'s identity fields.
    /// </summary>
    Task<AdoUserProfileDTO> GetCurrentUserProfileAsync(string personalAccessToken, CancellationToken ct = default);

    /// <summary>
    /// Lists every Azure DevOps organization ("account") the given member belongs to, via
    /// <c>GET _apis/accounts?memberId={memberId}</c> — used to auto-discover organizations at
    /// connect time without requiring the user to type one in. Only as reliable as the PAT's own
    /// scope: a PAT restricted to one organization may still list others here that it can't
    /// actually reach, so callers must probe each result (see <see cref="GetProjectsAsync"/>)
    /// before trusting it.
    /// </summary>
    Task<IReadOnlyList<AdoAccountDTO>> GetAccountsAsync(string personalAccessToken, string memberId, CancellationToken ct = default);

    /// <summary>
    /// Lists every project visible to the given PAT within the given organization, via
    /// <c>GET {organization}/_apis/projects</c>. This is the set of projects the user is
    /// "part of" — no separate membership check is needed since Azure DevOps already scopes the
    /// response to what the PAT can see.
    /// </summary>
    Task<IReadOnlyList<AdoProjectDTO>> GetProjectsAsync(string personalAccessToken, string organization, CancellationToken ct = default);

    /// <summary>
    /// Runs a WIQL query scoped to a single project and returns the matching work item ids —
    /// <c>POST {organization}/{project}/_apis/wit/wiql</c>. WIQL never returns field values, only
    /// ids/urls, hence the separate <see cref="GetWorkItemsBatchAsync"/> call to hydrate them.
    /// </summary>
    Task<IReadOnlyList<int>> QueryWorkItemIdsAsync(string personalAccessToken, string organization, string project, string wiql, CancellationToken ct = default);

    /// <summary>
    /// Hydrates up to 200 work item ids at once via <c>POST {organization}/{project}/_apis/wit/workitemsbatch</c>
    /// — a single call instead of one GET per id, keeping the sync's total call count low.
    /// </summary>
    Task<IReadOnlyList<AdoWorkItemDTO>> GetWorkItemsBatchAsync(string personalAccessToken, string organization, string project, IReadOnlyCollection<int> ids, CancellationToken ct = default);

    /// <summary>
    /// Searches pull requests across every repository in a project via
    /// <c>GET {organization}/{project}/_apis/git/pullrequests</c> — project-scoped is the broadest
    /// filter Azure DevOps offers (no true org-wide PR search), but still covers every repo in the
    /// project in one call rather than one call per repository.
    /// </summary>
    Task<IReadOnlyList<AdoPullRequestDTO>> GetPullRequestsAsync(
        string personalAccessToken,
        string organization,
        string project,
        string? reviewerId = null,
        string? creatorId = null,
        CancellationToken ct = default);

    /// <summary>
    /// Fetches a single work item with every field and relation (parent link included) via
    /// <c>GET {organization}/_apis/wit/workitems/{id}?$expand=all</c> — used for the inbox detail
    /// view, where the full description/relations are worth the extra call, unlike the lightweight
    /// batch fetch used during sync.
    /// </summary>
    Task<AdoWorkItemDTO> GetWorkItemDetailAsync(string personalAccessToken, string organization, int workItemId, CancellationToken ct = default);

    /// <summary>
    /// Lists a work item's comments via <c>GET {organization}/{project}/_apis/wit/workitems/{id}/comments</c>
    /// (api-version 7.1-preview.4 — the comments endpoint isn't yet GA on 7.1), newest first.
    /// </summary>
    Task<IReadOnlyList<AdoWorkItemCommentDTO>> GetWorkItemCommentsAsync(string personalAccessToken, string organization, string project, int workItemId, CancellationToken ct = default);

    /// <summary>
    /// Fetches a single pull request (including its description) via
    /// <c>GET {organization}/{project}/_apis/git/repositories/{repository}/pullrequests/{id}</c> —
    /// Azure DevOps accepts the repository name in place of its GUID here, so no separate
    /// name-to-id lookup is needed.
    /// </summary>
    Task<AdoPullRequestDTO> GetPullRequestDetailAsync(string personalAccessToken, string organization, string project, string repository, int pullRequestId, CancellationToken ct = default);

    /// <summary>
    /// Lists a pull request's comment threads via
    /// <c>GET {organization}/{project}/_apis/git/repositories/{repository}/pullRequests/{id}/threads</c>,
    /// flattened to individual comments (system-generated status threads are filtered out by the caller).
    /// </summary>
    Task<IReadOnlyList<AdoPullRequestThreadDTO>> GetPullRequestThreadsAsync(string personalAccessToken, string organization, string project, string repository, int pullRequestId, CancellationToken ct = default);
}