namespace DevInbox.Web.Features.GitHub.Config;

public class GithubOptions
{
    public required string ClientId { get; set; } = string.Empty;
    public required string ClientSecret { get; set; } = string.Empty;
    public string Scope { get; set; } = "read:user user:email repo";
    public string AuthorizationUri { get; set; } = "https://github.com/login/oauth/authorize";
    public string TokenUri { get; set; } = "https://github.com/login/oauth/access_token";
    public string UserUri { get; set; } = "https://api.github.com/user";

    /// <summary>
    /// Frontend base URL — set in Development/Local to point at the Vite dev server (e.g. http://localhost:3000).
    /// Leave empty in production — the frontend is served from the same origin so a relative /inbox redirect works.
    /// </summary>
    public string FrontendUrl { get; set; } = string.Empty;
}
