using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>
/// Response shape of <c>GET _apis/projects?api-version=7.1</c> — the set of projects visible to the
/// calling PAT, i.e. the projects the user is effectively "part of". Used to discover which projects
/// to fan the work item/PR sync out to, without any per-user project configuration.
/// </summary>
public sealed class AdoProjectsResponseDTO
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("value")]
    public List<AdoProjectDTO> Value { get; set; } = [];
}

public sealed class AdoProjectDTO
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}
