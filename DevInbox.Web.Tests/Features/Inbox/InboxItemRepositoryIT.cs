using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.FeatureManagement;
using NSubstitute;
using DomainInboxReason = DevInbox.Web.Features.Inbox.Domain.InboxReason;
using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DomainItemType = DevInbox.Web.Features.Inbox.Domain.ItemType;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;

namespace DevInbox.Web.Tests.Features.Inbox;

/// <summary>Verifies the scope-prefix lookup's SQL translation against a real PostgreSQL container.</summary>
public class InboxItemRepositoryIT : DatabaseIntegrationTest
{
    private User _user = default!;
    private InboxItemRepository _repository = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        _user = new User { FirstName = "Jan", LastName = "Kowalski", Email = "jan@example.com", Password = "hashed" };
        await DataBase.Users.AddAsync(_user);
        await DataBase.SaveChangesAsync();

        var inbox = InboxEntity.CreateDefault();
        inbox.UserId = _user.Id;
        await DataBase.Inboxes.AddAsync(inbox);
        await DataBase.SaveChangesAsync();

        _repository = new InboxItemRepository(DataBase, Substitute.For<IFeatureManager>());
    }

    public override async Task DisposeAsync()
    {
        await DataBase.InboxItemStates.ExecuteDeleteAsync();
        await DataBase.InboxItems.ExecuteDeleteAsync();
        await DataBase.Inboxes.ExecuteDeleteAsync();
        await DataBase.Users.ExecuteDeleteAsync();
        await base.DisposeAsync();
    }

    [Fact(DisplayName = "GetExistingItemsByScopePrefixAsync should match by organization prefix and external id regardless of the rest of the scope")]
    public async Task GetExistingItemsByScopePrefixAsyncShouldMatchRegardlessOfTeamAsync()
    {
        await DataBase.InboxItems.AddRangeAsync(
            BuildItem("contoso/Alpha/Backend", "501"),
            BuildItem("contoso/Alpha/Frontend", "502"),
            BuildItem("contoso-other/Alpha/Backend", "501"),
            BuildItem("contoso/Alpha/Backend", "999"));
        await DataBase.SaveChangesAsync();

        var result = await _repository.GetExistingItemsByScopePrefixAsync(
            _user.Id, DomainItemSource.Ado, DomainItemType.WorkItem, "contoso/", ["501", "502"]);

        Assert.Equal(
            ["contoso/Alpha/Backend:501", "contoso/Alpha/Frontend:502"],
            result.Select(i => $"{i.Scope}:{i.ExternalId}").Order().ToList());
    }

    [Fact(DisplayName = "GetInboxItemsFilteredAsync should match the search term against the external id as well as the title")]
    public async Task GetInboxItemsFilteredAsyncShouldMatchSearchTermOnExternalIdAsync()
    {
        await DataBase.InboxItems.AddRangeAsync(
            BuildItem("contoso/Alpha/Backend", "48213", "Fix login redirect"),
            BuildItem("contoso/Alpha/Backend", "777", "Update docs for 48213 migration"),
            BuildItem("contoso/Alpha/Backend", "999", "Unrelated"));
        await DataBase.SaveChangesAsync();

        var (items, total) = await _repository.GetInboxItemsFilteredAsync(
            new PageRequest { Page = 0, Size = 10 }, _user.Id, null, null, null, null, null, "48213");

        Assert.Equal(2, total);
        Assert.Equal(["48213", "777"], items.Select(i => i.ExternalId!).Order().ToList());
    }

    [Fact(DisplayName = "GetInboxItemsFilteredAsync should match a partial external id")]
    public async Task GetInboxItemsFilteredAsyncShouldMatchPartialExternalIdAsync()
    {
        await DataBase.InboxItems.AddRangeAsync(
            BuildItem("contoso/Alpha/Backend", "48213", "Fix login redirect"),
            BuildItem("contoso/Alpha/Backend", "999", "Unrelated"));
        await DataBase.SaveChangesAsync();

        var (items, _) = await _repository.GetInboxItemsFilteredAsync(
            new PageRequest { Page = 0, Size = 10 }, _user.Id, null, null, null, null, null, "8213");

        Assert.Equal(["48213"], items.Select(i => i.ExternalId!).ToList());
    }

    private InboxItem BuildItem(string scope, string externalId, string title = "Item") => new()
    {
        InboxId = _user.Id,
        Source = DomainItemSource.Ado,
        Type = DomainItemType.WorkItem,
        Reason = DomainInboxReason.Assigned,
        ExternalId = externalId,
        Scope = scope,
        Title = title,
        ActivityAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow,
        State = new InboxItemState()
    };
}
