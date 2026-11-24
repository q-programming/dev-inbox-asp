using System.Security.Claims;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Config;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Features.Identity.OAuth;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.Persistence;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;
using UnauthorizedException = DevInbox.Web.Common.UnauthorizedException;

namespace DevInbox.Web.Tests.Features.Identity;

/// <summary>
/// End-to-end account deletion against a real PostgreSQL container: the real <see cref="UserController"/>,
/// <see cref="UserService"/>, <see cref="EventPublisher"/>, repositories, handlers and
/// <see cref="TransactionRunner"/> wired together the way Program.cs wires them (one DI scope per request).
/// Also pins the FK cascade the deletion relies on.
/// </summary>
public class AccountDeletionIT : DatabaseIntegrationTest
{
    private User _user = default!;
    private User _otherUser = default!;
    private readonly List<ServiceProvider> _providers = [];

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        _user = await SeedAccountAsync("jan@example.com", "contoso", "fabrikam");
        _otherUser = await SeedAccountAsync("anna@example.com", "contoso");
    }

    [Fact(DisplayName = "DeleteAccountAsync should remove the user and everything they own, leaving other users untouched")]
    public async Task DeleteAccountAsyncShouldRemoveAllUserDataAsync()
    {
        await DeleteAccountAsync(_user.Id);

        await AssertNoDataForAsync(_user);
        await AssertAccountIntactAsync(_otherUser, adoProfiles: 1);
    }

    [Fact(DisplayName = "DeleteAccountAsync should record a UserRemoved audit entry that outlives the user")]
    public async Task DeleteAccountAsyncShouldKeepAuditEntryAsync()
    {
        await DeleteAccountAsync(_user.Id);

        var entries = await DataBase.AuditEntries.AsNoTracking()
            .Where(a => a.Username == _user.Email && a.EventType == AuditEventType.UserRemoved).ToListAsync();
        var entry = Assert.Single(entries);
        Assert.Equal(AuditEventType.UserRemoved, entry.EventType);
    }

    [Fact(DisplayName = "DeleteAccountAsync should delete a user who has no integrations, inbox items or settings")]
    public async Task DeleteAccountAsyncShouldDeleteBareUserAsync()
    {
        var bare = new User { Email = "bare@example.com", Password = "hashed" };
        DataBase.Users.Add(bare);
        await DataBase.SaveChangesAsync();

        await DeleteAccountAsync(bare.Id);

        Assert.False(await DataBase.Users.AsNoTracking().AnyAsync(u => u.Id == bare.Id));
    }

    [Fact(DisplayName = "DeleteAccountAsync should fail with Unauthorized when the account was already deleted")]
    public async Task DeleteAccountAsyncShouldFailForAlreadyDeletedUserAsync()
    {
        await DeleteAccountAsync(_user.Id);

        await Assert.ThrowsAsync<UnauthorizedException>(() => DeleteAccountAsync(_user.Id));
        Assert.Single(await DataBase.AuditEntries.AsNoTracking()
            .Where(a => a.EventType == AuditEventType.UserRemoved).ToListAsync());
    }

    [Fact(DisplayName = "DeleteAccountAsync should roll back everything when a UserRemoved handler fails")]
    public async Task DeleteAccountAsyncShouldRollBackWhenUserRemovedHandlerFailsAsync()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DeleteAccountAsync(_user.Id, services => services.AddScoped<IEventHandler<UserRemovedEvent>, ExplodingUserRemovedHandler>()));

        await AssertAccountIntactAsync(_user, adoProfiles: 2);
        await AssertAccountIntactAsync(_otherUser, adoProfiles: 1);
        // The success audit entry was written inside the transaction, so it must be rolled back too.
        Assert.DoesNotContain(await DataBase.AuditEntries.AsNoTracking().ToListAsync(),
            a => a.EventType == AuditEventType.UserRemoved);
        // The failure audit is published fire-and-forget, so wait for it to land.
        await WaitForAuditEntryAsync(AuditEventType.UserRemovalFailed);
    }

    [Fact(DisplayName = "DeleteAccountAsync should record a UserRemovalFailed audit entry without leaking the exception message")]
    public async Task DeleteAccountAsyncShouldAuditFailureAsync()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DeleteAccountAsync(_user.Id, services => services.AddScoped<IEventHandler<UserRemovedEvent>, ExplodingUserRemovedHandler>()));

        // Published fire-and-forget on its own DI scope, so wait for it to land.
        var failure = await WaitForAuditEntryAsync(AuditEventType.UserRemovalFailed);

        Assert.Equal(_user.Email, failure.Username);
        Assert.Contains(nameof(InvalidOperationException), failure.Details);
        Assert.DoesNotContain(ExplodingUserRemovedHandler.SecretMessage, failure.Details);
    }

    [Fact(DisplayName = "Deleting a user row should cascade to every dependent table without explicit cleanup")]
    public async Task DeletingUserShouldCascadeToDependentTablesAsync()
    {
        await DataBase.Users.Where(u => u.Id == _user.Id).ExecuteDeleteAsync();

        await AssertNoDataForAsync(_user);
        await AssertAccountIntactAsync(_otherUser, adoProfiles: 1);
    }

    [Fact(DisplayName = "Deleting an inbox item should cascade to its state and to notes that live in it")]
    public async Task DeletingInboxItemShouldCascadeToStateAndNoteAsync()
    {
        var noteEnvelopeIds = await DataBase.Notes.AsNoTracking()
            .Where(n => n.InboxItem.InboxId == _user.Id).Select(n => n.InboxItemId).ToListAsync();

        await DataBase.InboxItems.Where(i => noteEnvelopeIds.Contains(i.Id)).ExecuteDeleteAsync();

        Assert.Empty(await DataBase.Notes.AsNoTracking().Where(n => noteEnvelopeIds.Contains(n.InboxItemId)).ToListAsync());
        Assert.Empty(await DataBase.InboxItemStates.AsNoTracking().Where(s => noteEnvelopeIds.Contains(s.InboxItemId)).ToListAsync());
    }

    [Fact(DisplayName = "Deleting the item a note is attached to should detach the note instead of deleting it")]
    public async Task DeletingAttachedTargetShouldDetachNoteAsync()
    {
        var attachedNote = await DataBase.Notes.AsNoTracking()
            .SingleAsync(n => n.InboxItem.InboxId == _user.Id && n.AttachedToInboxItemId != null);

        await DataBase.InboxItems.Where(i => i.Id == attachedNote.AttachedToInboxItemId).ExecuteDeleteAsync();

        var reloaded = await DataBase.Notes.AsNoTracking().SingleAsync(n => n.Id == attachedNote.Id);
        Assert.Null(reloaded.AttachedToInboxItemId);
    }

    /// <summary>Runs one "request": a fresh DI scope with its own DbContext, exactly like the HTTP pipeline.</summary>
    private async Task DeleteAccountAsync(long userId, Action<IServiceCollection>? configure = null)
    {
        // The root provider outlives the request (as in production) so fire-and-forget handlers can still resolve scopes.
        var provider = BuildProvider(userId, configure);
        _providers.Add(provider);
        using var scope = provider.CreateScope();
        await scope.ServiceProvider.GetRequiredService<UserController>().DeleteAccountAsync();
    }

    public override async Task DisposeAsync()
    {
        foreach (var provider in _providers)
        {
            await provider.DisposeAsync();
        }

        await base.DisposeAsync();
    }

    private ServiceProvider BuildProvider(long currentUserId, Action<IServiceCollection>? configure)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, currentUserId.ToString())], "TestAuth");
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(accessor);
        services.AddScoped(_ => BuildDbContext());
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAdoProfileRepository, AdoProfileRepository>();
        services.AddScoped<IGitHubProfileRepository, GitHubProfileRepository>();
        services.AddScoped<IInboxRepository, InboxRepository>();
        services.AddScoped<IInboxItemRepository, InboxItemRepository>();
        services.AddScoped<IAuditRepository, AuditRepository>();
        services.AddScoped<IAuditEntryFactory, AuditEntryFactory>();
        services.AddScoped<IInboxService, InboxService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ITransactionRunner, TransactionRunner>();
        services.AddScoped<IPublisher, EventPublisher>();
        services.AddScoped<UserController>();
        services.AddSingleton(Substitute.For<IFeatureManager>());
        services.AddSingleton(Substitute.For<IInboxDetailService>());
        services.AddSingleton(Substitute.For<IGitHubIntegrationService>());
        services.AddSingleton(Substitute.For<IGitHubOAuthService>());
        services.AddSingleton(Substitute.For<IJwtTokenService>());
        services.AddSingleton(Options.Create(new IdentityOptions()));
        services.AddScoped(typeof(IEventHandler<>), typeof(AuditEventHandler<>));
        // PublishAsync resolves handlers by their concrete type (Program.cs registers them .AsSelf() too).
        services.AddScoped(typeof(AuditEventHandler<>));
        configure?.Invoke(services);
        return services.BuildServiceProvider();
    }

    private async Task<User> SeedAccountAsync(string email, params string[] adoOrganizations)
    {
        var user = new User { Email = email, FirstName = "Test", LastName = "User", Password = "hashed" };
        DataBase.Users.Add(user);
        await DataBase.SaveChangesAsync();

        var inbox = InboxEntity.CreateDefault();
        inbox.UserId = user.Id;
        DataBase.Inboxes.Add(inbox);
        DataBase.UserSettings.Add(new UserSettings
        {
            User = user, UserId = user.Id, Theme = Theme.Dark, Density = Density.Tight, FontSize = 14, SyncIntervalMinutes = 15
        });
        DataBase.GitHubProfiles.Add(new GitHubProfile
        {
            UserId = user.Id, GitHubUserId = Random.Shared.NextInt64(1, long.MaxValue), GitHubLogin = $"gh-{user.Id}",
            AccessToken = "gh-token", AuthMethod = IntegrationAuthMethod.Pat
        });
        foreach (var organization in adoOrganizations)
        {
            DataBase.AdoProfiles.Add(new AdoProfile
            {
                UserId = user.Id, Organization = organization, AdoUserId = Guid.NewGuid().ToString(),
                AdoLogin = "ado-login", AccessToken = "ado-token"
            });
        }

        await DataBase.SaveChangesAsync();

        var githubPr = await AddItemAsync(user.Id, ItemSource.GitHub, ItemType.PR, "octo/repo");
        await AddItemAsync(user.Id, ItemSource.Ado, ItemType.WorkItem, $"{adoOrganizations.FirstOrDefault() ?? "contoso"}/project");
        await AddNoteAsync(user.Id, attachedToInboxItemId: githubPr.Id);
        await AddNoteAsync(user.Id, attachedToInboxItemId: null);
        DataBase.AuditEntries.Add(new AuditEntry
        {
            EventType = AuditEventType.UserAuthenticated, Username = email, CreatedAt = DateTimeOffset.UtcNow
        });
        await DataBase.SaveChangesAsync();
        return user;
    }

    private async Task<InboxItem> AddItemAsync(long inboxId, ItemSource source, ItemType type, string repository)
    {
        var item = new InboxItem
        {
            InboxId = inboxId, Source = source, Type = type, Reason = InboxReason.Authored, Scope = repository,
            ExternalId = Guid.NewGuid().ToString("N")[..8], Title = "Item",
            ActivityAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState { UpdatedAt = DateTimeOffset.UtcNow }
        };
        DataBase.InboxItems.Add(item);
        await DataBase.SaveChangesAsync();
        return item;
    }

    private async Task AddNoteAsync(long inboxId, long? attachedToInboxItemId)
    {
        var envelope = new InboxItem
        {
            InboxId = inboxId, Source = ItemSource.Note, Type = ItemType.Note, Reason = InboxReason.Note, Title = "Note",
            ActivityAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            State = new InboxItemState { UpdatedAt = DateTimeOffset.UtcNow }
        };
        DataBase.InboxItems.Add(envelope);
        await DataBase.SaveChangesAsync();
        DataBase.Notes.Add(new Note
        {
            InboxItemId = envelope.Id, InboxItem = envelope, AttachedToInboxItemId = attachedToInboxItemId,
            Title = "Note", Body = "Body", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
        });
        await DataBase.SaveChangesAsync();
    }

    private async Task AssertNoDataForAsync(User user)
    {
        Assert.False(await DataBase.Users.AsNoTracking().AnyAsync(u => u.Id == user.Id));
        Assert.False(await DataBase.Inboxes.AsNoTracking().AnyAsync(i => i.UserId == user.Id));
        Assert.False(await DataBase.UserSettings.AsNoTracking().AnyAsync(s => s.UserId == user.Id));
        Assert.False(await DataBase.GitHubProfiles.AsNoTracking().AnyAsync(p => p.UserId == user.Id));
        Assert.False(await DataBase.AdoProfiles.AsNoTracking().AnyAsync(p => p.UserId == user.Id));
        Assert.False(await DataBase.InboxItems.AsNoTracking().AnyAsync(i => i.InboxId == user.Id));
        Assert.False(await DataBase.Notes.AsNoTracking().AnyAsync(n => n.InboxItem.InboxId == user.Id));
        Assert.False(await DataBase.InboxItemStates.AsNoTracking().AnyAsync(s => s.InboxItem.InboxId == user.Id));
    }

    private async Task AssertAccountIntactAsync(User user, int adoProfiles)
    {
        Assert.True(await DataBase.Users.AsNoTracking().AnyAsync(u => u.Id == user.Id));
        Assert.True(await DataBase.Inboxes.AsNoTracking().AnyAsync(i => i.UserId == user.Id));
        Assert.True(await DataBase.UserSettings.AsNoTracking().AnyAsync(s => s.UserId == user.Id));
        Assert.True(await DataBase.GitHubProfiles.AsNoTracking().AnyAsync(p => p.UserId == user.Id));
        Assert.Equal(adoProfiles, await DataBase.AdoProfiles.AsNoTracking().CountAsync(p => p.UserId == user.Id));
        Assert.Equal(4, await DataBase.InboxItems.AsNoTracking().CountAsync(i => i.InboxId == user.Id));
        Assert.Equal(2, await DataBase.Notes.AsNoTracking().CountAsync(n => n.InboxItem.InboxId == user.Id));
        Assert.Equal(4, await DataBase.InboxItemStates.AsNoTracking().CountAsync(s => s.InboxItem.InboxId == user.Id));
    }

    private async Task<AuditEntry> WaitForAuditEntryAsync(AuditEventType type)
    {
        for (var attempt = 0; attempt < 50; attempt++)
        {
            var entry = await DataBase.AuditEntries.AsNoTracking().FirstOrDefaultAsync(a => a.EventType == type);
            if (entry is not null)
            {
                return entry;
            }

            await Task.Delay(100);
        }

        throw new TimeoutException($"No audit entry of type {type} was written.");
    }

    private sealed class ExplodingUserRemovedHandler : IEventHandler<UserRemovedEvent>
    {
        public const string SecretMessage = "secret-internal-detail";

        // After the audit handler (order 0), so the success entry is already inside the transaction.
        public int Order => 10;

        public Task Handle(UserRemovedEvent message, CancellationToken cancellationToken) =>
            throw new InvalidOperationException(SecretMessage);
    }
}
