using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.Audit.Domain;

public class AuditRepository(AppDbContext db) : Repository<AuditEntry>(db), IAuditRepository
{
}
