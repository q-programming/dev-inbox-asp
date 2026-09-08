using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Sync.Events;
using DevInbox.Web.Features.Sync.Mapper;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Sync;

public class SyncController(
    IPublisher publisher,
    ISyncService syncService,
    IUserService userService) : ISyncBaseController, IComponent
{
    private readonly SyncMapper _syncMapper = new();

    public async Task<SyncTriggerResultDto> TriggerSyncAsync(TriggerType trigger)
    {
        var user = await userService.GetCurrentUserAsync();
        // Manual/Login triggers fire-and-forget
        if (trigger != TriggerType.Background)
        {
            await publisher.PublishAsync(new SyncRequestedEvent(user.Id, user.Email, trigger));
            return new SyncTriggerResultDto();
        }
        // Background trigger (Service Worker) awaits synchronously
        var changes = await syncService.SynchronizeIntegrations(user.Id, user.Email, trigger);
        return new SyncTriggerResultDto
        {
            Items = [.. changes.Select(_syncMapper.ToNotificationItem)]
        };
    }
}
