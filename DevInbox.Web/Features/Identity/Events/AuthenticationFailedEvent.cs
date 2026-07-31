using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;

namespace DevInbox.Web.Features.Identity.Events;

public record AuthenticationFailedEvent(string Email, string Cause) : IAuditEvent
{
    public AuditEventType AuditEventType => AuditEventType.AuthenticationFailed;
}
