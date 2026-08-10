namespace DevInbox.Web.Features.GitHub.Client;

/// <summary>
/// Raw GraphQL query documents used by <see cref="GitHubClient"/>.
/// Kept as plain string constants — no codegen involved, this project uses GraphQL.Client
/// purely as a thin transport (request/response envelope + JSON binding) over the resilient
/// "github-graphql" HttpClient, not as a typed/generated client.
/// The <c>PullRequestFields</c> fragment holds every field common to both the search and detail
/// queries (everything except comment bodies, which only the detail query needs) so the two query
/// documents below stay short instead of duplicating the same ~40 lines of field selection twice.
/// </summary>
internal static class GitHubGraphQlQueries
{
    private const string PullRequestFieldsFragment = """
        fragment PullRequestFields on PullRequest {
          id
          number
          title
          url
          state
          isDraft
          merged
          createdAt
          updatedAt
          closedAt
          mergedAt
          additions
          deletions
          changedFiles
          reviewDecision
          repository {
            nameWithOwner
          }
          author {
            login
            avatarUrl
          }
          comments {
            totalCount
          }
          labels(first: 20) {
            nodes {
              name
            }
          }
          reviewRequests(first: 20) {
            nodes {
              requestedReviewer {
                ... on User {
                  login
                  name
                  avatarUrl
                }
                ... on Team {
                  name
                  avatarUrl
                }
              }
            }
          }
          reviews(first: 20, states: [APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED]) {
            nodes {
              state
              submittedAt
              author {
                login
                avatarUrl
              }
            }
          }
        }
        """;

    /// <summary>
    /// Mirrors "is:pr involves:@me archived:false sort:updated-desc" from the GitHub search UI.
    /// Fetches everything needed for the inbox in one round trip: review decision, per-reviewer
    /// review state, pending review requests, comment count and labels — avoiding N+1 REST calls.
    /// </summary>
    public static readonly string SearchPullRequests = $$"""
        {{PullRequestFieldsFragment}}

        query SearchPullRequestsInvolvingUser($searchQuery: String!, $first: Int!, $after: String) {
          search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
            issueCount
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              ... on PullRequest {
                ...PullRequestFields
              }
            }
          }
        }
        """;

    /// <summary>
    /// Fetches full detail for a single pull request, identified by owner/repo/number — used to
    /// populate the inbox item detail panel. Reuses the same fields as the search query plus the
    /// actual comment bodies (search only exposes a comment count) via a REST-avoiding one-shot query
    /// (a REST equivalent would need separate calls for the PR, reviews, requested reviewers and
    /// comments).
    /// </summary>
    public static readonly string PullRequestDetail = $$"""
        {{PullRequestFieldsFragment}}

        query PullRequestDetail($owner: String!, $name: String!, $number: Int!, $latestComments: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
              ...PullRequestFields
              body
              latestComments: comments(last: $latestComments) {
                nodes {
                  body
                  url
                  createdAt
                  author {
                    login
                    avatarUrl
                  }
                }
              }
            }
          }
        }
        """;
}

