using System.Linq.Expressions;
using System.Security.Claims;
using DevInbox.Web.Common;
using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using Microsoft.AspNetCore.Http;
using NSubstitute;
using InboxEntity = DevInbox.Web.Features.Inbox.Domain.Inbox;
using GeneratedItemSource = DevInbox.Web.Infrastructure.OpenApi.Generated.ItemSource;
using GeneratedInboxItemDetail = DevInbox.Web.Infrastructure.OpenApi.Generated.InboxItemDetail;
using InboxSummary = DevInbox.Web.Infrastructure.OpenApi.Generated.InboxSummary;

namespace DevInbox.Web.Tests.Features.Inbox;

/// <summary>
/// Unit tests for <see cref="InboxService"/>. Repositories, detail service and HttpContext are mocked —
/// no database involved. <see cref="InboxService.GetInboxSummaryAsync"/> delegates the aggregation and
/// projection to <see cref="IInboxItemRepository.GetInboxSummaryAsync{TResult}"/>, so it is exercised here
/// like every other repository call (the actual EF Core translation of the projection expression is
/// covered separately by <c>InboxServiceIT</c> against a real Postgres Testcontainer).
/// </summary>
public class InboxServiceTests
{
    private const long UserId = 1;
    private const long OtherUserId = 2;

    private readonly IInboxRepository _inboxRepository;
    private readonly IInboxItemRepository _inboxItemRepository;
    private readonly IInboxDetailService _inboxDetailService;
    private readonly Web.Features.Inbox.InboxService _service;

    public InboxServiceTests()
    {
        _inboxRepository = Substitute.For<IInboxRepository>();
        _inboxItemRepository = Substitute.For<IInboxItemRepository>();
        _inboxDetailService = Substitute.For<IInboxDetailService>();
        _service = new Web.Features.Inbox.InboxService(
            _inboxRepository,
            _inboxItemRepository,
            _inboxDetailService,
            CreateAccessorWithClaim(UserId));
    }

