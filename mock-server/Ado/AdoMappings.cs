using WireMock.Matchers;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace GitHubMockServer.Ado;

/// <summary>
/// Registers WireMock.NET mappings for Azure DevOps REST endpoints, served under
/// <c>/ado</c> on the shared mock server so multiple external services (GitHub, ADO, Jira, ...)
/// can each own a path prefix on one process/port instead of needing a server each.
/// Mocks the full connect + sync flow: org-scoped PAT validation/identity (connectionData), the
/// per-project WIQL/work-item-batch/PR-search calls issued by
/// <see cref="DevInbox.Web.Features.ADO.AdoService"/>, and the single work item/pull request
/// detail + comment fetches used by the inbox detail view
/// (<see cref="DevInbox.Web.Features.ADO.AdoService.GetDetailsAsync"/>).
/// Seeds a single organization ("contoso") with two projects ("Alpha", "Beta") — Alpha has four
/// work items (501-504) and four pull requests (2087, 2101, 2110, 2124) seeded, each with its own
/// detail + comments/threads fixture; Beta is empty (exercises the "no items in this project" path).
/// Not mocked: OAuth/device flows (ADO has no OAuth App wired up yet).
/// </summary>
internal static class AdoMappings
{
    /// <summary>
    /// REST endpoint for <c>AdoClient.GetCurrentUserProfileAsync</c> — kept for OAuth-parity only
    /// (unreachable today, see <see cref="DevInbox.Web.Features.ADO.AdoIntegrationService.CreateOAuthProfile"/>);
    /// the PAT connect flow uses <see cref="DevInbox.Web.Features.ADO.Client.IAdoClient.GetConnectionDataAsync"/> instead.
    /// </summary>
    private const string CurrentUserProfilePath = "/ado/_apis/profile/profiles/me";

    /// <summary>Seeded organization whose projects/work items/PRs are populated below.</summary>
    private const string Organization = "contoso";

