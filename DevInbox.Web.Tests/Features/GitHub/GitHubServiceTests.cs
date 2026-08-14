using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using GraphQL.Client.Http;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using DomainInboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Tests.Features.GitHub;

public class GitHubServiceTests
{
    private readonly IGitHubProfileRepository _profileRepository;
    private readonly IInboxItemRepository _inboxItemRepository;
    private readonly IGitHubClient _gitHubClient;
    private readonly GitHubService _service;

    public GitHubServiceTests()
    {
        _profileRepository = Substitute.For<IGitHubProfileRepository>();
        _inboxItemRepository = Substitute.For<IInboxItemRepository>();
        _gitHubClient = Substitute.For<IGitHubClient>();
        _service = new GitHubService(
            _profileRepository,
            _inboxItemRepository,
            _gitHubClient,
            Substitute.For<ILogger<GitHubService>>());
    }

    // -------------------------------------------------------------------------
    // GetDetailsAsync
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "GetDetailsAsync should return detail from IGitHubClient on happy path")]
    public async Task GetDetailsAsyncShouldReturnDetailAsync()
    {
        var item = BuildInboxItem(repository: "octocat/hello-world", externalId: "42", inboxId: 1);
        var profile = BuildProfile(userId: 1, accessToken: "token-abc");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var detail = new GitHubPullRequestDetail { PullRequestNumber = 42 };
        _gitHubClient.GetPullRequestDetailAsync("token-abc", "octocat", "hello-world", 42, ct: Arg.Any<CancellationToken>())
            .Returns(detail);

        var result = await _service.GetDetailsAsync(item);

        Assert.Same(detail, result);
    }

    [Fact(DisplayName = "GetDetailsAsync should throw when item has no Repository")]
    public async Task GetDetailsAsyncShouldThrowWhenRepositoryMissingAsync()
    {
        var item = BuildInboxItem(repository: null, externalId: "42", inboxId: 1);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDetailsAsync(item));
    }

    [Fact(DisplayName = "GetDetailsAsync should throw when item has no ExternalId")]
    public async Task GetDetailsAsyncShouldThrowWhenExternalIdMissingAsync()
    {
        var item = BuildInboxItem(repository: "octocat/hello-world", externalId: null, inboxId: 1);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDetailsAsync(item));
    }

    [Fact(DisplayName = "GetDetailsAsync should throw when ExternalId is not numeric")]
    public async Task GetDetailsAsyncShouldThrowWhenExternalIdNotNumericAsync()
    {
        var item = BuildInboxItem(repository: "octocat/hello-world", externalId: "not-a-number", inboxId: 1);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDetailsAsync(item));
    }

    [Fact(DisplayName = "GetDetailsAsync should throw when no GitHubProfile is found for the user")]
    public async Task GetDetailsAsyncShouldThrowWhenProfileMissingAsync()
    {
        var item = BuildInboxItem(repository: "octocat/hello-world", externalId: "42", inboxId: 1);
        _profileRepository.GetByUserIdAsync(1).Returns((GitHubProfile?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDetailsAsync(item));
    }

    [Fact(DisplayName = "GetDetailsAsync should throw when profile has no AccessToken")]
    public async Task GetDetailsAsyncShouldThrowWhenAccessTokenMissingAsync()
    {
        var item = BuildInboxItem(repository: "octocat/hello-world", externalId: "42", inboxId: 1);
        var profile = BuildProfile(userId: 1, accessToken: null);
        _profileRepository.GetByUserIdAsync(1).Returns(profile);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDetailsAsync(item));
    }

    // -------------------------------------------------------------------------
    // SyncUserPRAsync — initial vs incremental sync
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "SyncUserPRAsync should log and return early when no profile exists for the user")]
    public async Task SyncUserPRAsyncShouldReturnEarlyWhenNoProfileAsync()
    {
        _profileRepository.GetByUserIdAsync(99).Returns((GitHubProfile?)null);

        await _service.SyncUserPRAsync(99);

        await _gitHubClient.DidNotReceive().GetPullRequestsInvolvingUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "SyncUserPRAsync should throw when profile has no AccessToken")]
    public async Task SyncUserPRAsyncShouldThrowWhenAccessTokenMissingAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: null);
        _profileRepository.GetByUserIdAsync(1).Returns(profile);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.SyncUserPRAsync(1));
    }

    [Fact(DisplayName = "SyncUserPRAsync should mark integration invalid when GraphQL search returns 401 Unauthorized")]
    public async Task SyncUserPRAsyncShouldMarkInvalidOnGraphQlUnauthorizedAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        _gitHubClient.GetPullRequestsInvolvingUserAsync(
                "token-abc", Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new GraphQLHttpRequestException(System.Net.HttpStatusCode.Unauthorized, null!, "Bad credentials"));

        await _service.SyncUserPRAsync(1, updatedSince: null);

        Assert.Equal(GitHubIntegrationStatus.Invalid, profile.Status);
        await _profileRepository.Received(1).UpdateAsync(profile);
    }

    [Fact(DisplayName = "SyncUserPRAsync should request open PRs only when updatedSince is null (initial sync)")]
    public async Task SyncUserPRAsyncShouldRequestOpenOnlyOnInitialSyncAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        _gitHubClient.GetPullRequestsInvolvingUserAsync(
                "token-abc", Arg.Is<string>(q => q.Contains("is:open") && q.Contains("involves:octocat")), Arg.Any<CancellationToken>())
            .Returns(new List<GitHubPullRequestDTO>());

        await _service.SyncUserPRAsync(1, updatedSince: null);

        await _gitHubClient.Received(1).GetPullRequestsInvolvingUserAsync(
            "token-abc", Arg.Is<string>(q => q.Contains("is:open") && q.Contains("involves:octocat")), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "SyncUserPRAsync should pass an updated:>= query on incremental sync")]
    public async Task SyncUserPRAsyncShouldPassUpdatedSinceOnIncrementalSyncAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var updatedSince = DateTimeOffset.UtcNow.AddDays(-3);
        _gitHubClient.GetPullRequestsInvolvingUserAsync(
                "token-abc", Arg.Is<string>(q => q.Contains("updated:>=") && q.Contains("involves:octocat")), Arg.Any<CancellationToken>())
            .Returns(new List<GitHubPullRequestDTO>());

        await _service.SyncUserPRAsync(1, updatedSince);

        await _gitHubClient.Received(1).GetPullRequestsInvolvingUserAsync(
            "token-abc", Arg.Is<string>(q => q.Contains("updated:>=") && q.Contains("involves:octocat")), Arg.Any<CancellationToken>());
    }

    // -------------------------------------------------------------------------
    // SyncUserPRAsync — upsert: new PR creation & InferReason priority
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "SyncUserPRAsync should create a new not-done InboxItem for a PR not seen before")]
    public async Task SyncUserPRAsyncShouldCreateNewUnreadItemAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 42, repo: "octocat/hello-world", authorLogin: "someone-else", state: "OPEN");
        SetupSearch(profile, [pr]);
        _inboxItemRepository.GetExistingItemsAsync(1, DomainItemSource.GitHub, DomainItemType.PR, Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem>());

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        await _inboxItemRepository.Received(1).AddRangeAsync(Arg.Is<IEnumerable<InboxItem>>(items =>
            items.Count() == 1 &&
            !items.First().State.IsDone &&
            items.First().Repository == "octocat/hello-world" &&
            items.First().ExternalId == "42"));
        await _inboxItemRepository.Received(1).SaveChangesAsync();
    }

    [Fact(DisplayName = "SyncUserPRAsync should create a new done+closed InboxItem for an already closed/merged PR not seen before")]
    public async Task SyncUserPRAsyncShouldCreateNewDoneItemForClosedPrAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 42, repo: "octocat/hello-world", authorLogin: "someone-else", state: "CLOSED");
        SetupSearch(profile, [pr]);
        _inboxItemRepository.GetExistingItemsAsync(1, DomainItemSource.GitHub, DomainItemType.PR, Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem>());

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        await _inboxItemRepository.Received(1).AddRangeAsync(Arg.Is<IEnumerable<InboxItem>>(items =>
            items.Count() == 1 &&
            items.First().State.IsDone &&
            items.First().State.IsClosed));
        await _inboxItemRepository.Received(1).SaveChangesAsync();
    }

    [Fact(DisplayName = "SyncUserPRAsync should infer Authored reason when PR author matches the login")]
    public async Task SyncUserPRAsyncShouldInferAuthoredReasonAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "octocat", state: "OPEN");
        pr.RequestedReviewers = ["octocat"]; // authored takes priority even if also requested reviewer
        SetupSearch(profile, [pr]);
        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem>());

        InboxItem? captured = null;
        await _inboxItemRepository.AddRangeAsync(Arg.Do<IEnumerable<InboxItem>>(items => captured = items.First()));

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        Assert.NotNull(captured);
        Assert.Equal(DomainInboxReason.Authored, captured!.Reason);
    }

    [Fact(DisplayName = "SyncUserPRAsync should infer ReviewRequested reason when login is a requested reviewer but not the author")]
    public async Task SyncUserPRAsyncShouldInferReviewRequestedReasonAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "someone-else", state: "OPEN");
        pr.RequestedReviewers = ["octocat"];
        SetupSearch(profile, [pr]);
        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem>());

        InboxItem? captured = null;
        await _inboxItemRepository.AddRangeAsync(Arg.Do<IEnumerable<InboxItem>>(items => captured = items.First()));

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        Assert.NotNull(captured);
        Assert.Equal(DomainInboxReason.ReviewRequested, captured!.Reason);
    }

    [Fact(DisplayName = "SyncUserPRAsync should infer Mentioned reason when neither author nor requested reviewer matches")]
    public async Task SyncUserPRAsyncShouldInferMentionedReasonAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "someone-else", state: "OPEN");
        SetupSearch(profile, [pr]);
        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem>());

        InboxItem? captured = null;
        await _inboxItemRepository.AddRangeAsync(Arg.Do<IEnumerable<InboxItem>>(items => captured = items.First()));

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        Assert.NotNull(captured);
        Assert.Equal(DomainInboxReason.Mentioned, captured!.Reason);
    }

    // -------------------------------------------------------------------------
    // SyncUserPRAsync — updating existing items
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "SyncUserPRAsync should not update an existing item when nothing changed")]
    public async Task SyncUserPRAsyncShouldNotUpdateUnchangedItemAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var updatedAt = DateTimeOffset.UtcNow;
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "octocat", state: "OPEN");
        pr.CommentsCount = 3;
        pr.UpdatedAt = updatedAt;
        SetupSearch(profile, [pr]);

        var existing = BuildInboxItem(repository: "r/r", externalId: "1", inboxId: 1);
        existing.CommentCount = 3;
        existing.ActivityAt = updatedAt;
        existing.State.IsDone = true;
        existing.State.IsClosed = false;

        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem> { existing });

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        await _inboxItemRepository.DidNotReceive().SaveChangesAsync();
        Assert.True(existing.State.IsDone);
    }

    [Fact(DisplayName = "SyncUserPRAsync should update existing item and clear done flag when comment count changed but PR still open")]
    public async Task SyncUserPRAsyncShouldMarkUnreadOnActivityChangeWhileOpenAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "octocat", state: "OPEN");
        pr.CommentsCount = 5;
        SetupSearch(profile, [pr]);

        var existing = BuildInboxItem(repository: "r/r", externalId: "1", inboxId: 1);
        existing.CommentCount = 2;
        existing.ActivityAt = pr.UpdatedAt;
        existing.State.IsDone = true;
        existing.State.IsClosed = false;

        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem> { existing });

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        Assert.False(existing.State.IsDone);
        Assert.Equal(5, existing.CommentCount);
        await _inboxItemRepository.Received(1).SaveChangesAsync();
    }

    [Fact(DisplayName = "SyncUserPRAsync should update existing item and mark it done+closed when the PR just closed")]
    public async Task SyncUserPRAsyncShouldMarkDoneWhenJustClosedAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "octocat", state: "CLOSED");
        SetupSearch(profile, [pr]);

        var existing = BuildInboxItem(repository: "r/r", externalId: "1", inboxId: 1);
        existing.CommentCount = pr.CommentsCount;
        existing.ActivityAt = pr.UpdatedAt.AddMinutes(-1); // activity changed too, but closing should still mark done
        existing.State.IsDone = false;
        existing.State.IsClosed = false;

        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem> { existing });

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        Assert.True(existing.State.IsDone);
        Assert.True(existing.State.IsClosed);
        await _inboxItemRepository.Received(1).SaveChangesAsync();
    }

    [Fact(DisplayName = "SyncUserPRAsync should update existing item and clear done/closed flags when the PR was reopened")]
    public async Task SyncUserPRAsyncShouldMarkUnreadWhenReopenedAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        var pr = BuildPr(number: 1, repo: "r/r", authorLogin: "octocat", state: "OPEN");
        SetupSearch(profile, [pr]);

        var existing = BuildInboxItem(repository: "r/r", externalId: "1", inboxId: 1);
        existing.CommentCount = pr.CommentsCount;
        existing.ActivityAt = pr.UpdatedAt;
        existing.State.IsDone = true;
        existing.State.IsClosed = true; // was previously closed/merged

        _inboxItemRepository.GetExistingItemsAsync(Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>())
            .Returns(new List<InboxItem> { existing });

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        Assert.False(existing.State.IsDone);
        Assert.False(existing.State.IsClosed);
        await _inboxItemRepository.Received(1).SaveChangesAsync();
    }

    [Fact(DisplayName = "SyncUserPRAsync should do nothing when there are no pull requests returned")]
    public async Task SyncUserPRAsyncShouldDoNothingWhenNoResultsAsync()
    {
        var profile = BuildProfile(userId: 1, accessToken: "token-abc", login: "octocat");
        _profileRepository.GetByUserIdAsync(1).Returns(profile);
        SetupSearch(profile, []);

        await _service.SyncUserPRAsync(1, DateTimeOffset.UtcNow);

        await _inboxItemRepository.DidNotReceive().GetExistingItemsAsync(
            Arg.Any<long>(), Arg.Any<DomainItemSource>(), Arg.Any<DomainItemType>(), Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<IReadOnlyCollection<string>>());
        await _inboxItemRepository.DidNotReceive().SaveChangesAsync();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void SetupSearch(GitHubProfile profile, List<GitHubPullRequestDTO> results) =>
        _gitHubClient.GetPullRequestsInvolvingUserAsync(
                profile.AccessToken!, Arg.Any<string>(), Arg.Any<CancellationToken>())
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

    private static GitHubProfile BuildProfile(long userId, string? accessToken, string login = "octocat") => new()
    {
        Id = userId,
        UserId = userId,
        GitHubUserId = 1000 + userId,
        GitHubLogin = login,
        AccessToken = accessToken
    };

    private static InboxItem BuildInboxItem(string? repository, string? externalId, long inboxId)
    {
        var now = DateTimeOffset.UtcNow;
        return new InboxItem
        {
            Id = 7,
            InboxId = inboxId,
            Source = DomainItemSource.GitHub,
            Type = DomainItemType.PR,
            Reason = DomainInboxReason.Authored,
            ExternalId = externalId,
            Repository = repository,
            Title = "Fix bug",
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = new InboxItemState { UpdatedAt = now }
        };
    }
}
