using System.Text.Json.Serialization;

namespace DevInbox.Web.Features.Identity.OAuth;

/// <summary>
/// Maps the relevant fields from the GitHub GET /user API response.
/// Snake_case JSON property names are mapped to PascalCase via <see cref="JsonPropertyNameAttribute"/>.
/// </summary>
public sealed class GitHubUserProfile
{
    /// <summary>GitHub username, e.g. "octocat"</summary>
    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;

    /// <summary>GitHub numeric user ID</summary>
    [JsonPropertyName("id")]
    public long Id { get; set; }

    /// <summary>Display name — may be null if the user has not set one</summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>Primary email — may be null if not public; fall back to login@github.invalid</summary>
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("bio")]
    public string? Bio { get; set; }

    public string AccessToken { get; set; } = string.Empty;
}