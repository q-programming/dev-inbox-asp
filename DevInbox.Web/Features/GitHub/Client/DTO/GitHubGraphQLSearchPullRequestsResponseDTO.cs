using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.GitHub.Client.DTO;

/// <summary>
/// Raw shape of the "search pull requests" GraphQL response — mirrors the GitHub GraphQL schema
/// field-for-field so it can be deserialized directly. Mapped into <see cref="GitHubPullRequestDTO"/>
/// (and the paged result) for application use via <see cref="Mapper.GitHubPullRequestMapper"/> —
/// treat these types as transport-only, not for use elsewhere in the application.
/// </summary>
public sealed class GitHubGraphQLSearchPullRequestsDataDTO
{
    [JsonPropertyName("search")]
    public GitHubGraphQLSearchDTO Search { get; set; } = new();
}

public sealed class GitHubGraphQLSearchDTO
{
    [JsonPropertyName("issueCount")]
    public int IssueCount { get; set; }

    [JsonPropertyName("pageInfo")]
    public GitHubGraphQLPageInfoDTO PageInfo { get; set; } = new();

    [JsonPropertyName("nodes")]
    public List<GitHubGraphQLPullRequestNodeDTO> Nodes { get; set; } = [];
}

public sealed class GitHubGraphQLPageInfoDTO
{
    [JsonPropertyName("endCursor")]
    public string? EndCursor { get; set; }

    [JsonPropertyName("hasNextPage")]
    public bool HasNextPage { get; set; }
}

public sealed class GitHubGraphQLPullRequestNodeDTO
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("number")]
    public int Number { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("isDraft")]
    public bool IsDraft { get; set; }

    [JsonPropertyName("merged")]
    public bool Merged { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("closedAt")]
    public DateTimeOffset? ClosedAt { get; set; }

    [JsonPropertyName("mergedAt")]
    public DateTimeOffset? MergedAt { get; set; }

    [JsonPropertyName("additions")]
    public int Additions { get; set; }

    [JsonPropertyName("deletions")]
    public int Deletions { get; set; }

    [JsonPropertyName("changedFiles")]
    public int ChangedFiles { get; set; }

    [JsonPropertyName("reviewDecision")]
    public string? ReviewDecision { get; set; }

    [JsonPropertyName("repository")]
    public GitHubGraphQLRepositoryDTO Repository { get; set; } = new();

    [JsonPropertyName("author")]
    public GitHubGraphQLActorDTO? Author { get; set; }

    [JsonPropertyName("comments")]
    public GitHubGraphQLTotalCountDTO Comments { get; set; } = new();

    [JsonPropertyName("labels")]
    public GitHubGraphQLLabelConnectionDTO? Labels { get; set; }

    [JsonPropertyName("reviewRequests")]
    public GitHubGraphQLReviewRequestConnectionDTO? ReviewRequests { get; set; }

    [JsonPropertyName("reviews")]
    public GitHubGraphQLReviewConnectionDTO? Reviews { get; set; }
}

public sealed class GitHubGraphQLRepositoryDTO
{
    [JsonPropertyName("nameWithOwner")]
    public string NameWithOwner { get; set; } = string.Empty;
}

public sealed class GitHubGraphQLActorDTO
{
    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }
}

public sealed class GitHubGraphQLTotalCountDTO
{
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }
}

public sealed class GitHubGraphQLLabelConnectionDTO
{
    [JsonPropertyName("nodes")]
    public List<GitHubGraphQLLabelDTO> Nodes { get; set; } = [];
}

public sealed class GitHubGraphQLLabelDTO
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public sealed class GitHubGraphQLReviewRequestConnectionDTO
{
    [JsonPropertyName("nodes")]
    public List<GitHubGraphQLReviewRequestDTO> Nodes { get; set; } = [];
}

public sealed class GitHubGraphQLReviewRequestDTO
{
    [JsonPropertyName("requestedReviewer")]
    public GitHubGraphQLRequestedReviewerDTO? RequestedReviewer { get; set; }
}

/// <summary>
/// requestedReviewer is a union of User/Team/Mannequin — only the fields present on the
/// concrete type are populated by GitHub, the rest stay null.
/// </summary>
public sealed class GitHubGraphQLRequestedReviewerDTO
{
    [JsonPropertyName("login")]
    public string? Login { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }
}

public sealed class GitHubGraphQLReviewConnectionDTO
{
    [JsonPropertyName("nodes")]
    public List<GitHubGraphQLReviewDTO> Nodes { get; set; } = [];
}

public sealed class GitHubGraphQLReviewDTO
{
    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("submittedAt")]
    public DateTimeOffset? SubmittedAt { get; set; }

    [JsonPropertyName("author")]
    public GitHubGraphQLActorDTO? Author { get; set; }
}

/// <summary>Raw shape of the single-PR "detail" GraphQL response — see <see cref="GitHubGraphQlQueries.PullRequestDetail"/>.</summary>
public sealed class GitHubGraphQLPullRequestDetailDataDTO
{
    [JsonPropertyName("repository")]
    public GitHubGraphQLRepositoryWithPullRequestDTO? Repository { get; set; }
}

public sealed class GitHubGraphQLRepositoryWithPullRequestDTO
{
    [JsonPropertyName("pullRequest")]
    public GitHubGraphQLPullRequestDetailNodeDTO? PullRequest { get; set; }
}

/// <summary>
/// Same fields as <see cref="GitHubGraphQLPullRequestNodeDTO"/> plus the actual comment bodies
/// (<c>latestComments</c>) that the search query doesn't fetch — kept as a separate type rather than
/// reusing the search node so each query's DTO only carries what it actually requests.
/// </summary>
public sealed class GitHubGraphQLPullRequestDetailNodeDTO
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("number")]
    public int Number { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public string? Body { get; set; }

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("isDraft")]
    public bool IsDraft { get; set; }

    [JsonPropertyName("merged")]
    public bool Merged { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("closedAt")]
    public DateTimeOffset? ClosedAt { get; set; }

    [JsonPropertyName("mergedAt")]
    public DateTimeOffset? MergedAt { get; set; }

    [JsonPropertyName("additions")]
    public int Additions { get; set; }

    [JsonPropertyName("deletions")]
    public int Deletions { get; set; }

    [JsonPropertyName("changedFiles")]
    public int ChangedFiles { get; set; }

    [JsonPropertyName("reviewDecision")]
    public string? ReviewDecision { get; set; }

    [JsonPropertyName("repository")]
    public GitHubGraphQLRepositoryDTO Repository { get; set; } = new();

    [JsonPropertyName("author")]
    public GitHubGraphQLActorDTO? Author { get; set; }

    [JsonPropertyName("comments")]
    public GitHubGraphQLTotalCountDTO Comments { get; set; } = new();

    [JsonPropertyName("labels")]
    public GitHubGraphQLLabelConnectionDTO? Labels { get; set; }

    [JsonPropertyName("reviewRequests")]
    public GitHubGraphQLReviewRequestConnectionDTO? ReviewRequests { get; set; }

    [JsonPropertyName("reviews")]
    public GitHubGraphQLReviewConnectionDTO? Reviews { get; set; }

    [JsonPropertyName("latestComments")]
    public GitHubGraphQLCommentConnectionDTO? LatestComments { get; set; }
}

public sealed class GitHubGraphQLCommentConnectionDTO
{
    [JsonPropertyName("nodes")]
    public List<GitHubGraphQLCommentDTO> Nodes { get; set; } = [];
}

public sealed class GitHubGraphQLCommentDTO
{
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("author")]
    public GitHubGraphQLActorDTO? Author { get; set; }
}
