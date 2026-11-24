using System.Linq.Expressions;

namespace DevInbox.Web.Features.Inbox.Domain;

/// <summary>
/// Single definition of the "Needs attention" and "Stale" views, shared by the list query and the
/// summary counts so the sidebar badge always equals the number of rows in the list.
/// Expressions (not delegates) so EF Core translates them to SQL.
/// </summary>
public static class InboxItemPredicates
{
    private const int StaleAfterDays = 14;

    public static Expression<Func<InboxItem, bool>> NeedsAttention(DateTimeOffset now) =>
        item => !item.State.IsDone && !item.State.IsClosed &&
                (item.State.Priority == Priority.High ||
                 item.State.Priority == Priority.Critical ||
                 (item.State.FollowUpAt != null && item.State.FollowUpAt <= now) ||
                 item.Reason == InboxReason.ReviewRequested ||
                 ((item.Reason == InboxReason.Assigned || item.Reason == InboxReason.Mentioned) &&
                  (item.State.LastViewedAt == null || item.ActivityAt > item.State.LastViewedAt)));

    /// <summary>Open, not saved/pinned, quiet for <see cref="StaleAfterDays"/>, and not already needing attention.</summary>
    public static Expression<Func<InboxItem, bool>> Stale(DateTimeOffset now)
    {
        var staleBefore = now.AddDays(-StaleAfterDays);
        return item => !item.State.IsDone && !item.State.IsClosed &&
                       !item.State.IsSaved && !item.State.IsPinned &&
                       item.ActivityAt < staleBefore &&
                       !(item.State.Priority == Priority.High ||
                         item.State.Priority == Priority.Critical ||
                         (item.State.FollowUpAt != null && item.State.FollowUpAt <= now) ||
                         item.Reason == InboxReason.ReviewRequested ||
                         ((item.Reason == InboxReason.Assigned || item.Reason == InboxReason.Mentioned) &&
                          (item.State.LastViewedAt == null || item.ActivityAt > item.State.LastViewedAt)));
    }
}
