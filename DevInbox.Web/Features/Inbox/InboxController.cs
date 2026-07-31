using DevInbox.Web.Features.Inbox.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox;

public class InboxController(IInboxService inboxService) : IInboxBaseController, IComponent
{
    private InboxMapper _inboxMapper = new InboxMapper();
    public Task<InboxPage> ListInboxItemsAsync(ItemSource? source, ItemType? itemType, ItemStatus? status, int page, int size)
    {
        return Task.FromResult(new InboxPage
        {
            Items = [],
            Page = 0,
            Size = 20,
            TotalElements = 0
        });
    }

    public Task<InboxItemDetail> GetInboxItemAsync(System.Guid id)
    {
        throw new ServiceNotImplementedException();
    }

    public Task UpdateItemOverlayAsync(System.Guid id, ItemOverlayRequest body)
    {
        throw new ServiceNotImplementedException();
    }

    public async Task<InboxStatus> GetInboxStatusAsync()
    {
        var inbox = await inboxService.GetUserInboxAsync();
        return _inboxMapper.ToStatus(inbox);
    }
}
