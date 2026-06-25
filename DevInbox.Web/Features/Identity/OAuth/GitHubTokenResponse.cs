using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.Identity.OAuth;

/// <summary>Internal DTO for GitHub's access token exchange response.</summary>
internal sealed class GitHubTokenResponse
{
    [JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [JsonPropertyName("token_type")]
    public string? TokenType { get; set; }

    [JsonPropertyName("scope")]
    public string? Scope { get; set; }

    /// <summary>Set by GitHub when the exchange fails — e.g. "bad_verification_code"</summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
