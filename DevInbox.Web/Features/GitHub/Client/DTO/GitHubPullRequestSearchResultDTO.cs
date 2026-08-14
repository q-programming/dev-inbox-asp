namespace DevInbox.Web.Features.GitHub.Client.DTO;

/// <summary>
/// One page of the "pull requests involving @me" GraphQL search — carries the cursor needed
/// to fetch the next page so callers can page through all results without re-fetching from the start.
/// </summary>
public sealed class GitHubPullRequestSearchResultDTO
{
    /// <summary>Total number of PRs matching the search query (across all pages).</summary>
    public int TotalCount { get; set; }

    public List<GitHubPullRequestDTO> Items { get; set; } = [];

    public bool HasNextPage { get; set; }

    /// <summary>Opaque cursor to pass as "after" to fetch the next page; null when there is none.</summary>
    public string? EndCursor { get; set; }
}
