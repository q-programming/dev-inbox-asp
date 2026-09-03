
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox;

public interface IInboxService
{
    Task<Domain.Inbox> GetUserInboxAsync();
    Task<Domain.Inbox> GetUserInboxAsync(long userId);
    Task UpdateAsync(Domain.Inbox inbox);
    Task<InboxSummary> GetInboxSummaryAsync();
    Task PutInboxSeedAsync();
    Task<InboxPage> ListInboxItemsAsync(int page, int size, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason);
    Task<InboxItemDetail> GetInboxItemByIdAsync(long id);
    Task MarkInboxItemDoneAsync(long id, bool isDone);
    Task SaveInboxItemAsync(long id, bool save);
    Task DeleteInboxItemsBySourceAsync(long userId, Domain.ItemSource source, string? organization, CancellationToken cancellationToken);
}
