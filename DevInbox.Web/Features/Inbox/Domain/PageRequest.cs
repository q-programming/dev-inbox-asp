using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Domain;

public sealed class PageRequest
{
    public int Page { get; init; }
    public int Size { get; init; }
    public InboxSort Sort { get; init; } = InboxSort.ActivityDesc;
}
