using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Features.Sync.Domain;

/// <summary>Whether an <see cref="InboxItem"/> was newly created or had a meaningful update applied
/// during a sync run (see GitHubService/AdoService's UpdateExisting* helpers for what counts as
/// "meaningful" — real activity/state changes, not cosmetic field bumps).</summary>
public enum ItemChangeKind
{
    Created,
    Updated
}

/// <summary>Pairs a synced <see cref="InboxItem"/> with what happened to it during this sync run —
/// lets callers (e.g. background-sync notifications) distinguish "brand new" from "updated" instead
/// of a flat item list that loses that distinction.</summary>
public record InboxItemChange(InboxItem Item, ItemChangeKind Kind);
