using DevInbox.Web.Features.Audit.Domain;

namespace DevInbox.Web.Features.Audit.Events;

public interface IAuditEntryFactory
{
    AuditEntry Create(IAuditEvent notification);
}
