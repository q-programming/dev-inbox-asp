using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.ADO.Mapper;

/// <summary>
/// Maps an <see cref="AdoProfile"/> to the wire-level <see cref="IntegrationDto"/>. Only <c>Id</c>
/// is a direct 1:1 copy — <c>Type</c> is a constant (this mapper only ever produces ADO
/// integrations) and <c>Status</c> is derived from <see cref="AdoProfile.Status"/> combined with
/// <see cref="AdoProfile.TokenExpiresAt"/>, so both are filled in by hand in <see cref="ToIntegrationDto"/>.
/// </summary>
[Mapper]
public partial class AdoIntegrationMapper
{
    public IntegrationDto ToIntegrationDto(AdoProfile profile)
    {
        var dto = MapCore(profile);
        dto.Type = IntegrationType.Ado;
        dto.Status = ResolveStatus(profile);
        return dto;
    }

    [MapperIgnoreTarget(nameof(IntegrationDto.Type))]
    [MapperIgnoreTarget(nameof(IntegrationDto.Status))]
    [MapperIgnoreSource(nameof(AdoProfile.AccessToken))]
    [MapperIgnoreSource(nameof(AdoProfile.UserId))]
    [MapperIgnoreSource(nameof(AdoProfile.User))]
    [MapperIgnoreSource(nameof(AdoProfile.AvatarUrl))]
    [MapperIgnoreSource(nameof(AdoProfile.AdoLogin))]
    [MapperIgnoreSource(nameof(AdoProfile.AdoUserId))]
    [MapperIgnoreSource(nameof(AdoProfile.ProjectsJson))]
    [MapperIgnoreSource(nameof(AdoProfile.ProjectsSyncedAt))]
    private partial IntegrationDto MapCore(AdoProfile profile);

    /// <summary>
    /// A PAT with a past <see cref="AdoProfile.TokenExpiresAt"/> is treated as expired even if
    /// Azure DevOps hasn't rejected a request with it yet — no need to wait for a failed sync to
    /// tell the user their token needs replacing.
    /// </summary>
    private static IntegrationStatus ResolveStatus(AdoProfile profile)
    {
        var isPastExpiry = profile.TokenExpiresAt is { } expiresAt && expiresAt <= DateTimeOffset.UtcNow;
        return profile.Status == Sync.Domain.IntegrationStatus.Invalid || isPastExpiry
            ? IntegrationStatus.EXPIRED
            : IntegrationStatus.ACTIVE;
    }
}
