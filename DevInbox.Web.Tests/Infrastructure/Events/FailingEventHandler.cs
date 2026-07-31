using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Tests.Infrastructure.Events;

public sealed class FailingEventHandler
    : IEventHandler<TestEvent>
{
    public Task Handle(
        TestEvent message,
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException(
            "Boom");
    }
}
