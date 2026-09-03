using System.Net;
using System.Net.Http.Headers;
using System.Text;
using DevInbox.Web.Features.ADO.Client;
using RichardSzalay.MockHttp;

namespace DevInbox.Web.Tests.Features.ADO.Client;

/// <summary>
/// Tests for <see cref="AdoClient"/> PAT profile validation calls.
/// HTTP is intercepted via <see cref="MockHttpMessageHandler"/> wired into a real <see cref="HttpClient"/>.
/// </summary>
public class AdoClientTests
{
    private const string BaseUrl = "https://dev.azure.com/organization/";
    private const string Organization = "myorg";
    private const string Pat = "ado_pat_123";

    private readonly MockHttpMessageHandler _mockHttp;
    private readonly AdoClient _client;

    public AdoClientTests()
    {
        _mockHttp = new MockHttpMessageHandler();
        var httpClient = _mockHttp.ToHttpClient();
        httpClient.BaseAddress = new Uri(BaseUrl);
        _client = new AdoClient(httpClient);
    }

    [Fact(DisplayName = "GetConnectionDataAsync should return the deserialized authenticated user for the given organization")]
    public async Task GetConnectionDataAsyncShouldReturnAuthenticatedUserAsync()
    {
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/_apis/connectionData")
            .WithQueryString("api-version", "7.0-preview")
            .Respond("application/json", """
                { "authenticatedUser": { "id": "ado-user-1", "providerDisplayName": "John Doe", "properties": { "Account": { "$value": "john@doe.com" } } } }
                """);

        var result = await _client.GetConnectionDataAsync(Pat, Organization);

        Assert.Equal("ado-user-1", result.AuthenticatedUser.Id);
        Assert.Equal("John Doe", result.AuthenticatedUser.ProviderDisplayName);
        Assert.Equal("john@doe.com", result.AuthenticatedUser.Properties?.Account?.Value);
    }

    [Fact(DisplayName = "GetProjectsAsync should return the deserialized project list")]
    public async Task GetProjectsAsyncShouldReturnProjectsAsync()
    {
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/_apis/projects")
            .Respond("application/json", """
                { "count": 2, "value": [ { "id": "p1", "name": "Alpha" }, { "id": "p2", "name": "Beta" } ] }
                """);

        var result = await _client.GetProjectsAsync(Pat, Organization);

        Assert.Equal(2, result.Count);
        Assert.Equal("Alpha", result[0].Name);
        Assert.Equal("Beta", result[1].Name);
    }

