using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.ADO.Events;

public class UserAuthenticatedAdoEventHandler(IAdoService adoService) : IEventHandler<UserAuthenticatedEvent>
{
    public async Task Handle(UserAuthenticatedEvent message, CancellationToken cancellationToken)
    {
        await adoService.SyncWorkItemsAsync(message.Email, cancellationToken);
    }
}
