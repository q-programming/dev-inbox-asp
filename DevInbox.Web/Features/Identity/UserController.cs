using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

public class UserController : IAuthBaseController, IComponent
{
    private readonly UserService _userService;
    public UserController(UserService userService)
    {
        _userService = userService;
    }

    public Task<UserDto> RegisterAsync(RegisterRequest body)
    {
        return _userService.RegisterAsync(body);
    }

    public Task<UserDto> LoginAsync(LoginRequest body)
    {
        throw new NotImplementedException();
    }

    public Task LogoutAsync()
    {
        throw new NotImplementedException();
    }

    public Task<UserDto> MeAsync()
    {
        return _userService.GetCurrentUserAsync();
    }
}
