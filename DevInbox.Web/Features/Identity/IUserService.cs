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

    /// <summary>Returns the currently authenticated user from the JWT sub claim.</summary>
    Task<User> GetCurrentUserAsync();
}
