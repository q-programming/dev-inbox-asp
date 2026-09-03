using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>
/// Response shape of <c>GET {organization}/_apis/connectionData?api-version=7.0-preview</c> —
/// organization-scoped, unlike the global profile API (<c>app.vssps.visualstudio.com</c>), so it
/// works even with a PAT scoped to just this one organization. This is now the primary way to
/// validate a PAT and resolve the connecting user's identity, since Microsoft is deprecating
/// "all accessible organizations" PATs (https://aka.ms/GlobalPATDeprecation, effective Dec 1 2026).
/// </summary>
public sealed class AdoConnectionDataDTO
{
    [JsonPropertyName("authenticatedUser")]
    public AdoAuthenticatedUserDTO AuthenticatedUser { get; set; } = null!;
}

public sealed class AdoAuthenticatedUserDTO
{
    /// <summary>ADO identity GUID — stable per-user identifier, analogous to GitHub's numeric user id.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Display name, e.g. "John Doe".</summary>
    [JsonPropertyName("providerDisplayName")]
    public string ProviderDisplayName { get; set; } = string.Empty;

    [JsonPropertyName("properties")]
    public AdoAuthenticatedUserPropertiesDTO? Properties { get; set; }
}

public sealed class AdoAuthenticatedUserPropertiesDTO
{
    [JsonPropertyName("Account")]
    public AdoConnectionDataAccountDTO? Account { get; set; }
}

/// <summary>ADO wraps profile-attribute values in a "$type"/"$value" envelope — only the value is needed here.</summary>
public sealed class AdoConnectionDataAccountDTO
{
    [JsonPropertyName("$value")]
    public string Value { get; set; } = string.Empty;
}