    private static IHttpContextAccessor CreateAccessorWithClaim(long? userId)
    {
        var identity = userId is null
            ? new ClaimsIdentity()
            : new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString())]);
        var httpContext = Substitute.For<HttpContext>();
        httpContext.User.Returns(new ClaimsPrincipal(identity));
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        return accessor;
    }

    private static InboxEntity BuildInbox(long userId) => new()
    {
        UserId = userId,
        Version = 0,
        LastUpdatedAt = DateTimeOffset.UtcNow,
        SyncStatus = SyncStatus.Idle
    };

    // ── GetInboxSummaryAsync ──────────────────────────────────────────────────

    [Fact(DisplayName = "GetInboxSummaryAsync should return the summary produced by the repository for the current user")]
    public async Task GetInboxSummaryAsyncShouldReturnRepositorySummaryAsync()
    {
        var summary = new InboxSummary { Total = 5, Unread = 2 };
        _ = _inboxItemRepository
            .GetInboxSummaryAsync(UserId, Arg.Any<Expression<Func<IGrouping<int, InboxItem>, InboxSummary>>>())
            .Returns(summary);

        var result = await _service.GetInboxSummaryAsync();

        Assert.Same(summary, result);
    }

    [Fact(DisplayName = "GetInboxSummaryAsync should return an empty summary when the repository finds no items")]
    public async Task GetInboxSummaryAsyncShouldReturnEmptySummaryWhenRepositoryReturnsNullAsync()
    {
        _ = _inboxItemRepository
            .GetInboxSummaryAsync(UserId, Arg.Any<Expression<Func<IGrouping<int, InboxItem>, InboxSummary>>>())
            .Returns((InboxSummary?)null);

        var result = await _service.GetInboxSummaryAsync();

        Assert.NotNull(result);
        Assert.Equal(0, result.Total);
    }

    // ── GetUserInboxAsync() — current user ───────────────────────────────────

    [Fact(DisplayName = "GetUserInboxAsync should return the current user's inbox")]
    public async Task GetUserInboxAsyncShouldReturnCurrentUsersInboxAsync()
    {
        var inbox = BuildInbox(UserId);
        _ = _inboxRepository.GetByIdAsync(UserId).Returns(inbox);

        var result = await _service.GetUserInboxAsync();

        Assert.Same(inbox, result);
    }

    [Fact(DisplayName = "GetUserInboxAsync should throw when there is no authenticated user")]
    public async Task GetUserInboxAsyncShouldThrowWhenNoAuthenticatedUserAsync()
    {
        var service = new Web.Features.Inbox.InboxService(
            _inboxRepository,
            _inboxItemRepository,
            _inboxDetailService,
            CreateAccessorWithClaim(null));

        _ = await Assert.ThrowsAsync<NotFoundException>(() => service.GetUserInboxAsync());
    }

    // ── GetUserInboxAsync(userId) ─────────────────────────────────────────────

    [Fact(DisplayName = "GetUserInboxAsync(userId) should return the inbox when found")]
    public async Task GetUserInboxAsyncByIdShouldReturnInboxWhenFoundAsync()
    {
        var inbox = BuildInbox(OtherUserId);
        _ = _inboxRepository.GetByIdAsync(OtherUserId).Returns(inbox);

        var result = await _service.GetUserInboxAsync(OtherUserId);

        Assert.Same(inbox, result);
    }

    [Fact(DisplayName = "GetUserInboxAsync(userId) should throw NotFoundException when the inbox does not exist")]
    public async Task GetUserInboxAsyncByIdShouldThrowWhenNotFoundAsync()
    {
        _ = _inboxRepository.GetByIdAsync(OtherUserId).Returns((InboxEntity)null!);

        _ = await Assert.ThrowsAsync<NotFoundException>(() => _service.GetUserInboxAsync(OtherUserId));
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact(DisplayName = "UpdateAsync should persist the inbox via the repository")]
    public async Task UpdateAsyncShouldPersistInboxAsync()
    {
        var inbox = BuildInbox(UserId);

        await _service.UpdateAsync(inbox);

        await _inboxRepository.Received(1).UpdateAsync(inbox);
    }

    // ── ListInboxItemsAsync ───────────────────────────────────────────────────

    [Fact(DisplayName = "ListInboxItemsAsync should map repository results into a page for the current user")]
    public async Task ListInboxItemsAsyncShouldReturnMappedPageAsync()
    {
        var items = new List<InboxItem>
        {
            new()
            {
                Id = 10,
                InboxId = UserId,
                ExternalId = "1",
                Source = ItemSource.GitHub,
                Type = ItemType.PR,
                Title = "Fix bug",
                ActivityAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                State = new InboxItemState { InboxItemId = 10 }
            }
        };
        _ = _inboxItemRepository
            .GetInboxItemsFilteredAsync(0, 20, UserId, ItemSource.GitHub, null, null, null)
            .Returns((items, 1L));

        var result = await _service.ListInboxItemsAsync(0, 20, GeneratedItemSource.Github, null, null, null);

        Assert.Equal(1, result.TotalElements);
        Assert.Equal(0, result.Page);
        Assert.Equal(20, result.Size);
        _ = Assert.Single(result.Items);
        Assert.Equal("Fix bug", result.Items[0].Title);
    }

    [Fact(DisplayName = "ListInboxItemsAsync should return an empty page when the user has no items")]
    public async Task ListInboxItemsAsyncShouldReturnEmptyPageWhenNoItemsAsync()
    {
        _ = _inboxItemRepository
            .GetInboxItemsFilteredAsync(0, 20, UserId, null, null, null, null)
            .Returns(([], 0L));

        var result = await _service.ListInboxItemsAsync(0, 20, null, null, null, null);

        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalElements);
    }

    // ── GetInboxItemByIdAsync ─────────────────────────────────────────────────

    [Fact(DisplayName = "GetInboxItemByIdAsync should return detail dto and populate it via the detail service")]
    public async Task GetInboxItemByIdAsyncShouldReturnDetailAndPopulateAsync()
    {
        var item = new InboxItem
        {
            Id = 5,
            InboxId = UserId,
            ExternalId = "42",
            Source = ItemSource.GitHub,
            Type = ItemType.PR,
            Title = "Review this",
            State = new InboxItemState { InboxItemId = 5 }
        };
        _ = _inboxItemRepository.GetByIdForUserAsync(5, UserId).Returns(item);

        var result = await _service.GetInboxItemByIdAsync(5);

        Assert.Equal(GeneratedItemSource.Github, result.Source);
        await _inboxDetailService.Received(1).PopulateAsync(item, result, Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "GetInboxItemByIdAsync should throw NotFoundException and not call the detail service when the item does not belong to the user")]
    public async Task GetInboxItemByIdAsyncShouldThrowWhenNotFoundForUserAsync()
    {
        _ = _inboxItemRepository.GetByIdForUserAsync(5, UserId).Returns((InboxItem?)null);

        _ = await Assert.ThrowsAsync<NotFoundException>(() => _service.GetInboxItemByIdAsync(5));

        await _inboxDetailService.DidNotReceive().PopulateAsync(Arg.Any<InboxItem>(), Arg.Any<GeneratedInboxItemDetail>(), Arg.Any<CancellationToken>());
    }

    // ── PutInboxSeedAsync ─────────────────────────────────────────────────────

    [Fact(DisplayName = "PutInboxSeedAsync should add between 1 and 5 items linked to the current user's inbox")]
    public async Task PutInboxSeedAsyncShouldAddItemsLinkedToInboxAsync()
    {
        var inbox = BuildInbox(UserId);
        _ = _inboxRepository.GetByIdAsync(UserId).Returns(inbox);

        await _service.PutInboxSeedAsync();

        var addedItems = _inboxItemRepository.ReceivedCalls()
            .Where(call => call.GetMethodInfo().Name == nameof(IInboxItemRepository.AddAsync))
            .Select(call => (InboxItem)call.GetArguments()[0]!)
            .ToList();

        Assert.InRange(addedItems.Count, 1, 5);
        Assert.All(addedItems, item => Assert.Equal(inbox.UserId, item.InboxId));
    }
}
