namespace DevInbox.Web.Features.ADO;

public interface IAdoService
{
    public Task SyncWorkItemsAsync(
    string email,
    CancellationToken ct = default);
}
