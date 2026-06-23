using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

public class UserService(IUserRepository userRepository) : IService
{
    private readonly IUserRepository _users = userRepository;
    private static readonly UserMapper _mapper = new();

    public async Task<UserDto> RegisterAsync(RegisterRequest body)
    {
        var email = Utils.NormalizeEmail(body.Email);
        if (await _users.ExistsByEmailAsync(email!))
        {
            throw new UserAlreadyExistsException(body.Email);
        }

        var user = new User
        {
            FirstName = body.FirstName,
            LastName = body.LastName,
            Email = email!,
        };
        await _users.AddAsync(user);
        var userDto = _mapper.ToDto(user);
        userDto.Integrations = [];
        return userDto;
    }

    public Task<UserDto> GetCurrentUserAsync()
    {
        var user = new UserDto
        {
            Id = 1,
            Email = "john@doe.com",
            Integrations =
            [
                new() {
                    Id = 1,
                    Type = IntegrationType.Github,
                    Status = IntegrationStatus.ACTIVE,
                },
                new() {
                    Id = 2,
                    Type = IntegrationType.Ado,
                    Status = IntegrationStatus.INACTIVE,
                },
            ],
        };
        return Task.FromResult(user);
    }
}