using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;
using DomainInboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Tests.Features.GitHub;

public class GitHubInboxDetailProviderTests
{
    private readonly IGitHubService _gitHubService;
    private readonly GitHubInboxDetailProvider _provider;

    public GitHubInboxDetailProviderTests()
    {
        _gitHubService = Substitute.For<IGitHubService>();
        _provider = new GitHubInboxDetailProvider(_gitHubService);
    }

    [Fact(DisplayName = "Source should be GitHub")]
    public void SourceShouldBeGitHub()
    {
        Assert.Equal(DomainItemSource.GitHub, _provider.Source);
    }

    [Fact(DisplayName = "PopulateAsync should set dto.Github from IGitHubService.GetDetailsAsync result")]
    public async Task PopulateAsyncShouldSetDtoGithubAsync()
    {
        var item = BuildInboxItem();
        var dto = new InboxItemDetail { Id = item.Id, Title = item.Title };
        var detail = new GitHubPullRequestDetail { PullRequestNumber = 42, Repository = "octocat/hello-world", Title = "Fix bug" };
        _gitHubService.GetDetailsAsync(item, Arg.Any<CancellationToken>()).Returns(detail);

        await _provider.PopulateAsync(item, dto);

        Assert.NotNull(dto.Github);
        Assert.Same(detail, dto.Github);
    }

    [Fact(DisplayName = "PopulateAsync should propagate CancellationToken to IGitHubService")]
    public async Task PopulateAsyncShouldPropagateCancellationTokenAsync()
    {
        var item = BuildInboxItem();
        var dto = new InboxItemDetail { Id = item.Id, Title = item.Title };
        using var cts = new CancellationTokenSource();
        _gitHubService.GetDetailsAsync(item, cts.Token).Returns(new GitHubPullRequestDetail());

        await _provider.PopulateAsync(item, dto, cts.Token);

        await _gitHubService.Received(1).GetDetailsAsync(item, cts.Token);
    }

    private static InboxItem BuildInboxItem()
    {
        var now = DateTimeOffset.UtcNow;
        return new InboxItem
        {
            Id = 7,
            InboxId = 1,
            Source = DomainItemSource.GitHub,
            Type = DomainItemType.PR,
            Reason = DomainInboxReason.Authored,
            ExternalId = "42",
            Repository = "octocat/hello-world",
            Title = "Fix bug",
            ActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now,
            State = new InboxItemState { UpdatedAt = now }
        };
    }
}
