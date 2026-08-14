using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.GitHub.Mapper;

/// <summary>
/// Maps a <see cref="GitHubProfile"/> to the wire-level <see cref="IntegrationDto"/>. Only <c>Id</c>
/// is a direct 1:1 copy — <c>Type</c> is a constant (this mapper only ever produces GitHub
/// integrations) and <c>Status</c> is derived from <see cref="GitHubProfile.Status"/> combined with
/// <see cref="GitHubProfile.TokenExpiresAt"/>, so both are filled in by hand in <see cref="ToIntegrationDto"/>.
/// </summary>
[Mapper]
public partial class GitHubIntegrationMapper
{
    public IntegrationDto ToIntegrationDto(GitHubProfile profile)
    {
        var dto = MapCore(profile);
        dto.Type = IntegrationType.Github;
        dto.Status = ResolveStatus(profile);
        return dto;
    }

    [MapperIgnoreTarget(nameof(IntegrationDto.Type))]
    [MapperIgnoreTarget(nameof(IntegrationDto.Status))]
    private partial IntegrationDto MapCore(GitHubProfile profile);

    /// <summary>
    /// A PAT with a past <see cref="GitHubProfile.TokenExpiresAt"/> is treated as expired even if
    /// GitHub hasn't rejected a request with it yet — no need to wait for a failed sync to tell the
    /// user their token needs replacing.
    /// </summary>
    private static IntegrationStatus ResolveStatus(GitHubProfile profile)
    {
        var isPastExpiry = profile.TokenExpiresAt is { } expiresAt && expiresAt <= DateTimeOffset.UtcNow;
        return profile.Status == GitHubIntegrationStatus.Invalid || isPastExpiry
            ? IntegrationStatus.EXPIRED
            : IntegrationStatus.ACTIVE;
    }
}
