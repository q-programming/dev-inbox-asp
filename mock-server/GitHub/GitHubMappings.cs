using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace GitHubMockServer.GitHub;

/// <summary>
/// Registers WireMock.NET mappings for GitHub's GraphQL endpoint, served under
/// <c>/github/graphql</c> on the shared mock server so multiple external services (GitHub, ADO,
/// Jira, ...) can each own a path prefix on one process/port instead of needing a server each.
/// Mocks the two GraphQL operations <c>GitHubClient</c> issues (<c>SearchPullRequestsInvolvingUser</c>
/// and <c>PullRequestDetail</c>) plus the REST <c>GET /user</c> call used by
/// <see cref="DevInbox.Web.Features.GitHub.Client.GitHubClient.GetCurrentUserAsync"/>.
/// Not mocked: OAuth login.
/// </summary>
internal static class GitHubMappings
{
    private const string GraphQlPath = "/github/graphql";

    /// <summary>
    /// REST endpoint behind <c>GitHubClient.GetCurrentUserAsync</c>, which requests the relative
    /// path "user" against the "github" HttpClient. That client's BaseAddress is
    /// <c>GithubOptions.NormalizedBaseAddress</c> (guaranteed to end with "/"), so "user" correctly
    /// appends under whatever path prefix "GitHub:BaseUrl" configures — "/github/user" here.
    /// </summary>
    private const string CurrentUserPath = "/github/user";

    /// <summary>PR numbers with a seeded detail fixture — matches the 32 PRs in search-pull-requests.json.</summary>
    private static readonly int[] KnownPullRequestNumbers =
    [
        101, 98, 110, 112, 87, 76, 113, 114, 115, 116, 117, 118,
        130, 131, 132, 133, 134, 135, 136, 137, 138, 139,
        140, 141, 142, 143, 144, 145, 146, 147, 148, 149,
    ];

    public static void Register(WireMockServer server, string fixturesDir)
    {
        // SearchPullRequestsInvolvingUser — matched by operationName, returns the fixed 4-PR page.
        server
            .Given(Request.Create()
                .WithPath(GraphQlPath)
                .UsingPost()
                .WithBody(b => b is not null && b.Contains("SearchPullRequestsInvolvingUser")))
            .WithTitle("GitHub: SearchPullRequestsInvolvingUser")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "search-pull-requests.json")));

        // PullRequestDetail — matched by operationName + the "number" variable, one mapping per known PR.
        foreach (var number in KnownPullRequestNumbers)
        {
            server
                .Given(Request.Create()
                    .WithPath(GraphQlPath)
                    .UsingPost()
                    .WithBody(b => b is not null && b.Contains("PullRequestDetail"))
                    .WithBody(b => b is not null && b.Contains($"\"number\":{number}")))
                .WithTitle($"GitHub: PullRequestDetail #{number}")
                .RespondWith(Response.Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "application/json")
                    .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, $"pull-request-detail-{number}.json")));
        }

        // Fallback for a PR detail request that isn't one of the seeded fixtures — returns GitHub's
        // shape for "not found" so GitHubClient's null-check throws a clear error instead of failing
        // to deserialize.
        server
            .Given(Request.Create()
                .WithPath(GraphQlPath)
                .UsingPost()
                .WithBody(b => b is not null && b.Contains("PullRequestDetail")))
            .WithTitle("GitHub: PullRequestDetail (unseeded PR number, returns null)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""{"data":{"repository":{"pullRequest":null}}}"""));

        // GET /user — REST call behind GitHubClient.GetCurrentUserAsync. Returns a profile matching
        // the mock "jkowalski" GitHub login used by UserService when Identity:UseMockData is set.
        server
            .Given(Request.Create()
                .WithPath(CurrentUserPath)
                .UsingGet())
            .WithTitle("GitHub: GET /user")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "current-user.json")));
    }
}
