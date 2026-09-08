using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Sync.Mapper;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Sync;

public class SyncController(
    IPublisher publisher,
    ISyncService syncService,
    IUserService userService,
    ILogger<SyncController> logger) : ISyncBaseController, IComponent
{
    private readonly SyncMapper _syncMapper = new();

    public async Task<SyncTriggerResultDto> TriggerSyncAsync(TriggerType trigger)
    {
        var user = await userService.GetCurrentUserAsync();
        logger.LogDebug("Sync trigger received: {Trigger} (raw value: {TriggerValue}) for user {UserId}", trigger, (int)trigger, user.Id);
        var changes = await syncService.SynchronizeIntegrations(user.Id, user.Email, trigger);
        return new SyncTriggerResultDto
        {
            Items = [.. changes.Select(_syncMapper.ToNotificationItem)]
        };
    }
}
