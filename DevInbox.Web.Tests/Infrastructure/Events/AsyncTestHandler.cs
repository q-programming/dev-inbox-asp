using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Tests.Infrastructure.Events;

public sealed class AsyncTestHandler
    : IEventHandler<TestEvent>
{
    public readonly TaskCompletionSource<bool> Completion =
        new();

    public Task Handle(
        TestEvent message,
        CancellationToken cancellationToken)
    {
        Completion.SetResult(true);
        return Task.CompletedTask;
    }
}
