using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>
/// Response shape of <c>GET _apis/accounts?memberId={id}&amp;api-version=7.1</c> — every Azure
/// DevOps organization ("account") the given member is part of. Only reliable when the calling PAT
/// is scoped to "All accessible organizations"; a PAT scoped to a single organization will still
/// return a 200 here, but subsequent calls against other listed organizations may 401/403 — callers
/// must probe each candidate before trusting it (see <c>AdoService.ResolveOrganizationsAsync</c>).
/// </summary>
public sealed class AdoAccountsResponseDTO
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("value")]
    public List<AdoAccountDTO> Value { get; set; } = [];
}

public sealed class AdoAccountDTO
{
    [JsonPropertyName("accountId")]
    public string AccountId { get; set; } = string.Empty;

    [JsonPropertyName("accountName")]
    public string AccountName { get; set; } = string.Empty;
}
