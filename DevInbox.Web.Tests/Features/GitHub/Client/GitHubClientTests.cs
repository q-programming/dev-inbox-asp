using System.Net;
using System.Text.Json;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using RichardSzalay.MockHttp;

namespace DevInbox.Web.Tests.Features.GitHub.Client;

/// <summary>
/// Tests for <see cref="GitHubClient"/>'s GraphQL-calling behavior. All HTTP is intercepted via
/// <see cref="MockHttpMessageHandler"/> wired into a real <see cref="IHttpClientFactory"/> — the same
/// pattern used in <c>GitHubOAuthServiceTests</c>. No real network call is ever made.
/// </summary>
public class GitHubClientTests
{
    private const string GraphQlEndpoint = "https://api.github.com/graphql";
    private const string AccessToken = "gho_faketoken";
    private const string Login = "octocat";

    private readonly MockHttpMessageHandler _mockHttp;
    private readonly GitHubClient _client;

    public GitHubClientTests()
    {
        _mockHttp = new MockHttpMessageHandler();
        var restHttpClient = _mockHttp.ToHttpClient();
        restHttpClient.BaseAddress = new Uri("https://api.github.com");
        _client = new GitHubClient(restHttpClient, BuildFactory(_mockHttp), Substitute.For<ILogger<GitHubClient>>());
    }

