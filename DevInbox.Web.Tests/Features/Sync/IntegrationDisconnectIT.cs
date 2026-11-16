using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.ADO.Events;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.GitHub.Events;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Inbox.Events;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.FeatureManagement;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;

namespace DevInbox.Web.Tests.Features.Sync;

/// <summary>
/// Disconnecting an integration against a real PostgreSQL container: the real disconnect handlers run
/// the way the endpoints trigger them, and the profile row plus every inbox item synced from that
/// integration must be gone — while other integrations, organizations and users stay untouched.
/// </summary>
public class IntegrationDisconnectIT : DatabaseIntegrationTest
{
    private const string Contoso = "contoso";

    private User _user = default!;
    private User _otherUser = default!;
    private IEventHandler<IntegrationDisconnectRequestEvent>[] _handlers = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        _user = await SeedAccountAsync("jan-disconnect@example.com");
        _otherUser = await SeedAccountAsync("anna-disconnect@example.com");

        var inboxService = new InboxService(
            new InboxRepository(DataBase),
            new InboxItemRepository(DataBase, Substitute.For<IFeatureManager>()),
            Substitute.For<IInboxDetailService>(),
            Substitute.For<IHttpContextAccessor>());
        _handlers =
        [
            new IntegrationDisconnectAdoHandler(new AdoProfileRepository(DataBase), NullLogger<IntegrationDisconnectAdoHandler>.Instance),
            new IntegrationDisconnectGitHubHandler(new GitHubProfileRepository(DataBase), NullLogger<IntegrationDisconnectGitHubHandler>.Instance),
            new IntegrationDisconnectInboxHandler(inboxService, NullLogger<IntegrationDisconnectInboxHandler>.Instance)
        ];
    }

    public override async Task DisposeAsync()
    {
        await DataBase.Notes.ExecuteDeleteAsync();
        await DataBase.InboxItemStates.ExecuteDeleteAsync();
        await DataBase.InboxItems.ExecuteDeleteAsync();
        await DataBase.Inboxes.ExecuteDeleteAsync();
        await DataBase.Users.ExecuteDeleteAsync();
        await base.DisposeAsync();
    }

    [Fact(DisplayName = "Disconnecting GitHub should remove the GitHub profile and every GitHub inbox item of that user")]
    public async Task DisconnectGitHubShouldRemoveProfileAndItemsAsync()
    {
        await DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.GitHub));

        Assert.False(await DataBase.GitHubProfiles.AsNoTracking().AnyAsync(p => p.UserId == _user.Id));
        Assert.Equal(0, await CountItemsAsync(_user, ItemSource.GitHub));
        Assert.False(await DataBase.InboxItemStates.AsNoTracking()
            .AnyAsync(s => s.InboxItem.InboxId == _user.Id && s.InboxItem.Source == ItemSource.GitHub));
    }

    [Fact(DisplayName = "Disconnecting GitHub should keep ADO data, standalone notes and other users' data")]
    public async Task DisconnectGitHubShouldKeepEverythingElseAsync()
    {
        await DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.GitHub));

        Assert.Equal(2, await DataBase.AdoProfiles.AsNoTracking().CountAsync(p => p.UserId == _user.Id));
        Assert.Equal(3, await CountItemsAsync(_user, ItemSource.Ado));
        // The note attached to a deleted GitHub PR goes with it; only the standalone note is left.
        var note = await DataBase.Notes.AsNoTracking().SingleAsync(n => n.InboxItem.InboxId == _user.Id);
        Assert.Null(note.AttachedToInboxItemId);
        await AssertUntouchedAsync(_otherUser);
    }

    [Fact(DisplayName = "Disconnecting an ADO organization should remove only that organization's profile and inbox items")]
    public async Task DisconnectAdoShouldRemoveOnlyThatOrganizationAsync()
    {
        await DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.Ado, Contoso));

        var organizations = await DataBase.AdoProfiles.AsNoTracking()
            .Where(p => p.UserId == _user.Id).Select(p => p.Organization).ToListAsync();
        Assert.Equal(["fabrikam"], organizations);
        var repositories = await DataBase.InboxItems.AsNoTracking()
            .Where(i => i.InboxId == _user.Id && i.Source == ItemSource.Ado).Select(i => i.Repository).ToListAsync();
        // "contoso-labs" merely starts with the same letters — it is a different organization.
        Assert.Equal(["contoso-labs/project", "fabrikam/project"], repositories.Order());
    }

    [Fact(DisplayName = "Disconnecting an ADO organization should keep GitHub data and other users' same-named organization")]
    public async Task DisconnectAdoShouldKeepEverythingElseAsync()
    {
        await DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.Ado, Contoso));

        Assert.True(await DataBase.GitHubProfiles.AsNoTracking().AnyAsync(p => p.UserId == _user.Id));
        Assert.Equal(2, await CountItemsAsync(_user, ItemSource.GitHub));
        await AssertUntouchedAsync(_otherUser);
    }

    [Fact(DisplayName = "Disconnecting an organization the user never connected should change nothing")]
    public async Task DisconnectUnknownAdoOrganizationShouldBeNoOpAsync()
    {
        await DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.Ado, "unknown"));

        await AssertUntouchedAsync(_user);
    }

    [Fact(DisplayName = "Disconnecting GitHub twice should be a harmless no-op the second time")]
    public async Task DisconnectGitHubTwiceShouldBeIdempotentAsync()
    {
        await DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.GitHub));

        var exception = await Record.ExceptionAsync(() =>
            DisconnectAsync(new IntegrationDisconnectRequestEvent(_user.Id, ItemSource.GitHub)));

        Assert.Null(exception);
        Assert.Equal(3, await CountItemsAsync(_user, ItemSource.Ado));
    }

    private async Task DisconnectAsync(IntegrationDisconnectRequestEvent message)
    {
        foreach (var handler in _handlers)
        {
            await handler.Handle(message, CancellationToken.None);
        }
    }

    private Task<int> CountItemsAsync(User user, ItemSource source) =>
        DataBase.InboxItems.AsNoTracking().CountAsync(i => i.InboxId == user.Id && i.Source == source);

    private async Task AssertUntouchedAsync(User user)
    {
        Assert.True(await DataBase.GitHubProfiles.AsNoTracking().AnyAsync(p => p.UserId == user.Id));
        Assert.Equal(2, await DataBase.AdoProfiles.AsNoTracking().CountAsync(p => p.UserId == user.Id));
        Assert.Equal(2, await CountItemsAsync(user, ItemSource.GitHub));
        Assert.Equal(3, await CountItemsAsync(user, ItemSource.Ado));
    }

    /// <summary>GitHub profile with 2 PRs (one with an attached note), ADO orgs contoso and fabrikam with 3 work items, a standalone note.</summary>
    private async Task<User> SeedAccountAsync(string email)
    {
        var user = new User { FirstName = "Test", LastName = "User", Email = email, Password = "hashed" };
        DataBase.Users.Add(user);
        await DataBase.SaveChangesAsync();

        var inbox = InboxEntity.CreateDefault();
        inbox.UserId = user.Id;
        DataBase.Inboxes.Add(inbox);
        DataBase.GitHubProfiles.Add(new GitHubProfile
        {
            UserId = user.Id, GitHubUserId = Random.Shared.NextInt64(1, long.MaxValue), GitHubLogin = $"gh-{user.Id}",
            AccessToken = "gh-token", AuthMethod = IntegrationAuthMethod.Pat
        });
        DataBase.AdoProfiles.AddRange(
            AdoProfileFor(user, Contoso), AdoProfileFor(user, "fabrikam"));
        await DataBase.SaveChangesAsync();

        var attachedTo = await AddItemAsync(user.Id, ItemSource.GitHub, ItemType.PR, "octo/repo");
        await AddItemAsync(user.Id, ItemSource.GitHub, ItemType.PR, "octo/other");
        await AddItemAsync(user.Id, ItemSource.Ado, ItemType.WorkItem, "contoso/project");
        await AddItemAsync(user.Id, ItemSource.Ado, ItemType.WorkItem, "contoso-labs/project");
        await AddItemAsync(user.Id, ItemSource.Ado, ItemType.WorkItem, "fabrikam/project");
        await AddNoteAsync(user.Id, attachedTo.Id);
        await AddNoteAsync(user.Id, null);
        DataBase.ChangeTracker.Clear();
        return user;
    }

    private static AdoProfile AdoProfileFor(User user, string organization) => new()
    {
        UserId = user.Id, Organization = organization, AdoUserId = Guid.NewGuid().ToString(),
        AdoLogin = "ado-login", AccessToken = "ado-token"
    };

    private async Task<InboxItem> AddItemAsync(long inboxId, ItemSource source, ItemType type, string repository)
    {
        var item = NewItem(inboxId, source, type, InboxReason.Authored, "Item");
        item.Repository = repository;
        item.ExternalId = Guid.NewGuid().ToString("N")[..8];
        DataBase.InboxItems.Add(item);
        await DataBase.SaveChangesAsync();
        return item;
    }

    private async Task AddNoteAsync(long inboxId, long? attachedToInboxItemId)
    {
        var envelope = NewItem(inboxId, ItemSource.Note, ItemType.Note, InboxReason.Note, "Note");
        DataBase.InboxItems.Add(envelope);
        await DataBase.SaveChangesAsync();
        DataBase.Notes.Add(new Note
        {
            InboxItemId = envelope.Id, InboxItem = envelope, AttachedToInboxItemId = attachedToInboxItemId,
            Title = "Note", Body = "Body", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        });
        await DataBase.SaveChangesAsync();
    }

    private static InboxItem NewItem(long inboxId, ItemSource source, ItemType type, InboxReason reason, string title) => new()
    {
        InboxId = inboxId, Source = source, Type = type, Reason = reason, Title = title,
        ActivityAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
        State = new InboxItemState { UpdatedAt = DateTimeOffset.UtcNow }
    };
}
