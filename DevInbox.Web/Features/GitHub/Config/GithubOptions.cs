namespace DevInbox.Web.Features.GitHub.Config;

public class GithubOptions
{
    public const string SectionName = "GitHub";
    public required string ClientId { get; set; } = string.Empty;
    public required string ClientSecret { get; set; } = string.Empty;
    public string Scope { get; set; } = "read:user user:email repo";
    public string AuthorizationUri { get; set; } = "https://github.com/login/oauth/authorize";
    public string TokenUri { get; set; } = "https://github.com/login/oauth/access_token";

    /// <summary>
    /// GitHub API base address — REST calls and the GraphQL endpoint are both derived from this.
    /// A trailing slash is enforced (see <see cref="NormalizedBaseAddress"/>) since HttpClient's
    /// relative-URI combining (RFC 3986 §5.3 "merge") drops the base's last path segment entirely
    /// when the base doesn't end in "/" — regardless of whether the relative path itself has a
    /// leading slash. Without this, "https://host/github" + "user" resolves to "https://host/user",
    /// silently discarding "/github".
    /// </summary>
    public string BaseUrl { get; set; } = "https://api.github.com";

    /// <summary><see cref="BaseUrl"/> guaranteed to end with "/" so relative paths append correctly.</summary>
    public string NormalizedBaseAddress => BaseUrl.EndsWith('/') ? BaseUrl : $"{BaseUrl}/";

    /// <summary>REST endpoint for <c>GitHubClient.GetCurrentUserAsync</c> — combined via <see cref="Uri"/>, not string concatenation, to avoid duplicate slashes.</summary>
    public string UserUri => new Uri(new Uri(NormalizedBaseAddress), "user").ToString();

    /// <summary>GraphQL endpoint — combined via <see cref="Uri"/>, not string concatenation, to avoid duplicate slashes.</summary>
    public string GraphQlUri => new Uri(new Uri(NormalizedBaseAddress), "graphql").ToString();

    /// <summary>
    /// Frontend base URL — set in Development/Local to point at the Vite dev server (e.g. http://localhost:3000).
    /// Leave empty in production — the frontend is served from the same origin so a relative /inbox redirect works.
    /// </summary>
    public string FrontendUrl { get; set; } = string.Empty;
}
