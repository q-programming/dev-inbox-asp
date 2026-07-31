namespace DevInbox.Web.Features.ADO;

public class AdoService(
    ILogger<AdoService> logger)
    : IService, IAdoService
{
    public async Task SyncWorkItemsAsync(
        string email,
        CancellationToken ct = default)
    {
        logger.LogInformation(
            "[ADO] Starting sync for {Email}",
            email);

        for (var i = 1; i <= 3; i++)
        {
            ct.ThrowIfCancellationRequested();

            logger.LogInformation(
                "[ADO] Fetching work item batch {Batch}",
                i);

            await Task.Delay(1500, ct);
        }

        logger.LogInformation(
            "[ADO] Synchronization completed for {Email}",
            email);
    }
}
