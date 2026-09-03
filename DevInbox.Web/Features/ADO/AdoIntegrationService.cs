using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

/// <summary>
/// Owns the full lifecycle of a user's <see cref="AdoProfile"/> connections — currently only the
/// Personal Access Token flow (Azure DevOps has no OAuth App equivalent wired up yet, unlike
/// GitHub). One organization = one profile/PAT (see <see cref="AdoProfile"/>), so most operations
/// here are scoped to a specific organization rather than "the" user's single ADO connection.
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

    public AdoProfile CreateOAuthProfile(AdoUserProfileDTO profile, string accessToken)
    {
        // Azure DevOps has no OAuth App flow wired up yet — this exists only for parity with
        // GitHubIntegrationService and is unreachable today. Organization is left empty since a
        // future OAuth callback would need its own way to determine/collect it (OAuth tokens are
        // typically broader-scoped than a single-organization PAT).
        var adoProfile = new AdoProfile { Organization = string.Empty };
        UpdateProfileFromProfileDto(adoProfile, profile, accessToken, Sync.Domain.IntegrationAuthMethod.OAuthApp, expiresAt: null);
        return adoProfile;
    }

    public void ApplyOAuthRefresh(AdoProfile existingProfile, AdoUserProfileDTO profile, string accessToken)
    {
        UpdateProfileFromProfileDto(existingProfile, profile, accessToken, Sync.Domain.IntegrationAuthMethod.OAuthApp, expiresAt: null);
    }

    /// <summary>
    /// Applies the fields common to every ADO profile create/update reachable via
    /// <see cref="AdoUserProfileDTO"/> (currently only the unreachable OAuth branch — see
    /// <see cref="CreateOAuthProfile"/>). The PAT connect path uses
    /// <see cref="ApplyConnectionData"/> instead, since it validates via a different, org-scoped DTO.
    /// </summary>
    private static void UpdateProfileFromProfileDto(
        AdoProfile adoProfile,
        AdoUserProfileDTO profile,
        string accessToken,
        Sync.Domain.IntegrationAuthMethod authMethod,
        DateTimeOffset? expiresAt)
    {
        adoProfile.AdoUserId = profile.Id;
        adoProfile.AdoLogin = profile.DisplayName;
        adoProfile.AvatarUrl = profile.Avatar?.Value;
        adoProfile.AccessToken = accessToken;
        adoProfile.AuthMethod = authMethod;
        adoProfile.TokenExpiresAt = expiresAt;
        adoProfile.Status = Sync.Domain.IntegrationStatus.Active;
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
