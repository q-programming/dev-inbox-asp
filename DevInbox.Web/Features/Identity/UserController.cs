using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

/// <summary>
/// Handles auth HTTP endpoints: register, login, logout, and current user.
/// Delegates business logic to <see cref="IUserService"/> and maps domain entities to DTOs.
/// </summary>
public class UserController(
    IUserService userService,
    IJwtTokenService jwtTokenService) : IAuthBaseController, IComponent
{
    private static readonly UserMapper _mapper = new();

    /// <summary>Registers a new user and returns the created profile.</summary>
    public async Task<UserDto> RegisterAsync(RegisterRequest body)
    {
        var user = await userService.RegisterAsync(body);
        var dto = _mapper.ToDto(user);
        dto.Integrations = [];
        return dto;
    }

    /// <summary>
    /// Authenticates the user, sets the JWT HttpOnly cookie, and returns the user profile.
    /// </summary>
    public async Task<UserDto> LoginAsync(LoginRequest body)
    {
        var user = await userService.LoginAsync(body);
        jwtTokenService.IssueAccessToken(user.Email);
        var dto = _mapper.ToDto(user);
        dto.Integrations =
        [
            new() { Id = 1, Type = IntegrationType.Github, Status = IntegrationStatus.ACTIVE },
            new() { Id = 2, Type = IntegrationType.Ado,    Status = IntegrationStatus.INACTIVE },
        ];
        return dto;
    }

    /// <summary>Clears the JWT cookie, ending the user's session.</summary>
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
        dto.Integrations = []; // TODO: load real integrations
        return dto;
    }
}
