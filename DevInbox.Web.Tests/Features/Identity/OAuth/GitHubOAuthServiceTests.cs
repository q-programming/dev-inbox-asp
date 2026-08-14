using System.Net;
using System.Text.Json;
using DevInbox.Web.Common;
using DevInbox.Web.Features.GitHub.Config;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.Identity.OAuth;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using RichardSzalay.MockHttp;

namespace DevInbox.Web.Tests.Features.Identity.OAuth;

/// <summary>
/// Tests for <see cref="GitHubOAuthService"/>.
/// HTTP calls are intercepted via <see cref="MockHttpMessageHandler"/> wired into
/// a real <see cref="IHttpClientFactory"/> — the same pattern used in production code.
/// </summary>
public class GitHubOAuthServiceTests
{
    // Derived from GithubOptions defaults — single source of truth, no duplication
    private static readonly string DefaultTokenUri = new GithubOptions { ClientId = string.Empty, ClientSecret = string.Empty }.TokenUri;
    private static readonly string DefaultUserUri = new GithubOptions { ClientId = string.Empty, ClientSecret = string.Empty }.UserUri;

    private const string ClientId = "test-client-id";
    private const string ClientSecret = "test-client-secret";
    private const string FakeCode = "github-code-abc";
    private const string FakeState = "secure-state-xyz";
    private const string FakeAccessToken = "gho_faketoken123";
    private const string GithubLogin = "octocat";
    private const string GithubName = "The Octocat";
    private const string GithubEmail = "octocat@github.com";
    private const string FrontendUrl = "http://localhost:3000";

    private readonly MockHttpMessageHandler _mockHttp;
    private readonly GitHubOAuthService _service;
    private readonly IGitHubClient _gitHubClient;

    public GitHubOAuthServiceTests()
    {
        _mockHttp = new MockHttpMessageHandler();
        var httpClient = _mockHttp.ToHttpClient();
        httpClient.BaseAddress = new Uri("https://api.github.com");
        _gitHubClient = new GitHubClient(httpClient, BuildFactory(_mockHttp), Substitute.For<ILogger<GitHubClient>>());
        _service = new GitHubOAuthService(BuildFactory(_mockHttp), BuildOptions(), _gitHubClient);
    }

