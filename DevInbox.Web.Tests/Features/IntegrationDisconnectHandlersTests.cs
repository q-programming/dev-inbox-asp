using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Events;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.GitHub.Events;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Inbox.Events;
using DevInbox.Web.Infrastructure.Events;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace DevInbox.Web.Tests.Features;

/// <summary>
/// The three handlers all react to <see cref="IntegrationDisconnectRequestEvent"/>; each must only act on
/// the part of the event that concerns its own feature.
/// </summary>
public class IntegrationDisconnectHandlersTests
{
    private const long UserId = 42;
    private const string Organization = "contoso";
    private const string DbDown = "db down";
    private static readonly CancellationToken Token = CancellationToken.None;

    private static readonly IntegrationDisconnectRequestEvent AdoDisconnect = new(UserId, ItemSource.Ado, Organization);

    private readonly IAdoProfileRepository _adoProfiles = Substitute.For<IAdoProfileRepository>();
    private readonly IGitHubProfileRepository _gitHubProfiles = Substitute.For<IGitHubProfileRepository>();
    private readonly IInboxService _inboxService = Substitute.For<IInboxService>();

    private IntegrationDisconnectAdoHandler AdoHandler => new(_adoProfiles, NullLogger<IntegrationDisconnectAdoHandler>.Instance);
    private IntegrationDisconnectGitHubHandler GitHubHandler => new(_gitHubProfiles, NullLogger<IntegrationDisconnectGitHubHandler>.Instance);
    private IntegrationDisconnectInboxHandler InboxHandler => new(_inboxService, NullLogger<IntegrationDisconnectInboxHandler>.Instance);

    [Fact(DisplayName = "Ado handler should delete only the profile of the requested organization")]
    public async Task AdoHandlerShouldDeleteRequestedOrganizationProfileAsync()
    {
        await AdoHandler.Handle(AdoDisconnect, Token);

        await _adoProfiles.Received(1).DeleteByUserIdAndOrganizationAsync(UserId, Organization);
    }

    [Theory(DisplayName = "Ado handler should ignore events that are not a concrete ADO organization disconnect")]
    [InlineData(ItemSource.GitHub, Organization)]
    [InlineData(ItemSource.Ado, null)]
    [InlineData(ItemSource.Ado, "")]
    public async Task AdoHandlerShouldIgnoreOtherEventsAsync(ItemSource source, string? organization)
    {
        await AdoHandler.Handle(new IntegrationDisconnectRequestEvent(UserId, source, organization), Token);

        await _adoProfiles.DidNotReceiveWithAnyArgs().DeleteByUserIdAndOrganizationAsync(default, default!);
    }

    [Fact(DisplayName = "GitHub handler should delete the GitHub profile of the user")]
    public async Task GitHubHandlerShouldDeleteProfileAsync()
    {
        await GitHubHandler.Handle(new IntegrationDisconnectRequestEvent(UserId, ItemSource.GitHub), Token);

        await _gitHubProfiles.Received(1).DeleteByUserIdAsync(UserId);
    }

    [Fact(DisplayName = "GitHub handler should ignore ADO disconnect events")]
    public async Task GitHubHandlerShouldIgnoreAdoEventsAsync()
    {
        await GitHubHandler.Handle(AdoDisconnect, Token);

        await _gitHubProfiles.DidNotReceiveWithAnyArgs().DeleteByUserIdAsync(default);
    }

    [Fact(DisplayName = "Inbox handler should delete inbox items of the given source and organization")]
    public async Task InboxHandlerShouldDeleteItemsBySourceAsync()
    {
        await InboxHandler.Handle(AdoDisconnect, Token);

        await _inboxService.Received(1).DeleteInboxItemsBySourceAsync(UserId, ItemSource.Ado, Organization);
    }

    [Fact(DisplayName = "Inbox handler should delete all GitHub items when no organization is given")]
    public async Task InboxHandlerShouldDeleteAllItemsOfGitHubAsync()
    {
        await InboxHandler.Handle(new IntegrationDisconnectRequestEvent(UserId, ItemSource.GitHub), Token);

        await _inboxService.Received(1).DeleteInboxItemsBySourceAsync(UserId, ItemSource.GitHub, null);
    }

    [Fact(DisplayName = "Handlers should propagate repository failures so the surrounding transaction rolls back")]
    public async Task HandlersShouldPropagateFailuresAsync()
    {
        _adoProfiles.DeleteByUserIdAndOrganizationAsync(UserId, Organization)
            .Returns(Task.FromException(new InvalidOperationException(DbDown)));
        _gitHubProfiles.DeleteByUserIdAsync(UserId).Returns(Task.FromException(new InvalidOperationException(DbDown)));
        _inboxService.DeleteInboxItemsBySourceAsync(UserId, ItemSource.Ado, Organization)
            .Returns(Task.FromException(new InvalidOperationException(DbDown)));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            AdoHandler.Handle(AdoDisconnect, Token));
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            GitHubHandler.Handle(new IntegrationDisconnectRequestEvent(UserId, ItemSource.GitHub), Token));
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            InboxHandler.Handle(AdoDisconnect, Token));
    }
}
