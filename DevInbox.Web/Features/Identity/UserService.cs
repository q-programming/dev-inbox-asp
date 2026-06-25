using System.Security.Claims;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Features.Identity.OAuth;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

/// <summary>
/// Handles user registration, authentication, and profile retrieval.
/// Returns domain entities — callers are responsible for mapping to DTOs.
/// </summary>
public class UserService(IUserRepository userRepository, IHttpContextAccessor httpContextAccessor, ILogger<UserService> logger) : IUserService, IService
{
    private const string GitHubInvalidSuffix = "@github.invalid";

    /// <summary>
    /// Registers a new user with a BCrypt-hashed password.
    /// Throws <see cref="UserAlreadyExistsException"/> if the email is already taken.
    /// </summary>
    public async Task<User> RegisterAsync(RegisterRequest body)
    {
        var email = Utils.NormalizeEmail(body.Email);
        if (await userRepository.ExistsByEmailAsync(email!))
        {
            throw new UserAlreadyExistsException(body.Email);
        }

        var user = new User
        {
            FirstName = body.FirstName,
            LastName = body.LastName,
            Email = email!,
            Password = BCrypt.Net.BCrypt.HashPassword(body.Password),
            Type = User.AccountType.REGULAR
        };
        await userRepository.AddAsync(user);
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
        var user = await userRepository.FindByEmailAsync(email!);

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
        var email = httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(email))
        {
            throw new UnauthorizedException("No authenticated user.");
        }

        return await userRepository.FindByEmailAsync(email)
            ?? throw new UnauthorizedException("Authenticated user no longer exists.");
    }

    /// <summary>
    /// Logout is handled at the transport layer — the JWT cookie is revoked by the controller.
    /// Integration tokens (GitHub, Azure DevOps) are not cleared on logout;
    /// they are managed explicitly via the Settings disconnect flow.
    /// </summary>
    public Task LogoutAsync() => Task.CompletedTask;

    public async Task<User> LoginOrCreateGitHubUserAsync(GitHubUserProfile profile, string accessToken)
    {
        var email = string.IsNullOrEmpty(profile.Email)
            ? profile.Login + GitHubInvalidSuffix
            : profile.Email;

        var user = await userRepository.FindByEmailAsync(email);
        if (user != null)
        {
            logger.LogDebug("Refreshing GitHub token for {Email}", email);
            user.GitHubAccessToken = accessToken;
            await userRepository.UpdateAsync(user);
        }
        else
        {
            var parts = profile.Name?.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = parts?.ElementAtOrDefault(0) ?? profile.Login;
            var lastName = parts?.ElementAtOrDefault(1) ?? string.Empty;
            user = new User
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Type = User.AccountType.OAUTH_GITHUB,
                GitHubAccessToken = accessToken


            };
            await userRepository.AddAsync(user);
            logger.LogDebug("Created new user for GitHub for {Email}", email);
        }
        return user;
    }
}