    // -------------------------------------------------------------------------
    // GetPullRequestsInvolvingUserAsync — query building
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "GetPullRequestsInvolvingUserAsync should build an is:open query for initial sync")]
    public async Task ShouldBuildOpenOnlyQueryForInitialSyncAsync()
    {
        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .WithPartialContent("is:open")
            .WithPartialContent($"involves:{Login}")
            .Respond("application/json", BuildSearchResponseJson(items: [], hasNextPage: false, endCursor: null));

        var result = await _client.GetPullRequestsInvolvingUserAsync(AccessToken, Login, DateTimeOffset.UtcNow, openPullRequestsOnly: true);

        Assert.Empty(result);
    }

    [Fact(DisplayName = "GetPullRequestsInvolvingUserAsync should build an updated:>= query for incremental sync")]
    public async Task ShouldBuildUpdatedSinceQueryForIncrementalSyncAsync()
    {
        var updatedSince = new DateTimeOffset(2026, 1, 15, 0, 0, 0, TimeSpan.Zero);

        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .WithPartialContent("updated:")
            .WithPartialContent("2026-01-15")
            .WithPartialContent($"involves:{Login}")
            .Respond("application/json", BuildSearchResponseJson(items: [], hasNextPage: false, endCursor: null));

        var result = await _client.GetPullRequestsInvolvingUserAsync(AccessToken, Login, updatedSince, openPullRequestsOnly: false);

        Assert.Empty(result);
    }

    // -------------------------------------------------------------------------
    // GetPullRequestsInvolvingUserAsync — pagination
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "GetPullRequestsInvolvingUserAsync should page through multiple pages using the cursor")]
    public async Task ShouldPageThroughMultiplePagesAsync()
    {
        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .WithPartialContent("\"after\":null")
            .Respond("application/json", BuildSearchResponseJson(
                items: [BuildPrJson(1, "octocat/repo")], hasNextPage: true, endCursor: "cursor-1"));

        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .WithPartialContent("cursor-1")
            .Respond("application/json", BuildSearchResponseJson(
                items: [BuildPrJson(2, "octocat/repo")], hasNextPage: false, endCursor: null));

        var result = await _client.GetPullRequestsInvolvingUserAsync(AccessToken, Login, DateTimeOffset.UtcNow, openPullRequestsOnly: true);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, pr => pr.Number == 1);
        Assert.Contains(result, pr => pr.Number == 2);
    }

    [Fact(DisplayName = "GetPullRequestsInvolvingUserAsync should stop after MaxPages (50) even if more pages are available")]
    public async Task ShouldEnforceMaxPagesCapAsync()
    {
        var callCount = 0;
        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .Respond(async request =>
            {
                callCount++;
                var json = BuildSearchResponseJson(
                    items: [BuildPrJson(callCount, "octocat/repo")], hasNextPage: true, endCursor: $"cursor-{callCount}");
                await Task.Yield();
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                };
            });

        var result = await _client.GetPullRequestsInvolvingUserAsync(AccessToken, Login, DateTimeOffset.UtcNow, openPullRequestsOnly: true);

        Assert.Equal(50, callCount);
        Assert.Equal(50, result.Count);
    }

    // -------------------------------------------------------------------------
    // GetPullRequestDetailAsync
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "GetPullRequestDetailAsync should throw ArgumentException for a malformed repositoryFullName")]
    public async Task ShouldThrowArgumentExceptionForMalformedRepositoryNameAsync()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _client.GetPullRequestDetailAsync(AccessToken, "not-a-valid-repo-name", 1));
    }

    [Fact(DisplayName = "GetPullRequestDetailAsync should throw InvalidOperationException when GraphQL returns errors")]
    public async Task ShouldThrowWhenGraphQlReturnsErrorsAsync()
    {
        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .Respond("application/json", JsonSerializer.Serialize(new
            {
                data = (object?)null,
                errors = new[] { new { message = "Could not resolve to a Repository" } }
            }));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _client.GetPullRequestDetailAsync(AccessToken, "octocat/hello-world", 42));
    }

    [Fact(DisplayName = "GetPullRequestDetailAsync should throw InvalidOperationException when the PR node is not found")]
    public async Task ShouldThrowWhenPullRequestNotFoundAsync()
    {
        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .Respond("application/json", JsonSerializer.Serialize(new
            {
                data = new { repository = new { pullRequest = (object?)null } }
            }));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _client.GetPullRequestDetailAsync(AccessToken, "octocat/hello-world", 42));
    }

    [Fact(DisplayName = "GetPullRequestDetailAsync should return mapped detail on success")]
    public async Task ShouldReturnDetailOnSuccessAsync()
    {
        _mockHttp.When(HttpMethod.Post, GraphQlEndpoint)
            .Respond("application/json", JsonSerializer.Serialize(new
            {
                data = new
                {
                    repository = new
                    {
                        pullRequest = new
                        {
                            id = "node-1",
                            number = 42,
                            title = "Fix bug",
                            body = "PR body",
                            url = "https://github.com/octocat/hello-world/pull/42",
                            state = "OPEN",
                            isDraft = false,
                            merged = false,
                            createdAt = DateTimeOffset.UtcNow,
                            updatedAt = DateTimeOffset.UtcNow,
                            repository = new { nameWithOwner = "octocat/hello-world" },
                            author = new { login = "octocat", avatarUrl = (string?)null },
                            comments = new { totalCount = 0 }
                        }
                    }
                }
            }));

        var detail = await _client.GetPullRequestDetailAsync(AccessToken, "octocat/hello-world", 42);

        Assert.Equal(42, detail.PullRequestNumber);
        Assert.Equal("octocat/hello-world", detail.Repository);
        Assert.Equal("Fix bug", detail.Title);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static string BuildSearchResponseJson(IEnumerable<string> items, bool hasNextPage, string? endCursor)
    {
        var nodesJson = string.Join(",", items);
        return $$"""
            {
              "data": {
                "search": {
                  "issueCount": {{items.Count()}},
                  "pageInfo": { "endCursor": {{(endCursor is null ? "null" : $"\"{endCursor}\"")}}, "hasNextPage": {{hasNextPage.ToString().ToLowerInvariant()}} },
                  "nodes": [ {{nodesJson}} ]
                }
              }
            }
            """;
    }

    private static string BuildPrJson(int number, string repositoryFullName) => $$"""
        {
          "id": "node-{{number}}",
          "number": {{number}},
          "title": "PR {{number}}",
          "url": "https://github.com/{{repositoryFullName}}/pull/{{number}}",
          "state": "OPEN",
          "isDraft": false,
          "merged": false,
          "createdAt": "2026-01-01T00:00:00+00:00",
          "updatedAt": "2026-01-02T00:00:00+00:00",
          "repository": { "nameWithOwner": "{{repositoryFullName}}" },
          "author": { "login": "octocat" },
          "comments": { "totalCount": 0 }
        }
        """;

    private static IHttpClientFactory BuildFactory(MockHttpMessageHandler handler)
    {
        var services = new ServiceCollection();
        services.AddHttpClient("github-graphql", c => c.BaseAddress = new Uri(GraphQlEndpoint))
                .ConfigurePrimaryHttpMessageHandler(() => handler);
        return services.BuildServiceProvider().GetRequiredService<IHttpClientFactory>();
    }
}
