namespace DevInbox.Web.Infrastructure.Events;

/// <summary>
/// Handles a specific application event type.
/// </summary>
/// <typeparam name="TEvent">Event type handled by this handler.</typeparam>
public interface IEventHandler<in TEvent>
    where TEvent : IEvent
{
    /// <summary>
    /// Execution order for synchronous <see cref="IPublisher.Publish{T}"/> — lower values run first,
    /// handlers with equal order keep their registration order. Optional (default 0); ignored by
    /// <see cref="IPublisher.PublishAsync{T}"/>, where handlers run independently.
    /// </summary>
    int Order => 0;

    Task Handle(
        TEvent message,
        CancellationToken cancellationToken);
}
