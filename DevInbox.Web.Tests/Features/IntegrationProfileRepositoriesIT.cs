using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DevInbox.Web.Tests.Features;

/// <summary>Integration tests for the profile repository methods used by the integration-disconnect handlers.</summary>
public class IntegrationProfileRepositoriesIT : DatabaseIntegrationTest
{
    private const string Contoso = "contoso";

    private User _user = default!;
    private User _otherUser = default!;
    private AdoProfileRepository _adoRepository = default!;
    private GitHubProfileRepository _gitHubRepository = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        _user = new User { Email = "jan@example.com", Password = "x" };
        _otherUser = new User { Email = "anna@example.com", Password = "x" };
        DataBase.Users.AddRange(_user, _otherUser);
        await DataBase.SaveChangesAsync();

        DataBase.AdoProfiles.AddRange(
            AdoProfileFor(_user, Contoso), AdoProfileFor(_user, "fabrikam"), AdoProfileFor(_otherUser, Contoso));
        DataBase.GitHubProfiles.AddRange(GitHubProfileFor(_user, 1), GitHubProfileFor(_otherUser, 2));
        await DataBase.SaveChangesAsync();

        _adoRepository = new AdoProfileRepository(DataBase);
        _gitHubRepository = new GitHubProfileRepository(DataBase);
        DataBase.ChangeTracker.Clear();
    }

    [Fact(DisplayName = "DeleteByUserIdAndOrganizationAsync should delete only the matching organization of that user")]
    public async Task DeleteByUserIdAndOrganizationAsyncShouldDeleteOnlyMatchingProfileAsync()
    {
        await _adoRepository.DeleteByUserIdAndOrganizationAsync(_user.Id, Contoso);

        var remaining = await DataBase.AdoProfiles.AsNoTracking()
            .Select(p => new { p.UserId, p.Organization }).ToListAsync();
        Assert.DoesNotContain(remaining, p => p.UserId == _user.Id && p.Organization == Contoso);
        Assert.Contains(remaining, p => p.UserId == _user.Id && p.Organization == "fabrikam");
        Assert.Contains(remaining, p => p.UserId == _otherUser.Id && p.Organization == Contoso);
    }

    [Fact(DisplayName = "DeleteByUserIdAndOrganizationAsync should silently do nothing for an unknown organization")]
    public async Task DeleteByUserIdAndOrganizationAsyncShouldIgnoreUnknownOrganizationAsync()
    {
        var exception = await Record.ExceptionAsync(() => _adoRepository.DeleteByUserIdAndOrganizationAsync(_user.Id, "unknown"));

        Assert.Null(exception);
        Assert.Equal(3, await DataBase.AdoProfiles.AsNoTracking().CountAsync());
    }

    [Fact(DisplayName = "DeleteByUserIdAsync should delete the GitHub profile of that user only")]
    public async Task DeleteByUserIdAsyncShouldDeleteOnlyOwnProfileAsync()
    {
        await _gitHubRepository.DeleteByUserIdAsync(_user.Id);

        var remaining = await DataBase.GitHubProfiles.AsNoTracking().ToListAsync();
        Assert.Equal(_otherUser.Id, Assert.Single(remaining).UserId);
    }

    [Fact(DisplayName = "DeleteByUserIdAsync should silently do nothing when the user has no GitHub profile")]
    public async Task DeleteByUserIdAsyncShouldIgnoreMissingProfileAsync()
    {
        await _gitHubRepository.DeleteByUserIdAsync(_user.Id);

        var exception = await Record.ExceptionAsync(() => _gitHubRepository.DeleteByUserIdAsync(_user.Id));

        Assert.Null(exception);
        Assert.Single(await DataBase.GitHubProfiles.AsNoTracking().ToListAsync());
    }

    private static AdoProfile AdoProfileFor(User user, string organization) => new()
    {
        UserId = user.Id, Organization = organization, AdoUserId = Guid.NewGuid().ToString(), AdoLogin = "login"
    };

    private static GitHubProfile GitHubProfileFor(User user, long gitHubUserId) => new()
    {
        UserId = user.Id, GitHubUserId = gitHubUserId, GitHubLogin = $"gh-{gitHubUserId}", AuthMethod = IntegrationAuthMethod.Pat
    };
}
