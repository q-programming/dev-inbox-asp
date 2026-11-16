using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Audit.Events;
using DevInbox.Web.Features.Identity.Events;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Audit;

public class AuditEntryFactoryTests
{
    private const string Email = "jan.kowalski@example.com";
    private readonly IHttpContextAccessor _accessor = Substitute.For<IHttpContextAccessor>();
    private readonly AuditEntryFactory _factory;

    public AuditEntryFactoryTests()
    {
        _factory = new AuditEntryFactory(_accessor);
    }

    [Fact(DisplayName = "Create should map UserRemovedEvent with a masked email in the details")]
    public void CreateShouldMapUserRemovedEvent()
    {
        var entry = _factory.Create(new UserRemovedEvent(1, Email));

        Assert.Equal(AuditEventType.UserRemoved, entry.EventType);
        Assert.Equal(Email, entry.Username);
        Assert.NotNull(entry.Details);
        Assert.DoesNotContain(Email, entry.Details);
        Assert.Contains("removed account", entry.Details);
    }

    [Fact(DisplayName = "Create should map UserRemovalFailedEvent with the cause and a masked email in the details")]
    public void CreateShouldMapUserRemovalFailedEvent()
    {
        var entry = _factory.Create(new UserRemovalFailedEvent(1, Email, "TimeoutException"));

        Assert.Equal(AuditEventType.UserRemovalFailed, entry.EventType);
        Assert.Equal(Email, entry.Username);
        Assert.NotNull(entry.Details);
        Assert.DoesNotContain(Email, entry.Details);
        Assert.Contains("failed", entry.Details);
        Assert.EndsWith("TimeoutException", entry.Details);
    }

    [Fact(DisplayName = "Create should record the caller IP address when an HTTP context is available")]
    public void CreateShouldRecordIpAddress()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("10.1.2.3");
        _accessor.HttpContext.Returns(context);

        var entry = _factory.Create(new UserRemovalFailedEvent(1, Email, "Boom"));

        Assert.Equal("10.1.2.3", entry.IpAddress);
    }

    [Fact(DisplayName = "Create should leave the IP address empty when there is no HTTP context")]
    public void CreateShouldTolerateMissingHttpContext()
    {
        _accessor.HttpContext.Returns((HttpContext?)null);

        var entry = _factory.Create(new UserRemovedEvent(1, Email));

        Assert.Null(entry.IpAddress);
    }

    [Fact(DisplayName = "Create should reject audit events without a mapping")]
    public void CreateShouldRejectUnmappedEvent()
    {
        Assert.Throws<NotSupportedException>(() => _factory.Create(new UnmappedAuditEvent()));
    }

    private sealed record UnmappedAuditEvent : IAuditEvent
    {
        public AuditEventType AuditEventType => AuditEventType.UserRemoved;
    }
}
