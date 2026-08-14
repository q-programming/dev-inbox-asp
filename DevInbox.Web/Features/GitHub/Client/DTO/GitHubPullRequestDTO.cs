namespace DevInbox.Web.Features.GitHub.Client.DTO;

/// <summary>
/// Clean, application-facing representation of a GitHub pull request,
/// mapped from the raw GraphQL search response.
/// </summary>
public sealed class GitHubPullRequestDTO
{
    /// <summary>GraphQL node id — stable identifier, useful as a dedupe/cursor key.</summary>
    public string NodeId { get; set; } = string.Empty;

    public int Number { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    /// <summary>"OPEN", "CLOSED" or "MERGED" (GraphQL PullRequestState).</summary>
    public string State { get; set; } = string.Empty;

    public bool IsDraft { get; set; }

    public bool Merged { get; set; }

    /// <summary>e.g. "q-programming/dev-inbox-asp"</summary>
    public string RepositoryFullName { get; set; } = string.Empty;

    public GitHubActorDTO? Author { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public DateTimeOffset? ClosedAt { get; set; }

    public DateTimeOffset? MergedAt { get; set; }

    public int Additions { get; set; }

    public int Deletions { get; set; }

    public int ChangedFiles { get; set; }

    public int CommentsCount { get; set; }

    /// <summary>"APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED" or null when no reviews are required.</summary>
    public string? ReviewDecision { get; set; }

    public List<string> Labels { get; set; } = [];

    /// <summary>Reviewers (users or teams) whose review is currently requested but not yet submitted.</summary>
    public List<string> RequestedReviewers { get; set; } = [];

    /// <summary>Most recent review submitted per reviewer (latest state wins).</summary>
    public List<GitHubReviewDTO> Reviews { get; set; } = [];
}

public sealed class GitHubActorDTO
{
    public string Login { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}

public sealed class GitHubReviewDTO
{
    public string ReviewerLogin { get; set; } = string.Empty;

    /// <summary>"APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING".</summary>
    public string State { get; set; } = string.Empty;

    public DateTimeOffset? SubmittedAt { get; set; }
}
