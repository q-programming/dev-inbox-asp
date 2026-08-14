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
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsClosed)}", nameof(InboxItemSummary.IsClosed))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsSaved)}", nameof(InboxItemSummary.IsSaved))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsDone)}", nameof(InboxItemSummary.IsDone))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsPinned)}", nameof(InboxItemSummary.IsPinned))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.Priority)}", nameof(InboxItemSummary.Priority))]
    [MapperIgnoreSource(nameof(InboxItem.Inbox))]
    [MapperIgnoreSource(nameof(InboxItem.InboxId))]
    public partial InboxItemSummary ToDto(InboxItem item);

    [MapProperty(nameof(InboxItem.Type), nameof(InboxItemDetail.ItemType))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsClosed)}", nameof(InboxItemDetail.IsClosed))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsSaved)}", nameof(InboxItemDetail.IsSaved))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.IsDone)}", nameof(InboxItemDetail.IsDone))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.Priority)}", nameof(InboxItemDetail.Priority))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.FollowUpAt)}", nameof(InboxItemDetail.FollowUpAt))]
    [MapProperty($"{nameof(InboxItem.State)}.{nameof(InboxItemState.Tags)}", nameof(InboxItemDetail.Tags))]
    public partial InboxItemDetail ToInboxItemDetail(InboxItem source);

}
