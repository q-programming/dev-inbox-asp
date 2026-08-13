using System.Net.Http.Headers;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using GraphQL;
using GraphQL.Client.Http;
using GraphQL.Client.Serializer.SystemTextJson;

namespace DevInbox.Web.Features.GitHub.Client;

public class GitHubClient(HttpClient client, IHttpClientFactory httpClientFactory, ILogger<GitHubClient> logger) : IGitHubClient, IService
{
    private readonly GitHubPullRequestMapper _pullRequestMapper = new();

    /// <summary>GraphQL search results page size — GitHub caps "first" at 100 for search connections.</summary>
    private const int PageSize = 100;

    /// <summary>
    /// Safety cap on pages fetched per call. Only matters for a first-time sync with a wide lookback
    /// window; incremental syncs (updatedSince = last sync time) will normally be a single page.
    /// At 100/page this is 5,000 PRs — comfortably above what a single person is realistically
    /// involved in, so hitting it likely means the lookback window is too wide.
    /// </summary>
    private const int MaxPages = 50;

    public async Task<(GitHubUserProfileDTO Profile, string AccessToken)> GetCurrentUserAsync(string accessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "user");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var profile = await response.Content.ReadFromJsonAsync<GitHubUserProfileDTO>(cancellationToken: ct)
            ?? throw new InvalidOperationException("GitHub returned empty user profile.");

        return (profile, accessToken);
    }

    public Task<IReadOnlyList<GitHubPullRequestDTO>> GetPullRequestsInvolvingUserAsync(
        string accessToken,
        string searchQuery,
        CancellationToken ct = default) =>
        SearchAllPagesAsync(accessToken, searchQuery, ct);

    public async Task<GitHubPullRequestDetail> GetPullRequestDetailAsync(
        string accessToken,
        string owner,
        string name,
        int pullRequestNumber,
        int latestCommentsCount = 5,
        CancellationToken ct = default)
    {
        using var graphQlClient = CreateGraphQlClient(accessToken);

        var request = new GraphQLRequest
        {
            Query = GitHubGraphQlQueries.PullRequestDetail,
            OperationName = "PullRequestDetail",
            Variables = new
            {
                owner,
                name,
                number = pullRequestNumber,
                latestComments = latestCommentsCount
            }
        };

        var response = await graphQlClient.SendQueryAsync<GitHubGraphQLPullRequestDetailDataDTO>(request, ct);
        ThrowIfErrors(response);

        var node = response.Data.Repository?.PullRequest
            ?? throw new InvalidOperationException($"GitHub PR {owner}/{name}#{pullRequestNumber} was not found.");

        return _pullRequestMapper.ToDetail(node);
    }

    private async Task<IReadOnlyList<GitHubPullRequestDTO>> SearchAllPagesAsync(
        string accessToken,
        string searchQuery,
        CancellationToken ct)
    {
        var results = new List<GitHubPullRequestDTO>();
        string? cursor = null;
        var page = 0;

        while (true)
        {
            page++;
            var pageResult = await FetchPageAsync(accessToken, searchQuery, cursor, PageSize, ct);
            results.AddRange(pageResult.Items);

            if (!pageResult.HasNextPage)
            {
                break;
            }

            if (page >= MaxPages)
            {
                logger.LogWarning(
                    "GitHub PR search {SearchQuery} stopped after {MaxPages} pages ({Count} PRs) — narrow the sync window if this recurs.",
                    searchQuery, MaxPages, results.Count);
                break;
            }

            cursor = pageResult.EndCursor;
        }

        return results;
    }

    private async Task<GitHubPullRequestSearchResultDTO> FetchPageAsync(
        string accessToken,
        string searchQuery,
        string? after,
        int pageSize,
        CancellationToken ct)
    {
        using var graphQlClient = CreateGraphQlClient(accessToken);

        var request = new GraphQLRequest
        {
            Query = GitHubGraphQlQueries.SearchPullRequests,
            OperationName = "SearchPullRequestsInvolvingUser",
            Variables = new
            {
                searchQuery,
                first = pageSize,
                after
            }
        };

        var response = await graphQlClient.SendQueryAsync<GitHubGraphQLSearchPullRequestsDataDTO>(request, ct);
        ThrowIfErrors(response);

        var search = response.Data.Search;

        return new GitHubPullRequestSearchResultDTO
        {
            TotalCount = search.IssueCount,
            HasNextPage = search.PageInfo.HasNextPage,
            EndCursor = search.PageInfo.EndCursor,
            Items = [.. search.Nodes.Select(_pullRequestMapper.ToDto)]
        };
    }

    /// <summary>
    /// A fresh <see cref="GraphQLHttpClient"/> (and underlying HttpClient) per call — the pooled
    /// handler is reused/shared by <see cref="IHttpClientFactory"/>, so this stays cheap. The PAT is
    /// per-user, so it can't live on a shared/singleton client.
    /// </summary>
    private GraphQLHttpClient CreateGraphQlClient(string accessToken)
    {
        var httpClient = httpClientFactory.CreateClient("github-graphql");
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        return new GraphQLHttpClient(
            new GraphQLHttpClientOptions { EndPoint = httpClient.BaseAddress },
            new SystemTextJsonSerializer(),
            httpClient);
    }

    private static void ThrowIfErrors<T>(GraphQLResponse<T> response)
    {
        if (response.Errors is not { Length: > 0 })
        {
            return;
        }

        var messages = string.Join("; ", response.Errors.Select(e => e.Message));
        throw new InvalidOperationException($"GitHub GraphQL request returned errors: {messages}");
    }
}
