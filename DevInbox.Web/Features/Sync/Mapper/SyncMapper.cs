using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Sync.Mapper;

/// <summary>Maps a synced item's change record into the lightweight DTO returned to a Background sync
/// trigger, used by the client to build a notification.</summary>
[Mapper]
public partial class SyncMapper
{
    public SyncNotificationItemDto ToNotificationItem(InboxItemChange change) => new()
    {
        Integration = ToItemSource(change.Item.Source),
        Title = change.Item.Title ?? string.Empty,
        ChangeKind = ToChangeKind(change.Kind),
        ExternalId = change.Item.ExternalId
    };

    private partial ItemSource ToItemSource(Inbox.Domain.ItemSource source);

    // Names differ from the domain enum (Created -> New) so this can't rely on Mapperly's
    // default by-name enum matching.
    [MapEnumValue(ItemChangeKind.Created, SyncChangeKind.New)]
    private partial SyncChangeKind ToChangeKind(ItemChangeKind kind);
}
