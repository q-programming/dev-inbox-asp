using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Sync.Events;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Sync;

public class SyncController(IPublisher publisher, IUserService userService) : ISyncBaseController, IComponent
{
    public async Task TriggerSyncAsync()
    {
        var user = await userService.GetCurrentUserAsync();
        await publisher.PublishAsync(new SyncRequestedEvent(user.Id, user.Email));
    }
}
