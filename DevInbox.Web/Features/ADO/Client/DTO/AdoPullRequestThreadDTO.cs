using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>
/// Response shape of
/// <c>GET {project}/_apis/git/repositories/{repository}/pullRequests/{id}/threads?api-version=7.1</c>.
/// </summary>
public sealed class AdoPullRequestThreadsResponseDTO
{
    [JsonPropertyName("value")]
    public List<AdoPullRequestThreadDTO> Value { get; set; } = [];
}

public sealed class AdoPullRequestThreadDTO
{
    [JsonPropertyName("comments")]
    public List<AdoPullRequestCommentDTO> Comments { get; set; } = [];

    /// <summary>
    /// "unknown" for regular top-level threads. Azure DevOps also uses threads to record
    /// system-generated status changes (e.g. "voted", "pushed a commit") — those threads have
    /// their comments' <see cref="AdoPullRequestCommentDTO.CommentType"/> set to "system" rather
    /// than "text", which callers use to filter them out of the human-authored comment list.
    /// </summary>
    [JsonPropertyName("isDeleted")]
    public bool IsDeleted { get; set; }
}

public sealed class AdoPullRequestCommentDTO
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("author")]
    public AdoIdentityRefDTO? Author { get; set; }

    [JsonPropertyName("publishedDate")]
    public DateTimeOffset PublishedDate { get; set; }

    /// <summary>"text" for a human-authored comment, "system" for an auto-generated status entry (vote cast, commit pushed, etc.) — see <see cref="AdoPullRequestThreadDTO"/>.</summary>
    [JsonPropertyName("commentType")]
    public string? CommentType { get; set; }
}
