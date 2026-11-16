using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Identity;

/// <summary>
/// Contract for user registration, authentication, and profile retrieval.
/// Returns domain entities — callers are responsible for mapping to DTOs.
/// </summary>
public interface IUserService
{
    /// <summary>Registers a new user and returns the persisted entity.</summary>
    Task<User> RegisterAsync(RegisterRequest body);

    /// <summary>Validates credentials and returns the authenticated user.</summary>
    Task<User> LoginAsync(LoginRequest body);

    Task LogoutAsync();

    /// <summary>Returns the currently authenticated user from the JWT sub claim.</summary>
    Task<User> GetCurrentUserAsync();

    /// <summary>Logins or creates new user based on GitHub profile</summary>
    Task<User> LoginOrCreateGitHubUserAsync(GitHubUserProfileDTO profile, string accessToken);

    /// <summary>
    /// Publishes <see cref="Events.UserRemovedEvent"/> synchronously (audit and other handlers), then deletes the
    /// user; related data is removed by FK cascade. Expected to run inside a transaction (see UserController.DeleteAccountAsync).
    /// </summary>
    Task RemoveUserAsync(User user);
}
