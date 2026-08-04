using DevInbox.Web.Common.Utils;
using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Audit.Events;

public sealed class AuditEntryFactory(IHttpContextAccessor httpContextAccessor) : IAuditEntryFactory, IService
{
    public AuditEntry Create(
        IAuditEvent notification)
    {
        return notification switch
        {
            UserAuthenticatedEvent ev =>
                CreateUserAuthenticated(ev),
            AuthenticationFailedEvent ev =>
                CreateAuthenticationFailed(ev),
            UserCreatedEvent ev => CreateUserCreated(ev),
            ApplicationStartedEvent ev => CreateApplicationStarted(ev),

            _ => throw new NotSupportedException(
                $"Audit mapping not found for {notification.GetType().Name}")
        };
    }

    private AuditEntry CreateUserAuthenticated(
        UserAuthenticatedEvent ev)
    {
        return new AuditEntry
        {
            EventType = ev.AuditEventType,
            Username = ev.Email,
            IpAddress = GetIpAddress(),
            Details = null,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private AuditEntry CreateAuthenticationFailed(
        AuthenticationFailedEvent ev)
    {
        return new AuditEntry
        {
            EventType = ev.AuditEventType,
            Username = ev.Email,
            IpAddress = GetIpAddress(),
            Details = $"{EmailUtils.MaskEmail(ev.Email)} - {ev.Cause}",
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private AuditEntry CreateUserCreated(
        UserCreatedEvent ev)
    {
        return new AuditEntry
        {
            EventType = ev.AuditEventType,
            Username = ev.Email,
            IpAddress = GetIpAddress(),
            Details = null,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private AuditEntry CreateApplicationStarted(
        ApplicationStartedEvent ev)
    {
        return new AuditEntry
        {
            EventType = ev.AuditEventType,
            Username = null,
            IpAddress = null,
            Details = null,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private string? GetIpAddress()
        => httpContextAccessor.HttpContext?
            .Connection
            .RemoteIpAddress?
            .ToString();
}
