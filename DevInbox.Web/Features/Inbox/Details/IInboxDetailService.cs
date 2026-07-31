using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Details;

public interface IInboxDetailService
{
    Task PopulateAsync(InboxItem item, InboxItemDetail dto, CancellationToken cancellationToken = default);
}
