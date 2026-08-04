using System.ComponentModel.DataAnnotations.Schema;

namespace DevInbox.Web.Features.Audit.Domain;

[Table("audit")]
public sealed class AuditEntry
{
    public Guid Id { get; init; }

    public AuditEventType EventType { get; init; }

    public string? Username { get; init; }

    public string? IpAddress { get; init; }

    public string? Details { get; init; }

    public DateTimeOffset CreatedAt { get; init; }
}
