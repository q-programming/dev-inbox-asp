using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>Response shape of <c>GET {project}/_apis/git/pullrequests?api-version=7.1</c>.</summary>
public sealed class AdoPullRequestsResponseDTO
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("value")]
    public List<AdoPullRequestDTO> Value { get; set; } = [];
}

public sealed class AdoPullRequestDTO
{
    [JsonPropertyName("pullRequestId")]
    public int PullRequestId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>"active", "completed", "abandoned" or "notSet".</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("creationDate")]
    public DateTimeOffset CreationDate { get; set; }

    [JsonPropertyName("closedDate")]
    public DateTimeOffset? ClosedDate { get; set; }

    [JsonPropertyName("createdBy")]
    public AdoIdentityRefDTO? CreatedBy { get; set; }

    [JsonPropertyName("repository")]
    public AdoRepositoryDTO Repository { get; set; } = new();

    [JsonPropertyName("reviewers")]
    public List<AdoReviewerDTO> Reviewers { get; set; } = [];

    /// <summary>
    /// Only requested/populated by the single-PR detail fetch (<c>GetPullRequestDetailAsync</c>) —
    /// the project-scoped search endpoint used for syncing doesn't return it, keeping that call's
    /// response small.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public sealed class AdoRepositoryDTO
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("project")]
    public AdoProjectDTO Project { get; set; } = new();
}

public sealed class AdoReviewerDTO
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("displayName")]
    public string? DisplayName { get; set; }

    /// <summary>-10 rejected, -5 waiting, 0 no vote, 5 approved with suggestions, 10 approved.</summary>
    [JsonPropertyName("vote")]
    public int Vote { get; set; }
}
