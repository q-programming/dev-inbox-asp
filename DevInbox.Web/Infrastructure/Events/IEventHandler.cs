namespace DevInbox.Web.Infrastructure.Events;

/// <summary>
/// Handles a specific application event type.
/// </summary>
/// <typeparam name="TEvent">Event type handled by this handler.</typeparam>
public interface IEventHandler<in TEvent>
    where TEvent : IEvent
{
    Task Handle(
        TEvent message,
        CancellationToken cancellationToken);
}
