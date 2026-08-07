using DevInbox.Web.Features.Inbox.Details;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

public class AdoInboxDetailsProvider(IAdoService adoService) : IInboxDetailProvider, IService
{

    public Inbox.Domain.ItemSource Source => Inbox.Domain.ItemSource.Ado;

    public async Task PopulateAsync(InboxItem item, InboxItemDetail dto, CancellationToken cancellationToken = default)
    {
        dto.Ado = await adoService.GetDetailsAsync(item, cancellationToken);
    }
}