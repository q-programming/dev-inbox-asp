namespace DevInbox.Web.Infrastructure.Events;

/// <summary>
/// Publishes in-process application events.
/// </summary>
public interface IPublisher
{
    /// <summary>
    /// Publishes an event synchronously.
    ///
    /// The caller waits for all handlers to complete.
    /// Handler exceptions are propagated to the caller.
    /// Use this for consistency-sensitive flows.
    /// </summary>
    Task Publish<TEvent>(
        TEvent message,
        CancellationToken cancellationToken = default)
        where TEvent : IEvent;

    /// <summary>
    /// Publishes an event asynchronously in fire-and-forget mode.
    ///
    /// The caller does not wait for handlers to complete.
    /// Each handler runs independently in its own DI scope.
    /// Handler exceptions are logged and isolated.
    /// </summary>
    Task PublishAsync<TEvent>(
        TEvent message,
        CancellationToken cancellationToken = default)
        where TEvent : IEvent;
}
