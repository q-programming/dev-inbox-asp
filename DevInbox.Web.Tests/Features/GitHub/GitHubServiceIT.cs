using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using DomainInboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;

namespace DevInbox.Web.Tests.Features.GitHub;

/// <summary>
/// Integration tests for <see cref="GitHubService.SyncUserPRAsync"/> against a real PostgreSQL
/// container, exercising <see cref="GitHubProfileRepository"/>/<see cref="InboxItemRepository"/> and
/// the actual upsert SQL end-to-end (not covered by the mocked-repository unit tests in
/// <see cref="GitHubServiceTests"/>). <see cref="IGitHubClient"/> is mocked — this test must never
/// reach the real GitHub API.
/// </summary>
public class GitHubServiceIT : DatabaseIntegrationTest
{
    private User _user = default!;
    private GitHubProfile _profile = default!;
    private readonly IGitHubClient _gitHubClient = Substitute.For<IGitHubClient>();
    private GitHubService _service = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        _user = new User { FirstName = "Jan", LastName = "Kowalski", Email = "jan@example.com", Password = "hashed" };
        await DataBase.Users.AddAsync(_user);
        await DataBase.SaveChangesAsync();

        var userInbox = InboxEntity.CreateDefault();
        userInbox.UserId = _user.Id;
        await DataBase.Inboxes.AddAsync(userInbox);
        await DataBase.SaveChangesAsync();

        _profile = new GitHubProfile
        {
            UserId = _user.Id,
            GitHubUserId = 1000,
            GitHubLogin = "octocat",
            AccessToken = "token-abc"
        };
        await DataBase.GitHubProfiles.AddAsync(_profile);
        await DataBase.SaveChangesAsync();

