using DevInbox.Web.Features.GitHub.Client.DTO;

namespace DevInbox.Web.Features.Identity.OAuth;

/// <summary>
/// Handles the GitHub OAuth2 handshake — authorization URL construction,
/// code exchange, and user profile retrieval.
/// Equivalent to the OAuth2AuthenticationSuccessHandler in the Java version.
/// </summary>
public interface IGitHubOAuthService
{
    /// <summary>
    /// Builds the GitHub authorization URL and stashes the state cookie on the response.
    /// </summary>
    string CreateAuthorizationUrl(HttpContext context);

    /// <summary>
    /// Verifies the state cookie, exchanges the code for an access token, and returns the GitHub user profile.
    /// Throws <see cref="BadRequestException"/> if state is invalid.
    /// </summary>
    Task<(GitHubUserProfileDTO Profile, string AccessToken)> AuthenticateAsync(HttpContext context, string code, string state);

    /// <summary>
    /// Returns the post-login redirect target — frontend dev server in Development, relative /inbox in production.
    /// </summary>
    string GetPostLoginRedirectUrl();
}