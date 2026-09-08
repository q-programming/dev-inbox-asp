using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Sync;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;
using DomainSyncStatus = DevInbox.Web.Features.Inbox.Domain.SyncStatus;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;

namespace DevInbox.Web.Tests.Features.Sync;

/// <summary>
/// Unit tests for <see cref="SyncService"/>. <see cref="IGitHubService"/>/<see cref="IAdoService"/> are
/// resolved from a real <see cref="IServiceScopeFactory"/> (backed by a real <see cref="ServiceCollection"/>)
/// because <see cref="SyncService"/> deliberately creates its own DI scope per sync task — a plain
/// NSubstitute mock of <see cref="IServiceScopeFactory"/> would not exercise that scoping behavior.
/// <see cref="IInboxService"/> is mocked directly since it's called on the ambient scope.
/// </summary>
public class SyncServiceTests
{
    private const long UserId = 1;
    private const string Email = "john@doe.com";

    private readonly IInboxService _inboxService = Substitute.For<IInboxService>();
    private readonly IGitHubService _gitHubService = Substitute.For<IGitHubService>();
    private readonly IAdoService _adoService = Substitute.For<IAdoService>();

    private SyncService CreateService()
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => _gitHubService);
        services.AddScoped(_ => _adoService);
        var provider = services.BuildServiceProvider();

        return new SyncService(_inboxService, provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<SyncService>.Instance);
    }

    private static InboxEntity BuildInbox(DateTimeOffset? lastSyncCompletedAt) => new()
    {
        UserId = UserId,
        Version = 0,
        SyncStatus = DomainSyncStatus.Idle,
        LastSyncCompletedAt = lastSyncCompletedAt
    };

    private static InboxItem BuildItem(DomainItemSource source) => new()
    {
        InboxId = UserId,
        Source = source,
        Type = source == DomainItemSource.GitHub ? DomainItemType.PR : DomainItemType.WorkItem,
        Title = $"{source} item",
        State = new InboxItemState()
    };

    private static InboxItemChange BuildChange(DomainItemSource source, ItemChangeKind kind = ItemChangeKind.Created) =>
        new(BuildItem(source), kind);

    [Fact(DisplayName = "SynchronizeIntegrations should return the concatenation of items returned by GitHub and ADO sync")]
    public async Task SynchronizeIntegrationsShouldReturnItemsFromBothIntegrationsAsync()
    {
        var inbox = BuildInbox(DateTimeOffset.UtcNow.AddMinutes(-15));
        _inboxService.GetUserInboxAsync(UserId).Returns(inbox);
        var gitHubChange = BuildChange(DomainItemSource.GitHub);
        var adoChange = BuildChange(DomainItemSource.Ado);
        _gitHubService.SyncUserPRAsync(UserId, inbox.LastSyncCompletedAt, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([gitHubChange]);
        _adoService.SyncWorkItemsAsync(UserId, inbox.LastSyncCompletedAt, false, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([adoChange]);
        var service = CreateService();

        var result = await service.SynchronizeIntegrations(UserId, Email, TriggerType.Background);

        Assert.Equal([gitHubChange, adoChange], result);
    }

    [Fact(DisplayName = "SynchronizeIntegrations should return an empty list when neither integration found anything new or changed")]
    public async Task SynchronizeIntegrationsShouldReturnEmptyListWhenNothingChangedAsync()
    {
        var inbox = BuildInbox(DateTimeOffset.UtcNow.AddMinutes(-15));
        _inboxService.GetUserInboxAsync(UserId).Returns(inbox);
        _gitHubService.SyncUserPRAsync(UserId, inbox.LastSyncCompletedAt, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([]);
        _adoService.SyncWorkItemsAsync(UserId, inbox.LastSyncCompletedAt, false, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([]);
        var service = CreateService();

        var result = await service.SynchronizeIntegrations(UserId, Email, TriggerType.Manual);

        Assert.Empty(result);
    }

    [Fact(DisplayName = "SynchronizeIntegrations should pass null since when forcing a full sync")]
    public async Task SynchronizeIntegrationsShouldPassNullSinceWhenForcingFullSyncAsync()
    {
        var inbox = BuildInbox(DateTimeOffset.UtcNow.AddDays(-1));
        _inboxService.GetUserInboxAsync(UserId).Returns(inbox);
        _gitHubService.SyncUserPRAsync(UserId, null, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([]);
        _adoService.SyncWorkItemsAsync(UserId, null, true, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([]);
        var service = CreateService();

        await service.SynchronizeIntegrations(UserId, Email, TriggerType.Manual, forceFullSync: true);

        await _gitHubService.Received(1).SyncUserPRAsync(UserId, null, Arg.Any<CancellationToken>());
        await _adoService.Received(1).SyncWorkItemsAsync(UserId, null, true, Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "SynchronizeIntegrations should mark the inbox as Failed and return an empty list when a sync task throws")]
    public async Task SynchronizeIntegrationsShouldMarkFailedAndReturnEmptyWhenSyncTaskThrowsAsync()
    {
        var inbox = BuildInbox(DateTimeOffset.UtcNow.AddMinutes(-15));
        _inboxService.GetUserInboxAsync(UserId).Returns(inbox);
        _gitHubService.SyncUserPRAsync(UserId, inbox.LastSyncCompletedAt, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>(_ => throw new InvalidOperationException("boom"));
        _adoService.SyncWorkItemsAsync(UserId, inbox.LastSyncCompletedAt, false, Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<InboxItemChange>>([]);
        var service = CreateService();

        var result = await service.SynchronizeIntegrations(UserId, Email, TriggerType.Background);

        Assert.Equal(DomainSyncStatus.Failed, inbox.SyncStatus);
        Assert.Empty(result);
    }
}

