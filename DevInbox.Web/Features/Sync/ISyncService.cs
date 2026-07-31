namespace DevInbox.Web.Features.Sync;

public interface ISyncService
{
    Task SynchronizeIntegrations(
        long userId,
        string email,
        CancellationToken ct = default);
}
