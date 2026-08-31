using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.ADO.Client.DTO;

/// <summary>
/// Maps the relevant fields from Azure DevOps' <c>GET _apis/profile/profiles/me?api-version=7.0</c>
/// response (served on <c>vssps.dev.azure.com</c> in production, mocked under <c>/ado</c> locally).
/// PascalCase JSON property names are mapped explicitly via <see cref="JsonPropertyNameAttribute"/>
/// since ADO returns camelCase.
/// </summary>
public sealed class AdoUserProfileDTO
{
    /// <summary>ADO profile GUID — stable per-user identifier, analogous to GitHub's numeric user id.</summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Display name, e.g. "John Doe".</summary>
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Primary email address associated with the ADO account.</summary>
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }

    /// <summary>Avatar image — <see cref="AdoAvatarDTO.Value"/> is a data/URL usable directly as an image source.</summary>
    [JsonPropertyName("avatar")]
    public AdoAvatarDTO? Avatar { get; set; }

    /// <summary>Stable subject descriptor (e.g. "aad.xxxx") used by ADO's Graph API — unique per identity.</summary>
    [JsonPropertyName("descriptor")]
    public string? Descriptor { get; set; }
}

public sealed class AdoAvatarDTO
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    [JsonPropertyName("size")]
    public string? Size { get; set; }
}
