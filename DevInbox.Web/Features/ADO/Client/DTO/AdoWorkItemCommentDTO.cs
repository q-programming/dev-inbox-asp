using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>Response shape of <c>GET {project}/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4</c>.</summary>
public sealed class AdoWorkItemCommentsResponseDTO
{
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    [JsonPropertyName("comments")]
    public List<AdoWorkItemCommentDTO> Comments { get; set; } = [];
}

public sealed class AdoWorkItemCommentDTO
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("createdBy")]
    public AdoIdentityRefDTO? CreatedBy { get; set; }

    [JsonPropertyName("createdDate")]
    public DateTimeOffset CreatedDate { get; set; }
}
