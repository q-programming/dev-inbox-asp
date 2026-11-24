using DevInbox.Web.Features.Inbox.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox;

public class InboxController(IInboxService inboxService) : IInboxBaseController, IComponent
{
    private const int MinimumSearchTermLength = 2;
    private const int MaximumSearchTermLength = 200;

    private InboxMapper _inboxMapper = new();

    public Task<InboxPage> ListInboxItemsAsync(
        int page,
        int size,
        InboxSort? sort,
        ItemSource? source,
        ItemType? itemType,
        ItemStatus? status,
        InboxReason? reason,
        string? scope,
        string? term)
    {
        if (term is not null &&
            term.Length is < MinimumSearchTermLength or > MaximumSearchTermLength)
        {
            throw new BadRequestException(
                $"The inbox search term must contain between {MinimumSearchTermLength} and {MaximumSearchTermLength} characters.");
        }

        return inboxService.ListInboxItemsAsync(
            new Domain.PageRequest { Page = page, Size = size, Sort = sort ?? InboxSort.ActivityDesc },
            source,
            itemType,
            status,
            reason,
            scope,
            term);
    }

    public Task BulkUpdateInboxItemsAsync(BulkInboxItemUpdateRequest body)
    {
        return inboxService.BulkUpdateInboxItemsAsync(body.Ids, body.IsDone, body.IsSaved);
    }

    public async Task<ICollection<string>> GetUserRepositoriesAsync()
    {
        return await inboxService.GetUserRepositoriesAsync();
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

    public async Task<ICollection<string>> GetUserTeamsAsync()
    {
        return await inboxService.GetUserTeamsAsync();
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
