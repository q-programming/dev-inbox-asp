using DomainIntegrationStatus = DevInbox.Web.Features.Sync.Domain.IntegrationStatus;
using DevInbox.Web.Common;
using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.ADO;

public class AdoIntegrationServiceTests
{
    private const long UserId = 42;
    private const string Pat = "ado_pat_123";
    private const string Organization = "contoso";

    private readonly IAdoProfileRepository _profileRepository;
    private readonly IAdoClient _adoClient;
    private readonly AdoIntegrationService _service;

    public AdoIntegrationServiceTests()
    {
        _profileRepository = Substitute.For<IAdoProfileRepository>();
        _adoClient = Substitute.For<IAdoClient>();
        _service = new AdoIntegrationService(_profileRepository, _adoClient, Substitute.For<ILogger<AdoIntegrationService>>());
    }

    [Fact(DisplayName = "ConnectPatAsync should validate the PAT against the organization, persist a new profile, and return an active ADO integration")]
    public async Task ConnectPatAsyncShouldPersistNewProfileAsync()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(30);
        _adoClient.GetConnectionDataAsync(Pat, Organization, Arg.Any<CancellationToken>()).Returns(BuildConnectionDataDto());
        _profileRepository.GetByUserIdAndOrganizationAsync(UserId, Organization).Returns((AdoProfile?)null);

        var result = await _service.ConnectPatAsync(UserId, Organization, Pat, expiresAt);

        await _adoClient.Received(1).GetConnectionDataAsync(Pat, Organization, Arg.Any<CancellationToken>());
        await _profileRepository.Received(1).AddAsync(Arg.Is<AdoProfile>(p =>
            p.UserId == UserId &&
            p.Organization == Organization &&
            p.AdoUserId == "ado-user-1" &&
            p.AdoLogin == "Jane Doe" &&
            p.AvatarUrl == null &&
            p.AccessToken == Pat &&
            p.AuthMethod == DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat &&
            p.TokenExpiresAt == expiresAt &&
            p.Status == DomainIntegrationStatus.Active));
        await _profileRepository.DidNotReceive().UpdateAsync(Arg.Any<AdoProfile>());

        Assert.Equal(IntegrationType.Ado, result.Type);
        Assert.Equal(Organization, result.Organization);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.ACTIVE, result.Status);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationAuthMethod.Pat, result.AuthMethod);
    }

    [Fact(DisplayName = "ConnectPatAsync should update an existing profile for that organization instead of adding a new one")]
    public async Task ConnectPatAsyncShouldUpdateExistingProfileAsync()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(10);
        var existingProfile = new AdoProfile
        {
            Id = 7,
            UserId = UserId,
            Organization = Organization,
            AdoUserId = "old-id",
            AdoLogin = "Old Name",
            AccessToken = "old-token",
            Status = DomainIntegrationStatus.Invalid
        };
        _adoClient.GetConnectionDataAsync(Pat, Organization, Arg.Any<CancellationToken>()).Returns(BuildConnectionDataDto());
        _profileRepository.GetByUserIdAndOrganizationAsync(UserId, Organization).Returns(existingProfile);

        var result = await _service.ConnectPatAsync(UserId, Organization, Pat, expiresAt);

        await _profileRepository.DidNotReceive().AddAsync(Arg.Any<AdoProfile>());
        await _profileRepository.Received(1).UpdateAsync(Arg.Is<AdoProfile>(p =>
            ReferenceEquals(p, existingProfile) &&
            p.AdoUserId == "ado-user-1" &&
            p.AdoLogin == "Jane Doe" &&
            p.AccessToken == Pat &&
            p.AuthMethod == DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat &&
            p.TokenExpiresAt == expiresAt &&
            p.Status == DomainIntegrationStatus.Active));
        Assert.Equal(IntegrationType.Ado, result.Type);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.ACTIVE, result.Status);
    }

    [Fact(DisplayName = "ConnectPatAsync should reject a missing organization")]
    public async Task ConnectPatAsyncShouldRejectMissingOrganizationAsync()
    {
        await Assert.ThrowsAsync<BadRequestException>(() => _service.ConnectPatAsync(UserId, "  ", Pat, null));

        await _adoClient.DidNotReceive().GetConnectionDataAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "ConnectPatAsync should reject a past expiry date before calling ADO")]
    public async Task ConnectPatAsyncShouldRejectPastExpiryAsync()
    {
        var pastExpiry = DateTimeOffset.UtcNow.AddMinutes(-1);

        await Assert.ThrowsAsync<BadRequestException>(() => _service.ConnectPatAsync(UserId, Organization, Pat, pastExpiry));

        await _adoClient.DidNotReceive().GetConnectionDataAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _profileRepository.DidNotReceive().AddAsync(Arg.Any<AdoProfile>());
        await _profileRepository.DidNotReceive().UpdateAsync(Arg.Any<AdoProfile>());
    }

    [Fact(DisplayName = "ConnectPatAsync should convert an ADO validation failure into BadRequestException and persist nothing")]
    public async Task ConnectPatAsyncShouldWrapHttpRequestExceptionAsync()
    {
        _adoClient.GetConnectionDataAsync(Pat, Organization, Arg.Any<CancellationToken>())
            .Returns<Task<AdoConnectionDataDTO>>(_ => throw new HttpRequestException("401"));

        await Assert.ThrowsAsync<BadRequestException>(() => _service.ConnectPatAsync(UserId, Organization, Pat, DateTimeOffset.UtcNow.AddDays(1)));

        await _profileRepository.DidNotReceive().GetByUserIdAndOrganizationAsync(Arg.Any<long>(), Arg.Any<string>());
        await _profileRepository.DidNotReceive().AddAsync(Arg.Any<AdoProfile>());
        await _profileRepository.DidNotReceive().UpdateAsync(Arg.Any<AdoProfile>());
    }

    [Fact(DisplayName = "DisconnectAsync should delegate to DeleteByUserIdAndOrganizationAsync")]
    public async Task DisconnectAsyncShouldDelegateToRepositoryAsync()
    {
        await _service.DisconnectAsync(UserId, Organization);

        await _profileRepository.Received(1).DeleteByUserIdAndOrganizationAsync(UserId, Organization);
    }

    private static AdoConnectionDataDTO BuildConnectionDataDto() => new()
    {
        AuthenticatedUser = new AdoAuthenticatedUserDTO
        {
            Id = "ado-user-1",
            ProviderDisplayName = "Jane Doe",
            Properties = new AdoAuthenticatedUserPropertiesDTO
            {
                Account = new AdoConnectionDataAccountDTO { Value = "jane@example.com" }
            }
        }
    };
}