        _service = new GitHubService(
            new GitHubProfileRepository(DataBase),
            new InboxItemRepository(DataBase),
            _gitHubClient,
            NullLogger<GitHubService>.Instance);
    }

    public override async Task DisposeAsync()
    {
        await DataBase.InboxItemStates.ExecuteDeleteAsync();
        await DataBase.InboxItems.ExecuteDeleteAsync();
        await DataBase.GitHubProfiles.ExecuteDeleteAsync();
        await DataBase.Inboxes.ExecuteDeleteAsync();
        await DataBase.Users.ExecuteDeleteAsync();
        await base.DisposeAsync();
    }

    [Fact(DisplayName = "SyncUserPRAsync should persist a brand-new not-done InboxItem for a PR not seen before")]
    public async Task SyncUserPRAsyncShouldPersistNewInboxItemAsync()
    {
        var pr = BuildPr(number: 7, repo: "octocat/hello-world", authorLogin: "octocat", state: "OPEN");
        SetupSearch([pr]);

        await _service.SyncUserPRAsync(_user.Id, DateTimeOffset.UtcNow);

        var persisted = await DataBase.InboxItems
            .AsNoTracking()
            .Include(i => i.State)
            .SingleAsync(i => i.InboxId == _user.Id);

        Assert.Equal("octocat/hello-world", persisted.Repository);
        Assert.Equal("7", persisted.ExternalId);
        Assert.Equal(DomainItemSource.GitHub, persisted.Source);
        Assert.Equal(DomainItemType.PR, persisted.Type);
        Assert.Equal(DomainInboxReason.Authored, persisted.Reason);
        Assert.False(persisted.State.IsDone);
        Assert.False(persisted.State.IsClosed);
    }

    [Fact(DisplayName = "SyncUserPRAsync should update an already-tracked PR's activity and clear its done flag")]
    public async Task SyncUserPRAsyncShouldUpdateExistingInboxItemAsync()
    {
        var existing = new InboxItem
        {
            InboxId = _user.Id,
            Source = DomainItemSource.GitHub,
            Type = DomainItemType.PR,
            Reason = DomainInboxReason.Authored,
            ExternalId = "7",
            Repository = "octocat/hello-world",
            Title = "Old title",
            CommentCount = 1,
            ActivityAt = DateTimeOffset.UtcNow.AddDays(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            State = new InboxItemState { IsDone = true, IsClosed = false, UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1) }
        };
        await DataBase.InboxItems.AddAsync(existing);
        await DataBase.SaveChangesAsync();

        var pr = BuildPr(number: 7, repo: "octocat/hello-world", authorLogin: "octocat", state: "OPEN");
        pr.Title = "New activity on the PR";
        pr.CommentsCount = 4;
        SetupSearch([pr]);

        await _service.SyncUserPRAsync(_user.Id, DateTimeOffset.UtcNow);

        var persisted = await DataBase.InboxItems
            .AsNoTracking()
            .Include(i => i.State)
            .SingleAsync(i => i.Id == existing.Id);

        Assert.Equal("New activity on the PR", persisted.Title);
        Assert.Equal(4, persisted.CommentCount);
        Assert.False(persisted.State.IsDone);
    }

    [Fact(DisplayName = "SyncUserPRAsync should mark a tracked PR closed and done when it just closed")]
    public async Task SyncUserPRAsyncShouldMarkClosedWithoutUnreadAsync()
    {
        var updatedAt = DateTimeOffset.UtcNow.AddHours(-1);
        var existing = new InboxItem
        {
            InboxId = _user.Id,
            Source = DomainItemSource.GitHub,
            Type = DomainItemType.PR,
            Reason = DomainInboxReason.Authored,
            ExternalId = "7",
            Repository = "octocat/hello-world",
            Title = "Fix bug",
            CommentCount = 2,
            ActivityAt = updatedAt,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
            UpdatedAt = updatedAt,
            State = new InboxItemState { IsDone = false, IsClosed = false, UpdatedAt = updatedAt }
        };
        await DataBase.InboxItems.AddAsync(existing);
        await DataBase.SaveChangesAsync();

        var pr = BuildPr(number: 7, repo: "octocat/hello-world", authorLogin: "octocat", state: "CLOSED");
        pr.CommentsCount = 2;
        pr.UpdatedAt = updatedAt;
        SetupSearch([pr]);

        await _service.SyncUserPRAsync(_user.Id, DateTimeOffset.UtcNow);

        var persisted = await DataBase.InboxItems
            .AsNoTracking()
            .Include(i => i.State)
            .SingleAsync(i => i.Id == existing.Id);

        Assert.True(persisted.State.IsClosed);
        Assert.True(persisted.State.IsDone);
    }

    [Fact(DisplayName = "SyncUserPRAsync should leave the inbox untouched when GitHub returns no pull requests")]
    public async Task SyncUserPRAsyncShouldPersistNothingWhenNoResultsAsync()
    {
        SetupSearch([]);

        await _service.SyncUserPRAsync(_user.Id, DateTimeOffset.UtcNow);

        var count = await DataBase.InboxItems.AsNoTracking().LongCountAsync(i => i.InboxId == _user.Id);
        Assert.Equal(0, count);
    }

    [Fact(DisplayName = "SyncUserPRAsync should throw when the stored GitHub profile has no access token")]
    public async Task SyncUserPRAsyncShouldThrowWhenAccessTokenMissingAsync()
    {
        _profile.AccessToken = null;
        DataBase.GitHubProfiles.Update(_profile);
        await DataBase.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.SyncUserPRAsync(_user.Id, DateTimeOffset.UtcNow));

        await _gitHubClient.DidNotReceive().GetPullRequestsInvolvingUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    private void SetupSearch(List<GitHubPullRequestDTO> results) =>
        _gitHubClient.GetPullRequestsInvolvingUserAsync(
                _profile.AccessToken!, Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(results);

    private static GitHubPullRequestDTO BuildPr(int number, string repo, string authorLogin, string state) => new()
    {
        NodeId = $"node-{number}",
        Number = number,
        Title = "Fix bug",
        Url = $"https://github.com/{repo}/pull/{number}",
        State = state,
        RepositoryFullName = repo,
        Author = new GitHubActorDTO { Login = authorLogin },
        CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
        UpdatedAt = DateTimeOffset.UtcNow,
        CommentsCount = 1
    };
}
