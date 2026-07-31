
using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Tests.Infrastructure.Events;

public sealed class SecondAsyncTestHandler
    : IEventHandler<TestEvent>
{
    public TaskCompletionSource<bool> Completion { get; } =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    public Task Handle(TestEvent message, CancellationToken cancellationToken)
    {
        Completion.TrySetResult(true);
        return Task.CompletedTask;
    }
}
