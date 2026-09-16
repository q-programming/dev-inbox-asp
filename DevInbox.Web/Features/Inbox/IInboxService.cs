
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox;

public interface IInboxService
{
    Task<Domain.Inbox> GetUserInboxAsync();
    Task<Domain.Inbox> GetUserInboxAsync(long userId);
    Task UpdateAsync(Domain.Inbox inbox);
    Task<InboxSummary> GetInboxSummaryAsync();
    Task<InboxPage> ListInboxItemsAsync(Domain.PageRequest pageRequest, ItemSource? source, ItemType? itemType, ItemStatus? status, InboxReason? reason, string? term);
    Task<InboxItemDetail> GetInboxItemByIdAsync(long id);
    Task MarkInboxItemDoneAsync(long id, bool isDone);
    Task SaveInboxItemAsync(long id, bool save);
    Task BulkUpdateInboxItemsAsync(IReadOnlyCollection<long> ids, bool? isDone, bool? isSaved);
    Task DeleteInboxItemsBySourceAsync(long userId, Domain.ItemSource source, string? organization, CancellationToken cancellationToken);
}
