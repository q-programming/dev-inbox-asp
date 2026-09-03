using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using DevInbox.Web.Features.ADO.Client.DTO;

namespace DevInbox.Web.Features.ADO.Client;

public class AdoClient(HttpClient client) : IAdoClient, IService
{
    /// <summary>
    /// Work item batch endpoint hard cap — see
    /// https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-items-batch.
    /// </summary>
    private const int WorkItemBatchSize = 200;

    private static readonly string[] WorkItemFields =
    [
        "System.Title",
        "System.WorkItemType",
        "System.State",
        "System.TeamProject",
        "System.AreaPath",
        "System.Tags",
        "System.AssignedTo",
        "System.CreatedBy",
        "System.CreatedDate",
        "System.ChangedDate"
    ];

    public async Task<AdoConnectionDataDTO> GetConnectionDataAsync(string personalAccessToken, string organization, CancellationToken ct = default)
    {
        using var response = await SendAsync(
            HttpMethod.Get,
            $"{organization}/_apis/connectionData?api-version=7.0-preview",
            personalAccessToken,
            ct: ct);

        return await response.Content.ReadFromJsonAsync<AdoConnectionDataDTO>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Azure DevOps returned an empty connection data response.");
    }

    public async Task<IReadOnlyList<AdoProjectDTO>> GetProjectsAsync(string personalAccessToken, string organization, CancellationToken ct = default)
    {
        // $top=1000 — Azure DevOps' page size cap for this endpoint; comfortably above any
        // realistic single-organization project count, so pagination isn't needed in practice.
        using var response = await SendAsync(
            HttpMethod.Get,
            $"{organization}/_apis/projects?api-version=7.1&$top=1000",
            personalAccessToken,
            ct: ct);

        var result = await response.Content.ReadFromJsonAsync<AdoProjectsResponseDTO>(cancellationToken: ct);
        return result?.Value ?? [];
    }

    public async Task<IReadOnlyList<int>> QueryWorkItemIdsAsync(string personalAccessToken, string organization, string project, string wiql, CancellationToken ct = default)
    {
        var body = new AdoWiqlRequestDTO { Query = wiql };
        using var response = await SendAsync(
            HttpMethod.Post,
            $"{organization}/{Uri.EscapeDataString(project)}/_apis/wit/wiql?api-version=7.1",
            personalAccessToken,
            body,
            ct);

        var result = await response.Content.ReadFromJsonAsync<AdoWiqlResultDTO>(cancellationToken: ct);
        return result?.WorkItems.Select(w => w.Id).ToList() ?? [];
    }

    public async Task<IReadOnlyList<AdoWorkItemDTO>> GetWorkItemsBatchAsync(
        string personalAccessToken,
        string organization,
        string project,
        IReadOnlyCollection<int> ids,
        CancellationToken ct = default)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var results = new List<AdoWorkItemDTO>(ids.Count);

        // A single WIQL query for one project realistically never exceeds 200 matches for a
        // "my work items" scope, but chunk defensively rather than assume that always holds.
        foreach (var chunk in ids.Chunk(WorkItemBatchSize))
        {
            var body = new AdoWorkItemsBatchRequestDTO { Ids = [.. chunk], Fields = [.. WorkItemFields] };
            using var response = await SendAsync(
                HttpMethod.Post,
                $"{organization}/{Uri.EscapeDataString(project)}/_apis/wit/workitemsbatch?api-version=7.1",
                personalAccessToken,
                body,
                ct);

            var page = await response.Content.ReadFromJsonAsync<AdoWorkItemsBatchResponseDTO>(cancellationToken: ct);
            if (page is not null)
            {
                results.AddRange(page.Value);
            }
        }

