using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>Request body for <c>POST {project}/_apis/wit/workitemsbatch?api-version=7.1</c>.</summary>
public sealed class AdoWorkItemsBatchRequestDTO
{
    [JsonPropertyName("ids")]
    public List<int> Ids { get; set; } = [];

    [JsonPropertyName("fields")]
    public List<string> Fields { get; set; } = [];

    /// <summary>
    /// "Omit" rather than the default "Fail" — a work item deleted/moved between the WIQL query and
    /// this batch call (a small race window) should be silently dropped from the batch response
    /// instead of failing the whole sync.
    /// </summary>
    [JsonPropertyName("$errorPolicy")]
    public string ErrorPolicy { get; set; } = "Omit";
}

public sealed class AdoWorkItemsBatchResponseDTO
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("value")]
    public List<AdoWorkItemDTO> Value { get; set; } = [];
}

/// <summary>
/// A single work item as returned by the batch endpoint. Only the fields requested via
/// <see cref="AdoWorkItemsBatchRequestDTO.Fields"/> are ever populated in <see cref="Fields"/>.
/// </summary>
public sealed class AdoWorkItemDTO
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("fields")]
    public AdoWorkItemFieldsDTO Fields { get; set; } = new();

    /// <summary>
    /// Only populated when the work item was fetched via <c>GET .../workitems/{id}?$expand=all</c>
    /// (the batch endpoint never returns relations). Used to surface the parent work item, if any.
    /// </summary>
    [JsonPropertyName("relations")]
    public List<AdoWorkItemRelationDTO>? Relations { get; set; }
}

/// <summary>A work item relation ("System.LinkTypes.Hierarchy-Reverse" identifies the parent link).</summary>
public sealed class AdoWorkItemRelationDTO
{
    [JsonPropertyName("rel")]
    public string Rel { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// The exact set of work item fields requested by <see cref="AdoClient"/>'s batch call — named
/// explicitly (rather than a loose dictionary) since the request always asks for this fixed set.
/// </summary>
public sealed class AdoWorkItemFieldsDTO
{
    [JsonPropertyName("System.Title")]
    public string? Title { get; set; }

    [JsonPropertyName("System.WorkItemType")]
    public string? WorkItemType { get; set; }

    [JsonPropertyName("System.State")]
    public string? State { get; set; }

    [JsonPropertyName("System.TeamProject")]
    public string? TeamProject { get; set; }

    [JsonPropertyName("System.AreaPath")]
    public string? AreaPath { get; set; }

    [JsonPropertyName("System.Tags")]
    public string? Tags { get; set; }

    [JsonPropertyName("System.AssignedTo")]
    public AdoIdentityRefDTO? AssignedTo { get; set; }

    [JsonPropertyName("System.CreatedBy")]
    public AdoIdentityRefDTO? CreatedBy { get; set; }

    [JsonPropertyName("System.CreatedDate")]
    public DateTimeOffset? CreatedDate { get; set; }

    [JsonPropertyName("System.ChangedDate")]
    public DateTimeOffset? ChangedDate { get; set; }

    /// <summary>
    /// Only requested/populated for the single-work-item detail fetch (<c>GetWorkItemDetailAsync</c>)
    /// — the batch endpoint's fixed <see cref="AdoClient"/> field list omits it to keep the sync's
    /// hydration call small, since the inbox list view never needs the full description.
    /// </summary>
    [JsonPropertyName("System.Description")]
    public string? Description { get; set; }
}

/// <summary>Azure DevOps' common "identity reference" shape — used for AssignedTo/CreatedBy/reviewers alike.</summary>
public sealed class AdoIdentityRefDTO
{
    [JsonPropertyName("displayName")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("uniqueName")]
    public string? UniqueName { get; set; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }
}
