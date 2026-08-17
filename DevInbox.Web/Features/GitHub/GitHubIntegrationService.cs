using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.GitHub.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub;

/// <summary>
/// Owns the full lifecycle of a user's <see cref="GitHubProfile"/> — both the Personal Access Token
/// flow (validated, persisted and mapped entirely here) and the field-mapping for the OAuth App flow.
/// Persistence for the OAuth App flow stays with the caller since it happens as part of a broader
/// <see cref="Identity.Domain.User"/> save — see <see cref="CreateOAuthProfile"/>/<see cref="ApplyOAuthRefresh"/>.
/// </summary>
public class GitHubIntegrationService(
    IGitHubProfileRepository profileRepository,
    IGitHubClient gitHubClient,
    ILogger<GitHubIntegrationService> logger) : IGitHubIntegrationService, IService
{
    private static readonly GitHubIntegrationMapper _mapper = new();

    public async Task<IntegrationDto> ConnectPatAsync(long userId, string token, DateTimeOffset? expiresAt, CancellationToken ct = default)
    {
        if (expiresAt is { } expiry && expiry <= DateTimeOffset.UtcNow)
        {
            throw new BadRequestException("The provided expiry date is already in the past.");
        }

        // Validate the token by calling GitHub before persisting it — a bad PAT should never be stored.
        GitHubUserProfileDTO profile;
        try
        {
            (profile, _) = await gitHubClient.GetCurrentUserAsync(token, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Rejected invalid GitHub PAT for user {UserId}", userId);
            throw new BadRequestException("Could not validate the GitHub token — please check it and try again.");
        }

        var existing = await profileRepository.GetByUserIdAsync(userId);
        var gitHubProfile = existing ?? new GitHubProfile { UserId = userId };
        UpdateProfile(gitHubProfile, profile, token, Sync.Domain.IntegrationAuthMethod.Pat, expiresAt);

        if (existing is null)
        {
            await profileRepository.AddAsync(gitHubProfile);
        }
        else
        {
            await profileRepository.UpdateAsync(gitHubProfile);
        }

        return _mapper.ToIntegrationDto(gitHubProfile);
    }

    public Task DisconnectAsync(long userId)
    {
        return profileRepository.DeleteByUserIdAsync(userId);
    }

    public GitHubProfile CreateOAuthProfile(GitHubUserProfileDTO profile, string accessToken)
    {
        var gitHubProfile = new GitHubProfile();
        UpdateProfile(gitHubProfile, profile, accessToken, Sync.Domain.IntegrationAuthMethod.OAuthApp, expiresAt: null);
        return gitHubProfile;
    }

    public void ApplyOAuthRefresh(GitHubProfile existingProfile, GitHubUserProfileDTO profile, string accessToken)
    {
        UpdateProfile(existingProfile, profile, accessToken, Sync.Domain.IntegrationAuthMethod.OAuthApp, expiresAt: null);
    }

    /// <summary>
    /// Applies the fields common to every GitHub profile create/update, regardless of auth method:
    /// PAT connect, PAT reconnect, OAuth App create and OAuth App token refresh all funnel through here.
    /// </summary>
    private static void UpdateProfile(
        GitHubProfile gitHubProfile,
        GitHubUserProfileDTO profile,
        string accessToken,
        Sync.Domain.IntegrationAuthMethod authMethod,
        DateTimeOffset? expiresAt)
    {
        gitHubProfile.GitHubUserId = profile.Id;
        gitHubProfile.GitHubLogin = profile.Login;
        gitHubProfile.AvatarUrl = profile.AvatarUrl;
        gitHubProfile.AccessToken = accessToken;
        gitHubProfile.AuthMethod = authMethod;
        gitHubProfile.TokenExpiresAt = expiresAt;
        gitHubProfile.Status = Sync.Domain.IntegrationStatus.Active;
    }
}