    public static void Register(WireMockServer server, string fixturesDir)
    {
        // GET /_apis/profile/profiles/me — kept for OAuth parity only, see CurrentUserProfilePath.
        server
            .Given(Request.Create()
                .WithPath(CurrentUserProfilePath)
                .UsingGet())
            .WithTitle("ADO: GET /_apis/profile/profiles/me")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "current-user-profile.json")));

        // GET /{organization}/_apis/connectionData — org-scoped PAT validation + identity
        // resolution (AdoClient.GetConnectionDataAsync), the primary connect-flow call now that
        // Azure DevOps is deprecating "all accessible organizations" PATs. Matched against any
        // organization name (WildcardMatcher) since the multi-org design lets a user connect any
        // organization name they type in, unlike /_apis/projects which only 200s for "contoso".
        server
            .Given(Request.Create()
                .WithPath(new WildcardMatcher("/ado/*/_apis/connectionData"))
                .UsingGet())
            .WithTitle("ADO: GET /{organization}/_apis/connectionData")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "connection-data.json")));

        // GET /{organization}/_apis/projects — used both for real project discovery and as the
        // cheap "can this PAT reach this organization" probe (AdoService.ProbeOrganizationAsync).
        // Only "contoso" is seeded as reachable; any other organization name 404s, which AdoClient
        // surfaces as a non-2xx (not specifically 401) — good enough for local testing since the
        // probe only needs "did this succeed", not a specific status code.
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/_apis/projects")
                .UsingGet())
            .WithTitle("ADO: GET /{organization}/_apis/projects")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "projects.json")));

        // POST /{organization}/{project}/_apis/wit/wiql — matched by path wildcard since the project
        // segment varies (Alpha/Beta); Beta gets its own (empty) mapping below since WireMock uses
        // the first matching registration and both would otherwise match the wildcard.
        server
            .Given(Request.Create()
                .WithPath(new WildcardMatcher($"/ado/{Organization}/Alpha/_apis/wit/wiql"))
                .UsingPost())
            .WithTitle("ADO: POST /{organization}/Alpha/_apis/wit/wiql")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "wiql-result.json")));

        server
            .Given(Request.Create()
                .WithPath(new WildcardMatcher($"/ado/{Organization}/Beta/_apis/wit/wiql"))
                .UsingPost())
            .WithTitle("ADO: POST /{organization}/Beta/_apis/wit/wiql (empty project)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""{"asOf":"2026-01-15T09:30:00.000Z","workItems":[]}"""));

        // POST /{organization}/Alpha/_apis/wit/workitemsbatch — hydrates the two ids returned above.
        server
            .Given(Request.Create()
                .WithPath(new WildcardMatcher($"/ado/{Organization}/Alpha/_apis/wit/workitemsbatch"))
                .UsingPost())
            .WithTitle("ADO: POST /{organization}/Alpha/_apis/wit/workitemsbatch")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "workitems-batch.json")));

        // GET /{organization}/Alpha/_apis/git/pullrequests — two mappings on the same path,
        // distinguished by which identity-filter query param is present (creatorId vs reviewerId),
        // matching the two separate searches AdoService.SyncProjectAsync issues per project.
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/Alpha/_apis/git/pullrequests")
                .WithParam("searchCriteria.creatorId")
                .UsingGet())
            .WithTitle("ADO: GET /{organization}/Alpha/_apis/git/pullrequests (authored)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "pull-requests-creator.json")));

        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/Alpha/_apis/git/pullrequests")
                .WithParam("searchCriteria.reviewerId")
                .UsingGet())
            .WithTitle("ADO: GET /{organization}/Alpha/_apis/git/pullrequests (review-requested)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, "pull-requests-reviewer.json")));

        // Beta has no pull requests — both searches return an empty page.
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/Beta/_apis/git/pullrequests")
                .UsingGet())
            .WithTitle("ADO: GET /{organization}/Beta/_apis/git/pullrequests (empty project)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""{"count":0,"value":[]}"""));

        // GET /{organization}/_apis/wit/workitems/{id}?$expand=all — inbox detail view fetch for a
        // single work item (AdoClient.GetWorkItemDetailAsync). Work items 501-504 are all seeded
        // with full detail fixtures (description + parent relation where applicable); 504 and 502
        // additionally exercise the "no parent" and "one comment" paths respectively.
        RegisterWorkItemDetail(server, fixturesDir, 501);
        RegisterWorkItemDetail(server, fixturesDir, 502);
        RegisterWorkItemDetail(server, fixturesDir, 503);
        RegisterWorkItemDetail(server, fixturesDir, 504);

        // GET /{organization}/Alpha/_apis/wit/workitems/{id}/comments — comment list per work item.
        RegisterWorkItemComments(server, fixturesDir, 501);
        RegisterWorkItemComments(server, fixturesDir, 502);
        RegisterWorkItemComments(server, fixturesDir, 503);
        RegisterWorkItemComments(server, fixturesDir, 504);

        // GET /{organization}/Alpha/_apis/git/repositories/alpha-service/pullrequests/{id} — inbox
        // detail view fetch for a single pull request (AdoClient.GetPullRequestDetailAsync).
        RegisterPullRequestDetail(server, fixturesDir, 2087);
        RegisterPullRequestDetail(server, fixturesDir, 2101);
        RegisterPullRequestDetail(server, fixturesDir, 2110);
        RegisterPullRequestDetail(server, fixturesDir, 2124);

        // GET /{organization}/Alpha/_apis/git/repositories/alpha-service/pullRequests/{id}/threads —
        // comment threads per pull request; each includes one system-generated (vote) thread
        // comment to exercise AdoService's "text" vs "system" commentType filtering.
        RegisterPullRequestThreads(server, fixturesDir, 2087);
        RegisterPullRequestThreads(server, fixturesDir, 2101);
        RegisterPullRequestThreads(server, fixturesDir, 2110);
        RegisterPullRequestThreads(server, fixturesDir, 2124);
    }

    private static void RegisterWorkItemDetail(WireMockServer server, string fixturesDir, int workItemId)
    {
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/_apis/wit/workitems/{workItemId}")
                .UsingGet())
            .WithTitle($"ADO: GET /{{organization}}/_apis/wit/workitems/{workItemId} (detail)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, $"workitem-detail-{workItemId}.json")));
    }

    private static void RegisterWorkItemComments(WireMockServer server, string fixturesDir, int workItemId)
    {
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/Alpha/_apis/wit/workitems/{workItemId}/comments")
                .UsingGet())
            .WithTitle($"ADO: GET /{{organization}}/Alpha/_apis/wit/workitems/{workItemId}/comments")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, $"workitem-{workItemId}-comments.json")));
    }

    private static void RegisterPullRequestDetail(WireMockServer server, string fixturesDir, int pullRequestId)
    {
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/Alpha/_apis/git/repositories/alpha-service/pullrequests/{pullRequestId}")
                .UsingGet())
            .WithTitle($"ADO: GET /{{organization}}/Alpha/_apis/git/repositories/alpha-service/pullrequests/{pullRequestId} (detail)")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, $"pull-request-detail-{pullRequestId}.json")));
    }

    private static void RegisterPullRequestThreads(WireMockServer server, string fixturesDir, int pullRequestId)
    {
        server
            .Given(Request.Create()
                .WithPath($"/ado/{Organization}/Alpha/_apis/git/repositories/alpha-service/pullRequests/{pullRequestId}/threads")
                .UsingGet())
            .WithTitle($"ADO: GET /{{organization}}/Alpha/_apis/git/repositories/alpha-service/pullRequests/{pullRequestId}/threads")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBodyFromFile(System.IO.Path.Combine(fixturesDir, $"pull-request-{pullRequestId}-threads.json")));
    }
}
