namespace DevInbox.Web.Features.Sync;

public interface ISyncService
{
    Task SynchronizeIntegrations(
        long userId,
        string email,
        bool forceFullSync = false,
        CancellationToken ct = default);
}
