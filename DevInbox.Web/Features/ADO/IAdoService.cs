using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

public interface IAdoService
{
    Task<AdoWorkItemDetail> GetDetailsAsync(InboxItem item, CancellationToken cancellationToken);
    public Task SyncWorkItemsAsync(
    string email,
    CancellationToken ct = default);
}
