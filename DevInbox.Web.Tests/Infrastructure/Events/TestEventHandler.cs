using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Tests.Infrastructure.Events;

public sealed class TestEventHandler
    : IEventHandler<TestEvent>
{
    public bool Executed { get; private set; }

    public Task Handle(
        TestEvent message,
        CancellationToken cancellationToken)
    {
        Executed = true;

        return Task.CompletedTask;
    }
}
