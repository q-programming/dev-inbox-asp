using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

/// <summary>
/// Owns the full lifecycle of a user's <see cref="AdoProfile"/> connections via Personal Access
/// Token — Azure DevOps' OAuth App flow requires organization-scoped consent per-org (unlike
/// GitHub's single-app-wide OAuth), which doesn't fit well with a "add PATs as you go" multi-org
/// model, so PAT is the only supported connect method. One organization = one profile/PAT (see
/// <see cref="AdoProfile"/>), so most operations here are scoped to a specific organization rather
/// than "the" user's single ADO connection.
/// </summary>
public class AdoIntegrationService(
    IAdoProfileRepository profileRepository,
    IAdoClient adoClient,
    ILogger<AdoIntegrationService> logger) : IAdoIntegrationService, IService
{
    private static readonly AdoIntegrationMapper _mapper = new();

    public async Task<IntegrationDto> ConnectPatAsync(long userId, string organization, string token, DateTimeOffset? expiresAt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(organization))
        {
            throw new BadRequestException("An Azure DevOps organization name is required.");
        }
        if (expiresAt is { } expiry && expiry <= DateTimeOffset.UtcNow)
        {
            throw new BadRequestException("The provided expiry date is already in the past.");
        }

        // Validate the token against this specific organization before persisting it — a bad PAT
        // should never be stored. Organization-scoped (not the global profile API) since PATs are
        // now organization-scoped too (see AdoProfile's doc comment).
        AdoConnectionDataDTO connectionData;
        try
        {
            connectionData = await adoClient.GetConnectionDataAsync(token, organization, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Rejected invalid Azure DevOps PAT for user {UserId}, organization {Organization}", userId, organization);
            throw new BadRequestException("Could not validate the Azure DevOps token for this organization — please check both and try again.");
        }

        var existing = await profileRepository.GetByUserIdAndOrganizationAsync(userId, organization);
        var adoProfile = existing ?? new AdoProfile { UserId = userId, Organization = organization };
        // The cached project list is intentionally left untouched here — it's resolved lazily
        // (discovered) by the forced full sync that follows every connect, rather than duplicating
        // that discovery logic on the connect path itself.
        ApplyConnectionData(adoProfile, connectionData, token, expiresAt);

        if (existing is null)
        {
            await profileRepository.AddAsync(adoProfile);
        }
        else
        {
            await profileRepository.UpdateAsync(adoProfile);
        }

        return _mapper.ToIntegrationDto(adoProfile);
    }

    public Task DisconnectAsync(long userId, string organization)
    {
        return profileRepository.DeleteByUserIdAndOrganizationAsync(userId, organization);
    }

    /// <summary>Applies the fields from an org-scoped <see cref="AdoConnectionDataDTO"/> (the PAT connect path) — see <see cref="ConnectPatAsync"/>.</summary>
    private static void ApplyConnectionData(AdoProfile adoProfile, AdoConnectionDataDTO connectionData, string accessToken, DateTimeOffset? expiresAt)
    {
        var user = connectionData.AuthenticatedUser;
        adoProfile.AdoUserId = user.Id;
        adoProfile.AdoLogin = user.ProviderDisplayName;
        adoProfile.AdoEmail = user.Properties?.Account?.Value;
        // connectionData carries no avatar (unlike the global profile API) — left null. This is the
        // trade-off of relying on an organization-scoped identity call instead of the global one,
        // in exchange for working with PATs scoped to a single organization.
        adoProfile.AvatarUrl = null;
        adoProfile.AccessToken = accessToken;
        adoProfile.AuthMethod = Sync.Domain.IntegrationAuthMethod.Pat;
        adoProfile.TokenExpiresAt = expiresAt;
        adoProfile.Status = Sync.Domain.IntegrationStatus.Active;
    }
}
