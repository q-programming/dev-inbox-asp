using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>Request body for <c>POST {project}/_apis/wit/wiql?api-version=7.1</c>.</summary>
public sealed class AdoWiqlRequestDTO
{
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;
}

/// <summary>
/// Response shape of the WIQL query endpoint — only ids/urls, never the work item fields
/// themselves, hence the follow-up <c>workitemsbatch</c> call.
/// </summary>
public sealed class AdoWiqlResultDTO
{
    [JsonPropertyName("workItems")]
    public List<AdoWorkItemRefDTO> WorkItems { get; set; } = [];
}

public sealed class AdoWorkItemRefDTO
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
}
