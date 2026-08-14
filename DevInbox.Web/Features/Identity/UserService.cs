using System.Security.Claims;
using DevInbox.Web.Common.Utils;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.Identity.Config;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Features.Sync.Events;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.Extensions.Options;

namespace DevInbox.Web.Features.Identity;

/// <summary>
/// Handles user registration, authentication, and profile retrieval.
/// Returns domain entities — callers are responsible for mapping to DTOs.
/// </summary>
public class UserService(
    IUserRepository userRepository,
    IHttpContextAccessor httpContextAccessor,
    ILogger<UserService> logger,
    IPublisher publisher,
    IGitHubIntegrationService gitHubIntegrationService,
    IOptions<IdentityOptions> options) : IUserService, IService
{
    private const string GitHubInvalidSuffix = "@github.invalid";

    /// <summary>
    /// Registers a new user with a BCrypt-hashed password.
    /// Throws <see cref="UserAlreadyExistsException"/> if the email is already taken.
    /// </summary>
    public async Task<User> RegisterAsync(RegisterRequest body)
    {
        var email = EmailUtils.NormalizeEmail(body.Email);
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
            Type = User.AccountType.REGULAR,
            Inbox = Inbox.Domain.Inbox.CreateDefault(),
        };
        if (options.Value.UseMockData)
        {
            user.GitHubProfile = gitHubIntegrationService.CreateOAuthProfile(
                new GitHubUserProfileDTO { Login = "jkowalski", Id = 1 }, "fake-token");
        }
        await userRepository.AddAsync(user);
        await publisher.PublishAsync(new UserCreatedEvent(user.Id, user.Email, user.FirstName, user.LastName, User.AccountType.REGULAR.ToString()));
        return user;
    }

    /// <summary>
    /// Validates credentials and returns the authenticated user.
    /// Throws <see cref="UnauthorizedException"/> if email or password is invalid.
    /// Intentionally uses the same error message for both cases to avoid leaking whether an email exists.
    /// </summary>
    public async Task<User> LoginAsync(LoginRequest body)
    {
        var email = EmailUtils.NormalizeEmail(body.Email);
        var user = await userRepository.FindByEmailAsync(email!) ?? throw new UnauthorizedException("Authentication failed");
        if (!BCrypt.Net.BCrypt.Verify(body.Password, user.Password))
        {
            await publisher.PublishAsync(new AuthenticationFailedEvent(email!, "Invalid credentials"));
            throw new UnauthorizedException("Authentication failed");

        }
        await publisher.PublishAsync(new UserAuthenticatedEvent(user.Id, user.Email));
        await publisher.PublishAsync(new SyncRequestedEvent(user.Id, user.Email));
        return user;
    }

    /// <summary>
    /// Returns the currently authenticated user based on the JWT sub claim.
    /// Throws <see cref="UnauthorizedException"/> if there is no authenticated user in the current request.
    /// </summary>
    public async Task<User> GetCurrentUserAsync()
    {
        var userId = httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedException("No authenticated user.");
        }

        return await userRepository.FindByIdAsync(long.Parse(userId))
            ?? throw new UnauthorizedException("Authenticated user no longer exists.");
    }

    /// <summary>
    /// Logout is handled at the transport layer — the JWT cookie is revoked by the controller.
    /// Integration tokens (GitHub, Azure DevOps) are not cleared on logout;
    /// they are managed explicitly via the Settings disconnect flow.
    /// </summary>
    public Task LogoutAsync()
    {
        return Task.CompletedTask;
    }

    public async Task<User> LoginOrCreateGitHubUserAsync(GitHubUserProfileDTO profile, string accessToken)
    {
        var email = string.IsNullOrEmpty(profile.Email)
            ? profile.Login + GitHubInvalidSuffix
            : profile.Email;

        var user = await userRepository.FindByEmailWithGitHubProfileAsync(email);
        if (user != null)
        {
            logger.LogDebug("Refreshing GitHub token for {Email}", email);
            gitHubIntegrationService.ApplyOAuthRefresh(user.GitHubProfile!, profile, accessToken);
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
                GitHubProfile = gitHubIntegrationService.CreateOAuthProfile(profile, accessToken),
                Inbox = Inbox.Domain.Inbox.CreateDefault()
            };
            await userRepository.AddAsync(user);
            await publisher.PublishAsync(new UserCreatedEvent(user.Id, user.Email, user.FirstName, user.LastName, User.AccountType.OAUTH_GITHUB.ToString()));
            logger.LogDebug("Created new user for GitHub for {Email}", email);
        }
        await publisher.PublishAsync(new UserAuthenticatedEvent(user.Id, user.Email));
        await publisher.PublishAsync(new SyncRequestedEvent(user.Id, user.Email));
        return user;
    }
}
