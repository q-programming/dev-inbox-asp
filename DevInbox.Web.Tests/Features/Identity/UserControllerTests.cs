using DevInbox.Web.Common;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.OAuth;
using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserControllerTests
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private const string StrongPassword = "strongpassword123";

    private static User BuildUser() => new()
    {
        Id = 42,
        FirstName = FirstName,
        LastName = LastName,
        Email = TestEmail,
        Password = "hashed"
    };

    /// <summary>
    /// Tests for endpoints that don't need a real HttpContext (login, logout, register, me).
    /// HttpContextAccessor is stubbed — equivalent to @Nested in JUnit 5.
    /// </summary>
    public class StandardEndpoints
    {
        private readonly IUserService _userService;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IGitHubProfileRepository _gitHubProfileRepository;
        private readonly IAdoProfileRepository _adoProfileRepository;
        private readonly UserController _controller;

        public StandardEndpoints()
        {
            _userService = Substitute.For<IUserService>();
            _jwtTokenService = Substitute.For<IJwtTokenService>();
            _gitHubProfileRepository = Substitute.For<IGitHubProfileRepository>();
            _adoProfileRepository = Substitute.For<IAdoProfileRepository>();
            _controller = new UserController(
                _userService,
                _jwtTokenService,
                Substitute.For<IHttpContextAccessor>(),
                Substitute.For<IGitHubOAuthService>(),
                _gitHubProfileRepository,
                _adoProfileRepository);
        }

        [Fact(DisplayName = "LogoutAsync should revoke the JWT token")]
        public async Task LogoutAsyncShouldRevokeTokenAsync()
        {
            await _controller.LogoutAsync();

            _jwtTokenService.Received(1).RevokeAccessToken();
        }

        [Fact(DisplayName = "LoginAsync should issue JWT token for authenticated user email")]
        public async Task LoginAsyncShouldIssueTokenForAuthenticatedUserAsync()
        {
            _userService.LoginAsync(Arg.Any<LoginRequest>()).Returns(BuildUser());

            await _controller.LoginAsync(new LoginRequest { Email = TestEmail, Password = StrongPassword });

            _jwtTokenService.Received(1).IssueAccessToken(Arg.Is<User>(u => u.Email == TestEmail && u.Id == 42));
        }

        [Fact(DisplayName = "LoginAsync should return user dto on success")]
        public async Task LoginAsyncShouldReturnUserDtoAsync()
        {
            _userService.LoginAsync(Arg.Any<LoginRequest>()).Returns(BuildUser());

            var result = await _controller.LoginAsync(new LoginRequest { Email = TestEmail, Password = StrongPassword });

            Assert.Equal(TestEmail, result.Email);
            Assert.Equal(FirstName, result.FirstName);
            Assert.Equal(LastName, result.LastName);
        }

        [Fact(DisplayName = "LoginAsync should propagate UnauthorizedException and not issue token")]
        public async Task LoginAsyncShouldPropagateUnauthorizedExceptionAsync()
        {
            _userService.LoginAsync(Arg.Any<LoginRequest>()).Returns<User>(_ => throw new UnauthorizedException("Authentication failed"));

            await Assert.ThrowsAsync<UnauthorizedException>(() =>
                _controller.LoginAsync(new LoginRequest { Email = TestEmail, Password = "wrong" }));

            _jwtTokenService.DidNotReceive().IssueAccessToken(Arg.Any<User>());
        }

        [Fact(DisplayName = "MeAsync should return dto for currently authenticated user")]
        public async Task MeAsyncShouldReturnCurrentUserDtoAsync()
        {
            _userService.GetCurrentUserAsync().Returns(BuildUser());

            var result = await _controller.MeAsync();

            Assert.Equal(TestEmail, result.Email);
            Assert.Equal(FirstName, result.FirstName);
            Assert.Equal(LastName, result.LastName);
        }

        [Fact(DisplayName = "RegisterAsync should return dto for newly registered user")]
        public async Task RegisterAsyncShouldReturnUserDtoAsync()
        {
            _userService.RegisterAsync(Arg.Any<RegisterRequest>()).Returns(BuildUser());

            var result = await _controller.RegisterAsync(new RegisterRequest
            {
                FirstName = FirstName,
                LastName = LastName,
                Email = TestEmail,
                Password = StrongPassword
            });

            Assert.Equal(TestEmail, result.Email);
            Assert.Equal(FirstName, result.FirstName);
            Assert.Equal(LastName, result.LastName);
        }
    }

    /// <summary>
    /// Tests the integration aggregation behavior on the user endpoints.
    /// </summary>
    public class IntegrationLoading
    {
        private readonly IUserService _userService;
        private readonly IGitHubProfileRepository _gitHubProfileRepository;
        private readonly IAdoProfileRepository _adoProfileRepository;
        private readonly UserController _controller;

        public IntegrationLoading()
        {
            _userService = Substitute.For<IUserService>();
            _gitHubProfileRepository = Substitute.For<IGitHubProfileRepository>();
            _adoProfileRepository = Substitute.For<IAdoProfileRepository>();
            _controller = new UserController(
                _userService,
                Substitute.For<IJwtTokenService>(),
                Substitute.For<IHttpContextAccessor>(),
                Substitute.For<IGitHubOAuthService>(),
                _gitHubProfileRepository,
                _adoProfileRepository);
            _userService.GetCurrentUserAsync().Returns(BuildUser());
        }

        [Fact(DisplayName = "MeAsync should return no integrations when neither GitHub nor ADO is connected")]
        public async Task MeAsyncShouldReturnEmptyIntegrationsWhenNothingConnectedAsync()
        {
            _gitHubProfileRepository.GetByUserIdAsync(42).Returns((GitHubProfile?)null);
            _adoProfileRepository.GetByUserIdAsync(42).Returns((AdoProfile?)null);

            var result = await _controller.MeAsync();

            Assert.Empty(result.Integrations);
        }

        [Fact(DisplayName = "MeAsync should return only the GitHub integration when only GitHub is connected")]
        public async Task MeAsyncShouldReturnOnlyGitHubIntegrationAsync()
        {
            _gitHubProfileRepository.GetByUserIdAsync(42).Returns(new GitHubProfile
            {
                Id = 1,
                GitHubUserId = 100,
                GitHubLogin = "octocat",
                AccessToken = "gh-token",
                AuthMethod = DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat,
                Status = DevInbox.Web.Features.Sync.Domain.IntegrationStatus.Active
            });
            _adoProfileRepository.GetByUserIdAsync(42).Returns((AdoProfile?)null);

            var result = await _controller.MeAsync();

            Assert.Single(result.Integrations);
            Assert.Equal(IntegrationType.Github, result.Integrations[0].Type);
        }

        [Fact(DisplayName = "MeAsync should return only the ADO integration when only ADO is connected")]
        public async Task MeAsyncShouldReturnOnlyAdoIntegrationAsync()
        {
            _gitHubProfileRepository.GetByUserIdAsync(42).Returns((GitHubProfile?)null);
            _adoProfileRepository.GetByUserIdAsync(42).Returns(new AdoProfile
            {
                Id = 2,
                AdoUserId = "ado-user-1",
                AdoLogin = "Jane Doe",
                AccessToken = "ado-token",
                AuthMethod = DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat,
                Status = DevInbox.Web.Features.Sync.Domain.IntegrationStatus.Active
            });

            var result = await _controller.MeAsync();

            Assert.Single(result.Integrations);
            Assert.Equal(IntegrationType.Ado, result.Integrations[0].Type);
        }

        [Fact(DisplayName = "MeAsync should return both GitHub and ADO integrations when both are connected")]
        public async Task MeAsyncShouldReturnBothIntegrationsAsync()
        {
            _gitHubProfileRepository.GetByUserIdAsync(42).Returns(new GitHubProfile
            {
                Id = 1,
                GitHubUserId = 100,
                GitHubLogin = "octocat",
                AccessToken = "gh-token",
                AuthMethod = DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat,
                Status = DevInbox.Web.Features.Sync.Domain.IntegrationStatus.Active
            });
            _adoProfileRepository.GetByUserIdAsync(42).Returns(new AdoProfile
            {
                Id = 2,
                AdoUserId = "ado-user-1",
                AdoLogin = "Jane Doe",
                AccessToken = "ado-token",
                AuthMethod = DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat,
                Status = DevInbox.Web.Features.Sync.Domain.IntegrationStatus.Active
            });

            var result = await _controller.MeAsync();

            Assert.Equal(2, result.Integrations.Count);
            Assert.Contains(result.Integrations, i => i.Type == IntegrationType.Github);
            Assert.Contains(result.Integrations, i => i.Type == IntegrationType.Ado);
        }
    }

    /// <summary>
    /// Tests for GitHub OAuth endpoints that require a real HttpContext to assert on redirect responses.
    /// </summary>
    public class GitHubOAuthEndpoints
    {
        private const string GithubCode = "gh-code";
        private const string GithubState = "gh-state";
        private const string GithubToken = "gho_token";
        private const string RedirectUrl = "/inbox";
        private const string AuthorizationUrl = "https://github.com/login/oauth/authorize?client_id=x&state=abc";

        private readonly DefaultHttpContext _httpContext;
        private readonly IGitHubOAuthService _githubAuthService;
        private readonly IUserService _userService;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly UserController _controller;

        public GitHubOAuthEndpoints()
        {
            _httpContext = new DefaultHttpContext();
            var accessor = Substitute.For<IHttpContextAccessor>();
            accessor.HttpContext.Returns(_httpContext);

            _githubAuthService = Substitute.For<IGitHubOAuthService>();
            _userService = Substitute.For<IUserService>();
            _jwtTokenService = Substitute.For<IJwtTokenService>();

            _controller = new UserController(
                _userService,
                _jwtTokenService,
                accessor,
                _githubAuthService,
                Substitute.For<IGitHubProfileRepository>(),
                Substitute.For<IAdoProfileRepository>());
        }

        [Fact(DisplayName = "GithubAuthAsync should redirect to the authorization URL returned by the service")]
        public async Task GithubAuthAsyncShouldRedirectToAuthorizationUrlAsync()
        {
            _githubAuthService.CreateAuthorizationUrl(Arg.Any<HttpContext>()).Returns(AuthorizationUrl);

            await _controller.GithubAuthAsync();

            Assert.Equal(302, _httpContext.Response.StatusCode);
            Assert.Equal(AuthorizationUrl, _httpContext.Response.Headers.Location.ToString());
        }

        [Fact(DisplayName = "GithubAuthCallbackAsync should issue JWT and redirect after successful authentication")]
        public async Task GithubAuthCallbackAsyncShouldIssueTokenAndRedirectOnSuccessAsync()
        {
            var profile = new GitHubUserProfileDTO { Login = "octocat", Email = TestEmail };
            _githubAuthService.AuthenticateAsync(Arg.Any<HttpContext>(), GithubCode, GithubState)
                .Returns((profile, GithubToken));
            _githubAuthService.GetPostLoginRedirectUrl().Returns(RedirectUrl);
            _userService.LoginOrCreateGitHubUserAsync(profile, GithubToken).Returns(BuildUser());

            await _controller.GithubAuthCallbackAsync(GithubCode, GithubState);

            _jwtTokenService.Received(1).IssueAccessToken(Arg.Is<User>(u => u.Email == TestEmail && u.Id == 42));
            Assert.Equal(302, _httpContext.Response.StatusCode);
            Assert.Equal(RedirectUrl, _httpContext.Response.Headers.Location.ToString());
        }

        [Fact(DisplayName = "GithubAuthCallbackAsync should propagate BadRequestException on invalid state")]
        public async Task GithubAuthCallbackAsyncShouldPropagateExceptionOnInvalidStateAsync()
        {
            _githubAuthService.AuthenticateAsync(Arg.Any<HttpContext>(), Arg.Any<string>(), Arg.Any<string>())
                .Returns<(GitHubUserProfileDTO, string)>(_ => throw new BadRequestException("Invalid OAuth state"));

            await Assert.ThrowsAsync<BadRequestException>(() =>
                _controller.GithubAuthCallbackAsync("bad-code", "bad-state"));
        }
    }
}
