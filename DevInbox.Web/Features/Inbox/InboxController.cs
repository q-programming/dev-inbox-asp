using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox;

public class InboxController : IInboxBaseController, IComponent
{
    public Task<InboxPage> ListInboxItemsAsync(ItemSource? source, ItemType? itemType, ItemStatus? status, int page, int size)
    {
        throw new ServiceNotImplementedException();
    }

    public Task<InboxItemDetail> GetInboxItemAsync(System.Guid id)
    {
        throw new ServiceNotImplementedException();
    }

    public Task UpdateItemOverlayAsync(System.Guid id, ItemOverlayRequest body)
    {
        throw new ServiceNotImplementedException();
    }
}
