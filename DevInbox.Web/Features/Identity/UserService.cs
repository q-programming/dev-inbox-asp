using System.Security.Claims;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

/// <summary>
/// Handles user registration, authentication, and profile retrieval.
/// Returns domain entities — callers are responsible for mapping to DTOs.
/// </summary>
public class UserService(IUserRepository userRepository, IHttpContextAccessor httpContextAccessor) : IUserService, IService
{
    private readonly IUserRepository _users = userRepository;
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

    /// <summary>
    /// Registers a new user with a BCrypt-hashed password.
    /// Throws <see cref="UserAlreadyExistsException"/> if the email is already taken.
    /// </summary>
    public async Task<User> RegisterAsync(RegisterRequest body)
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
            Password = BCrypt.Net.BCrypt.HashPassword(body.Password)
        };
        await _users.AddAsync(user);
        return user;
    }

    /// <summary>
    /// Validates credentials and returns the authenticated user.
    /// Throws <see cref="UnauthorizedException"/> if email or password is invalid.
    /// Intentionally uses the same error message for both cases to avoid leaking whether an email exists.
    /// </summary>
    public async Task<User> LoginAsync(LoginRequest body)
    {
        var email = Utils.NormalizeEmail(body.Email);
        var user = await _users.FindByEmailAsync(email!);

        if (user == null || !BCrypt.Net.BCrypt.Verify(body.Password, user.Password))
        {
            throw new UnauthorizedException("Authentication failed");

        }
        return user;
    }

    /// <summary>
    /// Returns the currently authenticated user based on the JWT sub claim.
    /// Throws <see cref="UnauthorizedException"/> if there is no authenticated user in the current request.
    /// </summary>
    public async Task<User> GetCurrentUserAsync()
    {
        var email = _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(email))
        {
            throw new UnauthorizedException("No authenticated user.");
        }

        return await _users.FindByEmailAsync(email)
            ?? throw new UnauthorizedException("Authenticated user no longer exists.");
    }
}
