using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;

namespace DevInbox.Web.Features.Identity.Events;

public record UserAuthenticatedEvent(long UserId, string Email, string? GithubToken) : IAuditEvent
{
    public AuditEventType AuditEventType => AuditEventType.UserAuthenticated;
}
