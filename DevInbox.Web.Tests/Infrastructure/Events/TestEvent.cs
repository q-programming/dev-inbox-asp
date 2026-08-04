using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Tests.Infrastructure.Events;

public sealed record TestEvent(
    string Value)
    : IEvent;
