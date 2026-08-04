using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;

namespace DevInbox.Web.Features.Identity.Events;

public record UserCreatedEvent(long UserId, string Email, string FirstName, string LastName, string AccountType) : IAuditEvent
{
    public AuditEventType AuditEventType => AuditEventType.UserCreated;
}
