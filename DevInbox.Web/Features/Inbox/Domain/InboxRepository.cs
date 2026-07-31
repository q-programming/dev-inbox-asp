using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.Inbox.Domain;

public class InboxRepository(AppDbContext dbContext) : Repository<Inbox>(dbContext), IInboxRepository
{
}
