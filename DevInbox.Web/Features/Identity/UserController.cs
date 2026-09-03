using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Mapper;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.GitHub.Mapper;
using DevInbox.Web.Features.Identity.OAuth;
using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

/// <summary>
/// Handles auth HTTP endpoints: register, login, logout, and current user.
/// Delegates business logic to <see cref="IUserService"/> and maps domain entities to DTOs.
/// </summary>
public class UserController(
    IUserService userService,
    IJwtTokenService jwtTokenService,
    IHttpContextAccessor httpContextAccessor,
    IGitHubOAuthService githubAuthService,
    IGitHubProfileRepository gitHubProfileRepository,
    IAdoProfileRepository adoProfileRepository) : IAuthBaseController, IComponent
{
    private static readonly UserMapper _mapper = new();
    private static readonly GitHubIntegrationMapper _integrationMapper = new();
    private static readonly AdoIntegrationMapper _adoIntegrationMapper = new();

    /// <summary>Registers a new user and returns the created profile.</summary>
    public async Task<UserDto> RegisterAsync(RegisterRequest body)
    {
        var user = await userService.RegisterAsync(body);
        var dto = _mapper.ToDto(user);
        dto.Integrations = await LoadIntegrationsAsync(user.Id);
        return dto;
    }

    /// <summary>
    /// Authenticates the user, sets the JWT HttpOnly cookie, and returns the user profile.
    /// </summary>
    public async Task<UserDto> LoginAsync(LoginRequest body)
    {
        var user = await userService.LoginAsync(body);
        jwtTokenService.IssueAccessToken(user);
        var dto = _mapper.ToDto(user);
        dto.Integrations = await LoadIntegrationsAsync(user.Id);
        return dto;
    }

    /// <summary>Clears the JWT cookie, ending the session. Integration tokens are managed separately.</summary>
    public Task LogoutAsync()
    {
        jwtTokenService.RevokeAccessToken();
        return Task.CompletedTask;
    }

    /// <summary>Returns the profile of the currently authenticated user.</summary>
    public async Task<UserDto> MeAsync()
    {
        var user = await userService.GetCurrentUserAsync();
        var dto = _mapper.ToDto(user);
        dto.Integrations = await LoadIntegrationsAsync(user.Id);
        return dto;
    }

    public Task GithubAuthAsync()
    {
        var httpContext = httpContextAccessor.HttpContext!;
        var githubOAuthUrl = githubAuthService.CreateAuthorizationUrl(httpContext);
        httpContext.Response.Redirect(githubOAuthUrl);
        return Task.CompletedTask;
    }

    public async Task GithubAuthCallbackAsync(string code, string state)
    {
        var httpContext = httpContextAccessor.HttpContext!;
        var (profile, accessToken) = await githubAuthService.AuthenticateAsync(httpContext, code, state);

        var user = await userService.LoginOrCreateGitHubUserAsync(profile, accessToken);
        jwtTokenService.IssueAccessToken(user);
        httpContext.Response.Redirect(githubAuthService.GetPostLoginRedirectUrl());
    }

    /// <summary>
    /// Builds the current integrations list for a user — one entry per connected external service
    /// (GitHub, Azure DevOps), omitting any that aren't connected.
    /// </summary>
    private async Task<List<IntegrationDto>> LoadIntegrationsAsync(long userId)
    {
        var integrations = new List<IntegrationDto>();

        var gitHubProfile = await gitHubProfileRepository.GetByUserIdAsync(userId);
        if (gitHubProfile is not null)
        {
            integrations.Add(_integrationMapper.ToIntegrationDto(gitHubProfile));
        }

        var adoProfiles = await adoProfileRepository.GetAllByUserIdAsync(userId);
        integrations.AddRange(adoProfiles.Select(_adoIntegrationMapper.ToIntegrationDto));

        return integrations;
    }
}

