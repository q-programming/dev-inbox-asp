using DevInbox.Web.Common;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Inbox;

public class InboxControllerTests
{
    [Fact]
    public async Task ListInboxItemsAsyncShouldForwardFlatQueryParametersAsync()
    {
        var service = Substitute.For<IInboxService>();
        service.ListInboxItemsAsync(
                Arg.Any<DevInbox.Web.Features.Inbox.Domain.PageRequest>(),
                Arg.Any<ItemSource?>(),
                Arg.Any<ItemType?>(),
                Arg.Any<ItemStatus?>(),
                Arg.Any<InboxReason?>(),
                Arg.Any<string?>())
            .Returns(new InboxPage());
        var controller = new InboxController(service);

        await controller.ListInboxItemsAsync(
            2,
            25,
            InboxSort.PriorityDesc,
            ItemSource.Github,
            ItemType.PR,
            ItemStatus.ToDo,
            InboxReason.ReviewRequested,
            "release");

        await service.Received(1).ListInboxItemsAsync(
            Arg.Is<DevInbox.Web.Features.Inbox.Domain.PageRequest>(request =>
                request.Page == 2 &&
                request.Size == 25 &&
                request.Sort == InboxSort.PriorityDesc),
            ItemSource.Github,
            ItemType.PR,
            ItemStatus.ToDo,
            InboxReason.ReviewRequested,
            "release");
    }

    [Fact]
    public async Task ListInboxItemsAsyncShouldDefaultSortWhenSortIsOmittedAsync()
    {
        var service = Substitute.For<IInboxService>();
        service.ListInboxItemsAsync(
                Arg.Any<DevInbox.Web.Features.Inbox.Domain.PageRequest>(),
                Arg.Any<ItemSource?>(),
                Arg.Any<ItemType?>(),
                Arg.Any<ItemStatus?>(),
                Arg.Any<InboxReason?>(),
                Arg.Any<string?>())
            .Returns(new InboxPage());
        var controller = new InboxController(service);

        await controller.ListInboxItemsAsync(0, 20, null, null, null, null, null, null);

        await service.Received(1).ListInboxItemsAsync(
            Arg.Is<DevInbox.Web.Features.Inbox.Domain.PageRequest>(request =>
                request.Page == 0 &&
                request.Size == 20 &&
                request.Sort == InboxSort.ActivityDesc),
            null,
            null,
            null,
            null,
            null);
    }

    [Theory]
    [InlineData("")]
    [InlineData("a")]
    public async Task ListInboxItemsAsyncShouldRejectSearchTermsOutsideAllowedLengthAsync(string term)
    {
        var service = Substitute.For<IInboxService>();
        var controller = new InboxController(service);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            controller.ListInboxItemsAsync(0, 20, null, null, null, null, null, term));

        await service.DidNotReceiveWithAnyArgs().ListInboxItemsAsync(
            default!,
            default,
            default,
            default,
            default,
            default);
    }

    [Fact]
    public async Task ListInboxItemsAsyncShouldRejectSearchTermsLongerThanMaximumAsync()
    {
        var service = Substitute.For<IInboxService>();
        var controller = new InboxController(service);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            controller.ListInboxItemsAsync(0, 20, null, null, null, null, null, new string('a', 201)));

        await service.DidNotReceiveWithAnyArgs().ListInboxItemsAsync(
            default!,
            default,
            default,
            default,
            default,
            default);
    }
}
