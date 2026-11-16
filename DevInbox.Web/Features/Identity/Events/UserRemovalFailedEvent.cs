using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;

namespace DevInbox.Web.Features.Identity.Events;

/// <param name="Cause">Short, non-sensitive failure reason (e.g. exception type) — never the raw exception message.</param>
public record UserRemovalFailedEvent(long UserId, string Email, string Cause) : IAuditEvent
{
    public AuditEventType AuditEventType => AuditEventType.UserRemovalFailed;
}