        return results;
    }

    public async Task<IReadOnlyList<AdoPullRequestDTO>> GetPullRequestsAsync(
        string personalAccessToken,
        string organization,
        string project,
        AdoPullRequestSearchStatus status = AdoPullRequestSearchStatus.All,
        string? reviewerId = null,
        string? creatorId = null,
        CancellationToken ct = default)
    {
        var query = new StringBuilder(
            $"{organization}/{Uri.EscapeDataString(project)}/_apis/git/pullrequests?api-version=7.1&searchCriteria.status={status.ToQueryValue()}");
        if (!string.IsNullOrEmpty(reviewerId))
        {
            query.Append("&searchCriteria.reviewerId=").Append(Uri.EscapeDataString(reviewerId));
        }
        if (!string.IsNullOrEmpty(creatorId))
        {
            query.Append("&searchCriteria.creatorId=").Append(Uri.EscapeDataString(creatorId));
        }

        using var response = await SendAsync(HttpMethod.Get, query.ToString(), personalAccessToken, ct: ct);

        var result = await response.Content.ReadFromJsonAsync<AdoPullRequestsResponseDTO>(cancellationToken: ct);
        return result?.Value ?? [];
    }

    public async Task<AdoWorkItemDTO> GetWorkItemDetailAsync(string personalAccessToken, string organization, int workItemId, CancellationToken ct = default)
    {
        using var response = await SendAsync(
            HttpMethod.Get,
            $"{organization}/_apis/wit/workitems/{workItemId}?$expand=all&api-version=7.1",
            personalAccessToken,
            ct: ct);

        return await response.Content.ReadFromJsonAsync<AdoWorkItemDTO>(cancellationToken: ct)
            ?? throw new InvalidOperationException($"Azure DevOps returned an empty work item for id {workItemId}.");
    }

    public async Task<IReadOnlyList<AdoWorkItemCommentDTO>> GetWorkItemCommentsAsync(string personalAccessToken, string organization, string project, int workItemId, CancellationToken ct = default)
    {
        using var response = await SendAsync(
            HttpMethod.Get,
            $"{organization}/{Uri.EscapeDataString(project)}/_apis/wit/workitems/{workItemId}/comments?api-version=7.1-preview.4",
            personalAccessToken,
            ct: ct);

        var result = await response.Content.ReadFromJsonAsync<AdoWorkItemCommentsResponseDTO>(cancellationToken: ct);
        return result?.Comments ?? [];
    }

    public async Task<AdoPullRequestDTO> GetPullRequestDetailAsync(string personalAccessToken, string organization, string project, string repository, int pullRequestId, CancellationToken ct = default)
    {
        using var response = await SendAsync(
            HttpMethod.Get,
            $"{organization}/{Uri.EscapeDataString(project)}/_apis/git/repositories/{Uri.EscapeDataString(repository)}/pullrequests/{pullRequestId}?api-version=7.1",
            personalAccessToken,
            ct: ct);

        return await response.Content.ReadFromJsonAsync<AdoPullRequestDTO>(cancellationToken: ct)
            ?? throw new InvalidOperationException($"Azure DevOps returned an empty pull request for id {pullRequestId}.");
    }

    public async Task<IReadOnlyList<AdoPullRequestThreadDTO>> GetPullRequestThreadsAsync(string personalAccessToken, string organization, string project, string repository, int pullRequestId, CancellationToken ct = default)
    {
        using var response = await SendAsync(
            HttpMethod.Get,
            $"{organization}/{Uri.EscapeDataString(project)}/_apis/git/repositories/{Uri.EscapeDataString(repository)}/pullRequests/{pullRequestId}/threads?api-version=7.1",
            personalAccessToken,
            ct: ct);

        var result = await response.Content.ReadFromJsonAsync<AdoPullRequestThreadsResponseDTO>(cancellationToken: ct);
        return result?.Value ?? [];
    }

    /// <summary>
    /// Sends a request authenticated with the given PAT via HTTP Basic auth (empty username, PAT as
    /// password — Azure DevOps PATs have no bearer-token scheme) and throws for any non-2xx status,
    /// so every caller gets consistent 401 detection for the "token rejected" sync path.
    /// </summary>
    private Task<HttpResponseMessage> SendAsync(
        HttpMethod method,
        string requestUri,
        string personalAccessToken,
        object? jsonBody = null,
        CancellationToken ct = default) => SendAsync(client, method, requestUri, personalAccessToken, jsonBody, ct);

    private static async Task<HttpResponseMessage> SendAsync(
        HttpClient httpClient,
        HttpMethod method,
        string requestUri,
        string personalAccessToken,
        object? jsonBody,
        CancellationToken ct)
    {
        using var request = new HttpRequestMessage(method, requestUri);
        var basicAuthValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{personalAccessToken}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuthValue);

        if (jsonBody is not null)
        {
            request.Content = JsonContent.Create(jsonBody);
        }

        var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        return response;
    }
}