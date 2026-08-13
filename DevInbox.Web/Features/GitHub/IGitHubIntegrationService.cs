using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub;

public interface IGitHubIntegrationService
{
    /// <summary>
    /// Connects (or reconnects) GitHub for the current user using a Personal Access Token.
    /// Validates the token against GitHub before storing it. Persists the profile itself.
    /// </summary>
    Task<IntegrationDto> ConnectPatAsync(long userId, string token, DateTimeOffset? expiresAt, CancellationToken ct = default);

    /// <summary>Removes the GitHub integration for the given user.</summary>
    Task DisconnectAsync(long userId);

    /// <summary>
    /// Builds a new, unsaved <see cref="GitHubProfile"/> for a user authenticating via the GitHub
    /// OAuth App flow. Intentionally does not persist — the caller (identity login/registration)
    /// attaches it via the <see cref="Identity.Domain.User.GitHubProfile"/> navigation property and
    /// saves it as part of a single <c>User</c> insert, rather than a separate round trip.
    /// </summary>
    GitHubProfile CreateOAuthProfile(GitHubUserProfileDTO profile, string accessToken);

    /// <summary>
    /// Refreshes an already-tracked OAuth profile's token/login/avatar in place, mutating
    /// <paramref name="existingProfile"/> without saving — the caller persists it as part of its own
    /// (already in-flight) update of the owning <c>User</c>.
    /// </summary>
    void ApplyOAuthRefresh(GitHubProfile existingProfile, GitHubUserProfileDTO profile, string accessToken);
}
