using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;

namespace DevInbox.Web.Infrastructure.Events;

public class ApplicationStartedEvent : IAuditEvent
{
    public AuditEventType AuditEventType => AuditEventType.ApplicationStarted;
}
