using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Audit.Events;

public interface IAuditEvent : IEvent
{
    AuditEventType AuditEventType { get; }
}
