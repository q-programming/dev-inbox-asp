using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace GitHubMockServer.Ado;

/// <summary>
/// Registers WireMock.NET mappings for Azure DevOps REST endpoints, served under
/// <c>/ado</c> on the shared mock server so multiple external services (GitHub, ADO, Jira, ...)
/// can each own a path prefix on one process/port instead of needing a server each.
/// Mocks the REST <c>GET /_apis/profile/profiles/me</c> call used when validating an ADO PAT by
/// reading the current user's profile.
/// Not mocked: work items, projects, or OAuth/device flows.
/// </summary>
internal static class AdoMappings
{
    /// <summary>
    /// REST endpoint for the future <c>AdoClient.GetCurrentUserProfileAsync</c> call, which will
    /// request the relative path "_apis/profile/profiles/me" against the "ado" HttpClient. That
    /// client's BaseAddress is configured via <c>ADO:BaseUrl</c>, so the shared mock server hosts
    /// it under "/ado/_apis/profile/profiles/me" here.
    /// </summary>
    private const string CurrentUserProfilePath = "/ado/_apis/profile/profiles/me";

    public static void Register(WireMockServer server, string fixturesDir)
    {
        // GET /_apis/profile/profiles/me — REST call used to validate an ADO PAT by resolving the
        // authenticated user's profile. Query string matching is intentionally lax, mirroring the
        // GitHub mappings style, so api-version does not need to be matched exactly.
        server
            .Given(Request.Create()
                .WithPath(CurrentUserProfilePath)
                .UsingGet())
            .WithTitle("ADO: GET /_apis/profile/profiles/me")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "current-user-profile.json")));
    }
}
