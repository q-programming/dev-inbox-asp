using DomainIntegrationStatus = DevInbox.Web.Features.Sync.Domain.IntegrationStatus;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.GitHub.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Tests.Features.GitHub.Mapper;

public class GitHubIntegrationMapperTests
{
    private readonly GitHubIntegrationMapper _mapper = new();

    [Theory(DisplayName = "ToIntegrationDto should return INVALID for a rejected token, but EXPIRED when the PAT is also past its expiry")]
    [InlineData(7, IntegrationStatus.INVALID)]
    [InlineData(-1, IntegrationStatus.EXPIRED)]
    public void ToIntegrationDtoShouldDistinguishInvalidFromExpired(int expiresInDays, IntegrationStatus expected)
    {
        var profile = new GitHubProfile
        {
            GitHubLogin = "octocat",
            AccessToken = "token",
            Status = DomainIntegrationStatus.Invalid,
            TokenExpiresAt = DateTimeOffset.UtcNow.AddDays(expiresInDays)
        };

        Assert.Equal(expected, _mapper.ToIntegrationDto(profile).Status);
    }
}
