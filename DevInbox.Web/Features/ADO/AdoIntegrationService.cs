using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

/// <summary>
/// Owns the full lifecycle of a user's <see cref="AdoProfile"/> — currently only the Personal
/// Access Token flow (Azure DevOps has no OAuth App equivalent wired up yet, unlike GitHub).
/// </summary>
public class AdoIntegrationService(
    IAdoProfileRepository profileRepository,
    IAdoClient adoClient,
    ILogger<AdoIntegrationService> logger) : IAdoIntegrationService, IService
{
    private static readonly AdoIntegrationMapper _mapper = new();

    public async Task<IntegrationDto> ConnectPatAsync(long userId, string token, DateTimeOffset? expiresAt, CancellationToken ct = default)
    {
        if (expiresAt is { } expiry && expiry <= DateTimeOffset.UtcNow)
        {
            throw new BadRequestException("The provided expiry date is already in the past.");
        }

        // Validate the token by calling Azure DevOps before persisting it — a bad PAT should never
        // be stored.
        AdoUserProfileDTO profile;
        try
        {
            profile = await adoClient.GetCurrentUserProfileAsync(token, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Rejected invalid Azure DevOps PAT for user {UserId}", userId);
            throw new BadRequestException("Could not validate the Azure DevOps token — please check it and try again.");
        }

        var existing = await profileRepository.GetByUserIdAsync(userId);
        var adoProfile = existing ?? new AdoProfile { UserId = userId };
        // The usable-organizations/projects caches are intentionally left untouched here —
        // they're resolved lazily (discovered + probed) by the forced full sync that follows every
        // connect, rather than duplicating that discovery logic on the connect path itself.
        UpdateProfile(adoProfile, profile, token, Sync.Domain.IntegrationAuthMethod.Pat, expiresAt);

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

    public Task DisconnectAsync(long userId)
    {
        return profileRepository.DeleteByUserIdAsync(userId);
    }

    public AdoProfile CreateOAuthProfile(AdoUserProfileDTO profile, string accessToken)
    {
        var adoProfile = new AdoProfile();
        UpdateProfile(adoProfile, profile, accessToken, Sync.Domain.IntegrationAuthMethod.OAuthApp, expiresAt: null);
        return adoProfile;
    }

    public void ApplyOAuthRefresh(AdoProfile existingProfile, AdoUserProfileDTO profile, string accessToken)
    {
        UpdateProfile(existingProfile, profile, accessToken, Sync.Domain.IntegrationAuthMethod.OAuthApp, expiresAt: null);
    }

    /// <summary>
    /// Applies the fields common to every ADO profile create/update, regardless of auth method.
    /// Currently only the PAT connect/reconnect path is reachable — the OAuth branch exists for
    /// parity with <c>GitHubIntegrationService</c> in case ADO gains an OAuth App flow later.
    /// </summary>
    private static void UpdateProfile(
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
}
