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

    private async Task<List<string>> ListIdsAsync(DevInbox.Web.Infrastructure.OpenApi.Generated.ItemStatus status)
    {
        var (items, _) = await _repository.GetInboxItemsFilteredAsync(
            new PageRequest { Page = 0, Size = 50 }, _user.Id, null, null, status, null, null, null);
        return items.Select(i => i.ExternalId!).Order().ToList();
    }

    private InboxItem BuildStateItem(string externalId, DomainInboxReason reason, int activityDaysAgo,
        Action<InboxItemState>? configure = null)
    {
        var item = BuildItem("contoso/Alpha/Backend", externalId);
        item.Reason = reason;
        item.ActivityAt = DateTimeOffset.UtcNow.AddDays(-activityDaysAgo);
        configure?.Invoke(item.State);
        return item;
    }

    [Fact(DisplayName = "NeedsAttention should include priority, due follow-up, review requests and unviewed assigned items, but not done/closed")]
    public async Task NeedsAttentionShouldApplyEachRuleAsync()
    {
        var now = DateTimeOffset.UtcNow;
        await DataBase.InboxItems.AddRangeAsync(
            BuildStateItem("high", DomainInboxReason.Authored, 1, s => s.Priority = Priority.High),
            BuildStateItem("due", DomainInboxReason.Authored, 1, s => s.FollowUpAt = now.AddHours(-1)),
            BuildStateItem("future", DomainInboxReason.Authored, 1, s => s.FollowUpAt = now.AddDays(2)),
            BuildStateItem("review", DomainInboxReason.ReviewRequested, 1),
            BuildStateItem("assigned-new", DomainInboxReason.Assigned, 1, s => s.LastViewedAt = now.AddDays(-5)),
            BuildStateItem("assigned-seen", DomainInboxReason.Assigned, 3, s => s.LastViewedAt = now.AddDays(-1)),
            BuildStateItem("done", DomainInboxReason.ReviewRequested, 1, s => s.IsDone = true),
            BuildStateItem("closed", DomainInboxReason.ReviewRequested, 1, s => s.IsClosed = true));
        await DataBase.SaveChangesAsync();

        var ids = await ListIdsAsync(DevInbox.Web.Infrastructure.OpenApi.Generated.ItemStatus.NeedsAttention);

        Assert.Equal(["assigned-new", "due", "high", "review"], ids);
    }

    [Fact(DisplayName = "Stale should be open, unsaved/unpinned, older than 14 days and not needing attention")]
    public async Task StaleShouldApplyEachRuleAsync()
    {
        await DataBase.InboxItems.AddRangeAsync(
            BuildStateItem("old", DomainInboxReason.Authored, 15),
            BuildStateItem("recent", DomainInboxReason.Authored, 13),
            BuildStateItem("saved", DomainInboxReason.Authored, 30, s => s.IsSaved = true),
            BuildStateItem("pinned", DomainInboxReason.Authored, 30, s => s.IsPinned = true),
            BuildStateItem("done", DomainInboxReason.Authored, 30, s => s.IsDone = true),
            BuildStateItem("attention", DomainInboxReason.Authored, 30, s => s.Priority = Priority.Critical));
        await DataBase.SaveChangesAsync();

        var ids = await ListIdsAsync(DevInbox.Web.Infrastructure.OpenApi.Generated.ItemStatus.Stale);

        Assert.Equal(["old"], ids);
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
