using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

public interface IAdoIntegrationService
{

    /// <summary>
    /// Connects (or reconnects) Azure DevOps for the current user's given organization using a
    /// Personal Access Token. Validates the token against that organization before persisting it —
    /// a bad PAT should never be stored. One organization = one <see cref="AdoProfile"/>/PAT (see
    /// <see cref="AdoProfile"/> for why), so this can be called repeatedly to connect additional
    /// organizations without disturbing already-connected ones.
    /// </summary>
    Task<IntegrationDto> ConnectPatAsync(long userId, string organization, string token, DateTimeOffset? expiresAt, CancellationToken ct = default);

    /// <summary>Removes a single organization's Ado integration (and its PAT) for the given user.</summary>
    Task DisconnectAsync(long userId, string organization);
}