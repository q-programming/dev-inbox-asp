using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Audit.Events;

public class AuditEventHandler<T>(IAuditEntryFactory auditEntryFactory, IAuditRepository auditRepository)
    : IEventHandler<T>
    where T : IAuditEvent
{
    public async Task Handle(
        T message,
        CancellationToken cancellationToken)
    {
        var auditEntry = auditEntryFactory.Create(message);
        await auditRepository.AddAsync(auditEntry);
    }
}
