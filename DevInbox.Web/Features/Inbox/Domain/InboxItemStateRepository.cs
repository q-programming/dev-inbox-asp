using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxItemStateRepository(AppDbContext dbContext) : Repository<InboxItemState>(dbContext), IInboxItemStateRepository
{
}
