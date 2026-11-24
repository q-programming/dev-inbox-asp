using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Events;
using DevInbox.Web.Features.Sync.Events;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Inbox;

public class SyncFinishedHandlerTests
{
    [Fact(DisplayName = "Handle should clear the cached scope lists of the user whose sync finished")]
    public async Task HandleShouldClearUsersCacheAsync()
    {
        var inboxService = Substitute.For<IInboxService>();
        var handler = new SyncFinishedHandler(inboxService, NullLogger<SyncFinishedHandler>.Instance);

        await handler.Handle(new SyncFinishedEvent(42), CancellationToken.None);

        inboxService.Received(1).ClearUsersCache(42);
    }
}