    // -------------------------------------------------------------------------
    // CreateAuthorizationUrl
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "CreateAuthorizationUrl should build URL with client_id, scope, state and redirect_uri")]
    public void CreateAuthorizationUrlShouldContainRequiredQueryParams()
    {
        var context = BuildHttpContext();

        var url = _service.CreateAuthorizationUrl(context);

        Assert.Contains($"client_id={ClientId}", url);
        Assert.Contains("scope=", url);
        Assert.Contains("state=", url);
        Assert.Contains("redirect_uri=", url);
    }

    [Fact(DisplayName = "CreateAuthorizationUrl should set the oauth_state cookie on the response")]
    public void CreateAuthorizationUrlShouldSetStateCookie()
    {
        var context = BuildHttpContext();

        _service.CreateAuthorizationUrl(context);

        Assert.True(context.Response.Headers.ContainsKey("Set-Cookie"));
        Assert.Contains("oauth_state", context.Response.Headers["Set-Cookie"].ToString());
    }

    // -------------------------------------------------------------------------
    // AuthenticateAsync — state verification
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AuthenticateAsync should throw BadRequestException when state cookie is missing")]
    public async Task AuthenticateAsyncShouldThrowWhenStateCookieMissing()
    {
        var context = BuildHttpContext(stateCookie: null);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _service.AuthenticateAsync(context, FakeCode, FakeState));
    }

    [Fact(DisplayName = "AuthenticateAsync should throw BadRequestException when state cookie does not match")]
    public async Task AuthenticateAsyncShouldThrowWhenStateMismatch()
    {
        var context = BuildHttpContext(stateCookie: "different-state");

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _service.AuthenticateAsync(context, FakeCode, FakeState));
    }

    // -------------------------------------------------------------------------
    // AuthenticateAsync — happy path (state valid + HTTP calls succeed)
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AuthenticateAsync should return profile and access token on success")]
    public async Task AuthenticateAsyncShouldReturnProfileAndTokenOnSuccess()
    {
        _mockHttp.When(HttpMethod.Post, DefaultTokenUri)
            .Respond("application/json", JsonSerializer.Serialize(new { access_token = FakeAccessToken }));

        _mockHttp.When(HttpMethod.Get, DefaultUserUri)
            .Respond("application/json", JsonSerializer.Serialize(new
            {
                login = GithubLogin,
                id = 1,
                name = GithubName,
                email = GithubEmail
            }));

        var context = BuildHttpContext(stateCookie: FakeState);

        var (profile, token) = await _service.AuthenticateAsync(context, FakeCode, FakeState);

        Assert.Equal(FakeAccessToken, token);
        Assert.Equal(GithubLogin, profile.Login);
        Assert.Equal(GithubEmail, profile.Email);
        Assert.Equal(FakeAccessToken, token);
    }

    // -------------------------------------------------------------------------
    // AuthenticateAsync — HTTP failures
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AuthenticateAsync should throw UnauthorizedException when GitHub returns no access token")]
    public async Task AuthenticateAsyncShouldThrowWhenTokenMissingInResponse()
    {
        _mockHttp.When(HttpMethod.Post, DefaultTokenUri)
            .Respond("application/json", JsonSerializer.Serialize(new { error = "bad_verification_code" }));

        var context = BuildHttpContext(stateCookie: FakeState);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            _service.AuthenticateAsync(context, FakeCode, FakeState));
    }

    [Fact(DisplayName = "AuthenticateAsync should throw when token endpoint returns non-success HTTP status")]
    public async Task AuthenticateAsyncShouldThrowWhenTokenEndpointFails()
    {
        _mockHttp.When(HttpMethod.Post, DefaultTokenUri)
            .Respond(HttpStatusCode.ServiceUnavailable);

        var context = BuildHttpContext(stateCookie: FakeState);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            _service.AuthenticateAsync(context, FakeCode, FakeState));
    }

    // -------------------------------------------------------------------------
    // GetPostLoginRedirectUrl
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "GetPostLoginRedirectUrl should return /inbox when FrontendUrl is empty")]
    public void GetPostLoginRedirectUrlShouldReturnRelativeWhenNoFrontendUrl()
    {
        Assert.Equal("/inbox", _service.GetPostLoginRedirectUrl());
    }

    [Fact(DisplayName = "GetPostLoginRedirectUrl should return FrontendUrl/inbox when FrontendUrl is set")]
    public void GetPostLoginRedirectUrlShouldReturnAbsoluteWhenFrontendUrlSet()
    {
        var httpClient = _mockHttp.ToHttpClient();
        httpClient.BaseAddress = new Uri("https://api.github.com");
        var gitHubClient = new GitHubClient(httpClient, BuildFactory(_mockHttp), Substitute.For<ILogger<GitHubClient>>());
        var service = new GitHubOAuthService(BuildFactory(_mockHttp), BuildOptions(FrontendUrl), gitHubClient);

        Assert.Equal($"{FrontendUrl}/inbox", service.GetPostLoginRedirectUrl());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static DefaultHttpContext BuildHttpContext(
        string? stateCookie = null,
        string requestScheme = "https",
        string requestHost = "localhost")
    {
        var context = new DefaultHttpContext();
        context.Request.Scheme = requestScheme;
        context.Request.Host = new HostString(requestHost);

        if (stateCookie is not null)
        {
            context.Request.Headers.Cookie = $"oauth_state={stateCookie}";
        }

        return context;
    }

    private static IOptions<GithubOptions> BuildOptions(string frontendUrl = "")
    {
        return Options.Create(new GithubOptions { ClientId = ClientId, ClientSecret = ClientSecret, FrontendUrl = frontendUrl });
    }

    /// <summary>
    /// Wraps a <see cref="MockHttpMessageHandler"/> in a real <see cref="IHttpClientFactory"/>.
    /// MockHttp v7 does not expose ToHttpClientFactory() — wire it through IHttpClientFactory manually.
    /// BaseAddress mirrors what AddGitHubOAuth() sets in production.
    /// </summary>
    private static IHttpClientFactory BuildFactory(MockHttpMessageHandler handler)
    {
        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        services.AddHttpClient("github", c => c.BaseAddress = new Uri("https://api.github.com"))
                .ConfigurePrimaryHttpMessageHandler(() => handler);
        return services.BuildServiceProvider().GetRequiredService<IHttpClientFactory>();
    }
}
