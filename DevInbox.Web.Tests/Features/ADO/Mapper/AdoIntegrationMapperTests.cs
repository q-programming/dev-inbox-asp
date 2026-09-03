using DomainIntegrationStatus = DevInbox.Web.Features.Sync.Domain.IntegrationStatus;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Tests.Features.ADO.Mapper;

public class AdoIntegrationMapperTests
{
    private readonly AdoIntegrationMapper _mapper = new();

    [Fact(DisplayName = "ToIntegrationDto should return ACTIVE when the profile is valid and not expired")]
    public void ToIntegrationDtoShouldReturnActiveForHealthyProfile()
    {
        var result = _mapper.ToIntegrationDto(BuildProfile(status: DomainIntegrationStatus.Active, expiresAt: DateTimeOffset.UtcNow.AddDays(7)));

        Assert.Equal(IntegrationType.Ado, result.Type);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.ACTIVE, result.Status);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationAuthMethod.Pat, result.AuthMethod);
    }

    [Fact(DisplayName = "ToIntegrationDto should return EXPIRED when the profile status is invalid")]
    public void ToIntegrationDtoShouldReturnExpiredForInvalidProfile()
    {
        var result = _mapper.ToIntegrationDto(BuildProfile(status: DomainIntegrationStatus.Invalid, expiresAt: DateTimeOffset.UtcNow.AddDays(7)));

        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.EXPIRED, result.Status);
    }

    [Fact(DisplayName = "ToIntegrationDto should return EXPIRED when the PAT expiry is in the past")]
    public void ToIntegrationDtoShouldReturnExpiredForPastExpiry()
    {
        var result = _mapper.ToIntegrationDto(BuildProfile(status: DomainIntegrationStatus.Active, expiresAt: DateTimeOffset.UtcNow.AddMinutes(-1)));

        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.EXPIRED, result.Status);
    }

    [Fact(DisplayName = "ToIntegrationDto should return EXPIRED when both the status is invalid and the PAT is expired")]
    public void ToIntegrationDtoShouldReturnExpiredForInvalidAndExpiredProfile()
    {
        var result = _mapper.ToIntegrationDto(BuildProfile(status: DomainIntegrationStatus.Invalid, expiresAt: DateTimeOffset.UtcNow.AddMinutes(-1)));

        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.EXPIRED, result.Status);
    }

    private static AdoProfile BuildProfile(DomainIntegrationStatus status, DateTimeOffset? expiresAt) => new()
    {
        Id = 17,
        AdoUserId = "ado-user-1",
        AdoLogin = "Jane Doe",
        AccessToken = "token",
        AuthMethod = DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat,
        Status = status,
        TokenExpiresAt = expiresAt
    };
}