    [Fact(DisplayName = "QueryWorkItemIdsAsync should POST the WIQL query and return matching ids")]
    public async Task QueryWorkItemIdsAsyncShouldReturnIdsAsync()
    {
        string? sentBody = null;
        _mockHttp.When(HttpMethod.Post, $"{BaseUrl}{Organization}/MyProject/_apis/wit/wiql")
            .Respond(async request =>
            {
                sentBody = await request.Content!.ReadAsStringAsync();
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                        { "workItems": [ { "id": 1 }, { "id": 2 } ] }
                        """, Encoding.UTF8, "application/json")
                };
            });

        var result = await _client.QueryWorkItemIdsAsync(Pat, Organization, "MyProject", "SELECT [System.Id] FROM WorkItems");

        Assert.Equal([1, 2], result);
        Assert.Contains("SELECT [System.Id] FROM WorkItems", sentBody);
    }

    [Fact(DisplayName = "GetWorkItemsBatchAsync should return an empty list without calling ADO when no ids are given")]
    public async Task GetWorkItemsBatchAsyncShouldShortCircuitOnEmptyIdsAsync()
    {
        var result = await _client.GetWorkItemsBatchAsync(Pat, Organization, "MyProject", []);

        Assert.Empty(result);
        _mockHttp.VerifyNoOutstandingRequest();
    }

    [Fact(DisplayName = "GetWorkItemsBatchAsync should return the hydrated work items")]
    public async Task GetWorkItemsBatchAsyncShouldReturnWorkItemsAsync()
    {
        _mockHttp.When(HttpMethod.Post, $"{BaseUrl}{Organization}/MyProject/_apis/wit/workitemsbatch")
            .Respond("application/json", """
                { "count": 1, "value": [ { "id": 5, "url": "https://example.com/5", "fields": { "System.Title": "Fix bug", "System.WorkItemType": "Bug", "System.State": "Active" } } ] }
                """);

        var result = await _client.GetWorkItemsBatchAsync(Pat, Organization, "MyProject", [5]);

        Assert.Single(result);
        Assert.Equal(5, result[0].Id);
        Assert.Equal("Fix bug", result[0].Fields.Title);
        Assert.Equal("Bug", result[0].Fields.WorkItemType);
    }

    [Fact(DisplayName = "GetPullRequestsAsync should append reviewerId and creatorId search criteria when provided")]
    public async Task GetPullRequestsAsyncShouldAppendSearchCriteriaAsync()
    {
        Uri? requestUri = null;
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/MyProject/_apis/git/pullrequests")
            .Respond(request =>
            {
                requestUri = request.RequestUri;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{ "count": 0, "value": [] }""", Encoding.UTF8, "application/json")
                };
            });

        await _client.GetPullRequestsAsync(Pat, Organization, "MyProject", reviewerId: "reviewer-1", creatorId: "creator-1");

        Assert.NotNull(requestUri);
        Assert.Contains("searchCriteria.status=all", requestUri!.Query);
        Assert.Contains("searchCriteria.reviewerId=reviewer-1", requestUri.Query);
        Assert.Contains("searchCriteria.creatorId=creator-1", requestUri.Query);
    }

    [Theory(DisplayName = "GetPullRequestsAsync should serialize the search status as its lower-camel-case ADO literal")]
    [InlineData(AdoPullRequestSearchStatus.Active, "active")]
    [InlineData(AdoPullRequestSearchStatus.Abandoned, "abandoned")]
    [InlineData(AdoPullRequestSearchStatus.Completed, "completed")]
    [InlineData(AdoPullRequestSearchStatus.All, "all")]
    [InlineData(AdoPullRequestSearchStatus.NotSet, "notSet")]
    public async Task GetPullRequestsAsyncShouldSerializeSearchStatusAsync(AdoPullRequestSearchStatus status, string expectedQueryValue)
    {
        Uri? requestUri = null;
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/MyProject/_apis/git/pullrequests")
            .Respond(request =>
            {
                requestUri = request.RequestUri;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{ "count": 0, "value": [] }""", Encoding.UTF8, "application/json")
                };
            });

        await _client.GetPullRequestsAsync(Pat, Organization, "MyProject", status);

        Assert.NotNull(requestUri);
        Assert.Contains($"searchCriteria.status={expectedQueryValue}", requestUri!.Query);
    }

    [Fact(DisplayName = "GetWorkItemDetailAsync should return the fully expanded work item")]
    public async Task GetWorkItemDetailAsyncShouldReturnWorkItemAsync()
    {
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/_apis/wit/workitems/501")
            .WithQueryString("$expand", "all")
            .Respond("application/json", """
                {
                  "id": 501,
                  "url": "https://example.com/501",
                  "fields": { "System.Title": "Fix bug", "System.Description": "Full description" },
                  "relations": [ { "rel": "System.LinkTypes.Hierarchy-Reverse", "url": "https://example.com/wit/workitems/400" } ]
                }
                """);

        var result = await _client.GetWorkItemDetailAsync(Pat, Organization, 501);

        Assert.Equal(501, result.Id);
        Assert.Equal("Fix bug", result.Fields.Title);
        Assert.Equal("Full description", result.Fields.Description);
        Assert.Single(result.Relations!);
        Assert.Equal("System.LinkTypes.Hierarchy-Reverse", result.Relations![0].Rel);
    }

    [Fact(DisplayName = "GetWorkItemCommentsAsync should return the comment list")]
    public async Task GetWorkItemCommentsAsyncShouldReturnCommentsAsync()
    {
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/MyProject/_apis/wit/workitems/501/comments")
            .Respond("application/json", """
                { "totalCount": 1, "comments": [ { "text": "Looks good", "createdBy": { "displayName": "Jane" }, "createdDate": "2026-01-01T00:00:00Z" } ] }
                """);

        var result = await _client.GetWorkItemCommentsAsync(Pat, Organization, "MyProject", 501);

        Assert.Single(result);
        Assert.Equal("Looks good", result[0].Text);
        Assert.Equal("Jane", result[0].CreatedBy!.DisplayName);
    }

    [Fact(DisplayName = "GetPullRequestDetailAsync should return the deserialized pull request")]
    public async Task GetPullRequestDetailAsyncShouldReturnPullRequestAsync()
    {
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/MyProject/_apis/git/repositories/alpha-service/pullrequests/2101")
            .Respond("application/json", """
                { "pullRequestId": 2101, "title": "Add feature", "status": "active", "description": "Detailed PR description" }
                """);

        var result = await _client.GetPullRequestDetailAsync(Pat, Organization, "MyProject", "alpha-service", 2101);

        Assert.Equal(2101, result.PullRequestId);
        Assert.Equal("Add feature", result.Title);
        Assert.Equal("Detailed PR description", result.Description);
    }

    [Fact(DisplayName = "GetPullRequestThreadsAsync should return the deserialized thread list")]
    public async Task GetPullRequestThreadsAsyncShouldReturnThreadsAsync()
    {
        _mockHttp.When(HttpMethod.Get, $"{BaseUrl}{Organization}/MyProject/_apis/git/repositories/alpha-service/pullRequests/2101/threads")
            .Respond("application/json", """
                { "value": [ { "comments": [ { "content": "LGTM", "author": { "displayName": "Jane" }, "commentType": "text" } ] } ] }
                """);

        var result = await _client.GetPullRequestThreadsAsync(Pat, Organization, "MyProject", "alpha-service", 2101);

        Assert.Single(result);
        Assert.Single(result[0].Comments);
        Assert.Equal("LGTM", result[0].Comments[0].Content);
    }
}
