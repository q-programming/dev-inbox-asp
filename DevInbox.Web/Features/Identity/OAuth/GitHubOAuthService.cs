using System.Net.Http.Headers;
using System.Security.Cryptography;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace DevInbox.Web.Features.Identity.OAuth;

public class GitHubOAuthService(IHttpClientFactory httpClientFactory, IOptions<GithubOptions> ghOptions, IGitHubClient gitHubClient) : IGitHubOAuthService, IService
{
    private readonly GithubOptions _options = ghOptions.Value; // .Value evaluated once

    private HttpClient GitHubClient => httpClientFactory.CreateClient("github");

    public string CreateAuthorizationUrl(HttpContext context)
    {
        var request = context.Request;
        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var redirectUri = BuildCallbackUri(request);
        var query = QueryString.Create([
            KeyValuePair.Create<string, string?>("client_id", _options.ClientId),
            KeyValuePair.Create<string, string?>("redirect_uri", redirectUri),
            KeyValuePair.Create<string, string?>("scope", _options.Scope),
            KeyValuePair.Create<string, string?>("state", state),
        ]);

        context.Response.Cookies.Append(
            "oauth_state",
            state,
            new CookieOptions { HttpOnly = true, SameSite = SameSiteMode.Lax, MaxAge = TimeSpan.FromMinutes(10) }
        );

        return _options.AuthorizationUri + query;
    }

    public async Task<(GitHubUserProfileDTO Profile, string AccessToken)> AuthenticateAsync(HttpContext context, string code, string state)
    {
        var storedState = context.Request.Cookies["oauth_state"];
        if (string.IsNullOrEmpty(storedState) || storedState != state)
        {
            throw new BadRequestException("Invalid OAuth state — possible CSRF attempt.");
        }

        // single-use — delete immediately after verification
        context.Response.Cookies.Delete("oauth_state");

        var redirectUri = BuildCallbackUri(context.Request);
        var accessToken = await ExchangeCodeAsync(code, redirectUri);
        var (Profile, AccessToken) = await gitHubClient.GetCurrentUserAsync(accessToken);
        return (Profile, AccessToken);
    }

    private async Task<string> ExchangeCodeAsync(string code, string redirectUri)
    {
        // GitHub token exchange requires form-encoded body, not JSON
        var body = new FormUrlEncodedContent([
            KeyValuePair.Create("client_id", _options.ClientId),
            KeyValuePair.Create("client_secret", _options.ClientSecret),
            KeyValuePair.Create("code", code),
            KeyValuePair.Create("redirect_uri", redirectUri),
        ]);

        // Token endpoint is on github.com, not api.github.com — use full URL
        var request = new HttpRequestMessage(HttpMethod.Post, _options.TokenUri)
        {
            Content = body
        };
        // Ask for JSON response (default is form-encoded)
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var response = await GitHubClient.SendAsync(request);
        _ = response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GitHubTokenResponse>()
            ?? throw new UnauthorizedException("GitHub token exchange returned empty response.");

        if (string.IsNullOrWhiteSpace(result.AccessToken))
        {
            throw new UnauthorizedException("GitHub token exchange failed: no access token returned.");
        }

        return result.AccessToken;
    }

    public string GetPostLoginRedirectUrl()
    {
        return string.IsNullOrWhiteSpace(_options.FrontendUrl)
                ? "/inbox"
                : _options.FrontendUrl.TrimEnd('/') + "/inbox";
    }

    /// <summary>Builds the OAuth callback URI from the current request — must match the authorization request exactly.</summary>
    private static string BuildCallbackUri(HttpRequest request)
    {
        return $"{request.Scheme}://{request.Host}/api/auth/github/callback";
    }
}
