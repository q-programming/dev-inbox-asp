using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Sync;

public interface ISyncService
{
    Task<IReadOnlyList<InboxItemChange>> SynchronizeIntegrations(
        long userId,
        string email,
        TriggerType trigger,
        bool forceFullSync = false,
        CancellationToken ct = default);
}
