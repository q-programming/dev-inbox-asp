using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

public interface IAdoIntegrationService
{

    /// <summary>
    /// Connects (or reconnects) Azure DevOps for the current user using a Personal Access Token.
    /// Validates the token against Azure DevOps before storing it. Persists the profile itself.
    /// </summary>
    Task<IntegrationDto> ConnectPatAsync(long userId, string token, DateTimeOffset? expiresAt, CancellationToken ct = default);

    /// <summary>Removes the Ado integration for the given user.</summary>
    Task DisconnectAsync(long userId);

    /// <summary>
    /// Builds a new, unsaved <see cref="AdoProfile"/> for a user authenticating via the GitHub
    /// OAuth App flow. Intentionally does not persist — the caller (identity login/registration)
    /// attaches it via the <see cref="Identity.Domain.User.AdoProfile"/> navigation property and
    /// saves it as part of a single <c>User</c> insert, rather than a separate round trip.
    /// </summary>
    AdoProfile CreateOAuthProfile(AdoUserProfileDTO profile, string accessToken);

    /// <summary>
    /// Refreshes an already-tracked OAuth profile's token/login/avatar in place, mutating
    /// <paramref name="existingProfile"/> without saving — the caller persists it as part of its own
    /// (already in-flight) update of the owning <c>User</c>.
    /// </summary>
    void ApplyOAuthRefresh(AdoProfile existingProfile, AdoUserProfileDTO profile, string accessToken);
}