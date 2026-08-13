using DevInbox.Web.Features.Inbox.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox;

public class InboxController(IInboxService inboxService) : IInboxBaseController, IComponent
{
    private InboxMapper _inboxMapper = new();
    public Task<InboxPage> ListInboxItemsAsync(int page, int size, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason)
    {
        return inboxService.ListInboxItemsAsync(page, size, source, itemType, status, reason);
    }

    public Task<InboxItemDetail> GetInboxItemAsync(long id)
    {
        return inboxService.GetInboxItemByIdAsync(id);
    }

    public Task UpdateItemOverlayAsync(long id, ItemOverlayRequest body)
    {
        throw new ServiceNotImplementedException();
    }

    public async Task<InboxStatus> GetInboxStatusAsync()
    {
        var inbox = await inboxService.GetUserInboxAsync();
        return _inboxMapper.ToStatus(inbox);
    }

    public Task<InboxSummary> GetInboxSummaryAsync()
    {
        return inboxService.GetInboxSummaryAsync();
    }

    public Task PutInboxSeedAsync()
    {
        return inboxService.PutInboxSeedAsync();
    }

    public async Task MarkInboxItemDoneAsync(long id, bool isDone)
    {
        await inboxService.MarkInboxItemDoneAsync(id, isDone);
    }

    public async Task SaveInboxItemAsync(long id, bool save)
    {
        await inboxService.SaveInboxItemAsync(id, save);
    }
}
