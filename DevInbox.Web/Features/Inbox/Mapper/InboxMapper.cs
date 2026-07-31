using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Inbox.Mapper;

[Mapper]
public partial class InboxMapper
{
    [MapperIgnoreSource(nameof(Domain.Inbox.User))]
    [MapperIgnoreSource(nameof(Domain.Inbox.UserId))]
    public partial InboxStatus ToStatus(Domain.Inbox inbox);



    [MapProperty(nameof(InboxItem.Source), nameof(InboxItemSummary.SourceType))]
    [MapProperty(nameof(InboxItem.Type), nameof(InboxItemSummary.ItemType))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsUnread)}", nameof(InboxItemSummary.IsUnread))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsSaved)}", nameof(InboxItemSummary.IsSaved))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsDone)}", nameof(InboxItemSummary.IsDone))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsPinned)}", nameof(InboxItemSummary.IsPinned))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.Priority)}", nameof(InboxItemSummary.Priority))]
    [MapperIgnoreSource(nameof(InboxItem.Inbox))]
    [MapperIgnoreSource(nameof(InboxItem.InboxId))]
    public partial InboxItemSummary ToDto(InboxItem item);

    public partial InboxItemDetail ToInboxItemDetail(InboxItem source);

}
