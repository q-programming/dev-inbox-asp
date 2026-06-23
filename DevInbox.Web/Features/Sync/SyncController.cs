using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Sync;

public class SyncController : ISyncBaseController, IComponent
{
    public Task TriggerSyncAsync()
        => throw new NotImplementedException();
}
