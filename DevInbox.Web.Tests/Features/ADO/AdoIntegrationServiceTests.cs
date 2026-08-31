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

    private readonly IAdoProfileRepository _profileRepository;
    private readonly IAdoClient _adoClient;
    private readonly AdoIntegrationService _service;

    public AdoIntegrationServiceTests()
    {
        _profileRepository = Substitute.For<IAdoProfileRepository>();
        _adoClient = Substitute.For<IAdoClient>();
        _service = new AdoIntegrationService(_profileRepository, _adoClient, Substitute.For<ILogger<AdoIntegrationService>>());
    }

    [Fact(DisplayName = "ConnectPatAsync should validate the PAT, persist a new profile, and return an active ADO integration")]
    public async Task ConnectPatAsyncShouldPersistNewProfileAsync()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(30);
        _adoClient.GetCurrentUserProfileAsync(Pat, Arg.Any<CancellationToken>()).Returns(BuildProfileDto());
        _profileRepository.GetByUserIdAsync(UserId).Returns((AdoProfile?)null);

        var result = await _service.ConnectPatAsync(UserId, Pat, expiresAt);

        await _adoClient.Received(1).GetCurrentUserProfileAsync(Pat, Arg.Any<CancellationToken>());
        await _profileRepository.Received(1).AddAsync(Arg.Is<AdoProfile>(p =>
            p.UserId == UserId &&
            p.AdoUserId == "ado-user-1" &&
            p.AdoLogin == "Jane Doe" &&
            p.AvatarUrl == "https://example.com/avatar.png" &&
            p.AccessToken == Pat &&
            p.AuthMethod == DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat &&
            p.TokenExpiresAt == expiresAt &&
            p.Status == DomainIntegrationStatus.Active));
        await _profileRepository.DidNotReceive().UpdateAsync(Arg.Any<AdoProfile>());

        Assert.Equal(IntegrationType.Ado, result.Type);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.ACTIVE, result.Status);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationAuthMethod.Pat, result.AuthMethod);
    }

    [Fact(DisplayName = "ConnectPatAsync should update an existing profile instead of adding a new one")]
    public async Task ConnectPatAsyncShouldUpdateExistingProfileAsync()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(10);
        var existingProfile = new AdoProfile
        {
            Id = 7,
            UserId = UserId,
            AdoUserId = "old-id",
            AdoLogin = "Old Name",
            AccessToken = "old-token",
            Status = DomainIntegrationStatus.Invalid
        };
        _adoClient.GetCurrentUserProfileAsync(Pat, Arg.Any<CancellationToken>()).Returns(BuildProfileDto());
        _profileRepository.GetByUserIdAsync(UserId).Returns(existingProfile);

        var result = await _service.ConnectPatAsync(UserId, Pat, expiresAt);

        await _profileRepository.DidNotReceive().AddAsync(Arg.Any<AdoProfile>());
        await _profileRepository.Received(1).UpdateAsync(Arg.Is<AdoProfile>(p =>
            ReferenceEquals(p, existingProfile) &&
            p.AdoUserId == "ado-user-1" &&
            p.AdoLogin == "Jane Doe" &&
            p.AvatarUrl == "https://example.com/avatar.png" &&
            p.AccessToken == Pat &&
            p.AuthMethod == DevInbox.Web.Features.Sync.Domain.IntegrationAuthMethod.Pat &&
            p.TokenExpiresAt == expiresAt &&
            p.Status == DomainIntegrationStatus.Active));
        Assert.Equal(IntegrationType.Ado, result.Type);
        Assert.Equal(DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.ACTIVE, result.Status);
    }

    [Fact(DisplayName = "ConnectPatAsync should reject a past expiry date before calling ADO")]
    public async Task ConnectPatAsyncShouldRejectPastExpiryAsync()
    {
        var pastExpiry = DateTimeOffset.UtcNow.AddMinutes(-1);

        await Assert.ThrowsAsync<BadRequestException>(() => _service.ConnectPatAsync(UserId, Pat, pastExpiry));

        await _adoClient.DidNotReceive().GetCurrentUserProfileAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _profileRepository.DidNotReceive().AddAsync(Arg.Any<AdoProfile>());
        await _profileRepository.DidNotReceive().UpdateAsync(Arg.Any<AdoProfile>());
    }

    [Fact(DisplayName = "ConnectPatAsync should convert an ADO validation failure into BadRequestException and persist nothing")]
    public async Task ConnectPatAsyncShouldWrapHttpRequestExceptionAsync()
    {
        _adoClient.GetCurrentUserProfileAsync(Pat, Arg.Any<CancellationToken>())
            .Returns<Task<AdoUserProfileDTO>>(_ => throw new HttpRequestException("401"));

        await Assert.ThrowsAsync<BadRequestException>(() => _service.ConnectPatAsync(UserId, Pat, DateTimeOffset.UtcNow.AddDays(1)));

        await _profileRepository.DidNotReceive().GetByUserIdAsync(Arg.Any<long>());
        await _profileRepository.DidNotReceive().AddAsync(Arg.Any<AdoProfile>());
        await _profileRepository.DidNotReceive().UpdateAsync(Arg.Any<AdoProfile>());
    }

    [Fact(DisplayName = "DisconnectAsync should delegate to DeleteByUserIdAsync")]
    public async Task DisconnectAsyncShouldDelegateToRepositoryAsync()
    {
        await _service.DisconnectAsync(UserId);

        await _profileRepository.Received(1).DeleteByUserIdAsync(UserId);
    }

    private static AdoUserProfileDTO BuildProfileDto() => new()
    {
        Id = "ado-user-1",
        DisplayName = "Jane Doe",
        EmailAddress = "jane@example.com",
        Avatar = new AdoAvatarDTO
        {
            Value = "https://example.com/avatar.png",
            Size = "medium"
        },
        Descriptor = "aad.123"
    };
}
