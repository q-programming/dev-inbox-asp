# External-Service Mock Server

A single lightweight WireMock.NET console app used to mock the external services Dev Inbox
integrates with, so you can develop/test locally without hitting real APIs. Each service gets its
own path prefix and its own mapping registrar, so more services (ADO, Jira, ...) can be plugged in
later without spinning up a separate process/port per service.

```text
mock-server/
  Program.cs               <- starts the shared WireMock server, registers each service's mappings
  GitHub/
    GitHubMappings.cs       <- WireMock request/response mappings for GitHub's GraphQL operations
    Fixtures/
      search-pull-requests.json
      pull-request-detail-{101,98,87,76}.json
  Ado/                      <- (future) ADO mappings + fixtures, same pattern as GitHub/
```

## GitHub

Mocks the two GraphQL operations used by `GitHubClient`, plus the REST `GET /user` call
(`GitHubClient.GetCurrentUserAsync`):

- `SearchPullRequestsInvolvingUser` — matched by operation name, always returns the fixed page in
  `GitHub/Fixtures/search-pull-requests.json` (6 PRs: 4 open, 2 closed).
- `PullRequestDetail` — matched by operation name + the `number` GraphQL variable, one fixture per
  known PR (`101`, `98`, `110`, `112`, `87`, `76`). Any other PR number gets GitHub's "not found"
  shape (`{"data":{"repository":{"pullRequest":null}}}`) so `GitHubClient`'s null-check throws a
  clear error instead of failing to deserialize.
- `GET /user` — returns `GitHub/Fixtures/current-user.json`, a profile for the `jkowalski` login
  (matches the mock GitHub profile `UserService` assigns when `Identity:UseMockData` is set).

GraphQL is served at **`POST /github/graphql`**. The `/user` mock is registered at the server
**root** (`GET /user`, not `/github/user`) — see the comment on `GitHubMappings.CurrentUserPath`:
`GitHubClient` requests the absolute-path relative URI `"/user"`, and .NET's `HttpClient` combines
an absolute-path relative URI with `BaseAddress` by discarding the base's path entirely (RFC 3986),
so the request always lands on `{scheme}://{host}:{port}/user` regardless of any path segment in
`GitHub:BaseAddress`. This is inherent `HttpClient` behavior (and matches real GitHub too, since
`https://api.github.com` has no path to lose) — not something to work around in `GitHubClient`.

**Not mocked:** OAuth login — you still need a real (or otherwise stubbed) login flow to reach an
authenticated state. Once you have a session/access token, the GraphQL calls and the `/user` call
made during sync/detail fetch are served by this mock.

## ADO / other services (later)

Not implemented yet — will follow the same pattern as `GitHub/`: a `{Service}Mappings.cs` registrar
(HTTP or GraphQL, whichever ADO ends up using) plus a `{Service}/Fixtures/` folder, registered from
`Program.cs` under its own path prefix (e.g. `/ado/...`).

## Run

```bash
cd mock-server
dotnet run
```

Listens on `http://localhost:8089`.

## Point DevInbox at it

In `DevInbox.Web/appsettings.Local.json`, add a `GitHub:BaseAddress` override so both the REST and
GraphQL clients route through the mock server's `/github` prefix:

```json
"GitHub": {
  "BaseAddress": "http://localhost:8089/github"
}
```

This backs the REST client (would be `{BaseAddress}` directly) and the GraphQL client
(`{BaseAddress}/graphql` → `http://localhost:8089/github/graphql`). The REST `/user` call always
hits `http://localhost:8089/user` regardless of this path suffix (see the GitHub section above) —
that mock is registered at the server root. This is best combined with a short-circuited/faked
login for local testing — the PR sync and detail calls will then hit this mock server instead of
GitHub.
