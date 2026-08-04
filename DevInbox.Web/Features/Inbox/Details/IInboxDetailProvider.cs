using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Details;

public interface IInboxDetailProvider
{
    Domain.ItemSource Source { get; }

    Task PopulateAsync(
        InboxItem item,
        InboxItemDetail dto,
        CancellationToken cancellationToken = default);
}
