namespace DevInbox.Web.Infrastructure.Events;

/// <summary>
/// Lightweight in-process event publisher.
///
/// Publish(...)
///   - synchronous
///   - caller waits
///   - exceptions propagate
///
/// PublishAsync(...)
///   - fire and forget
///   - each handler gets its own DI scope
///   - handler failures are isolated
/// </summary>
public sealed class EventPublisher(
    IServiceProvider serviceProvider,
    IServiceScopeFactory scopeFactory,
    ILogger<EventPublisher> logger)
    : IPublisher
{
    public async Task Publish<TEvent>(
        TEvent message,
        CancellationToken cancellationToken = default)
        where TEvent : IEvent
    {
        ArgumentNullException.ThrowIfNull(message);

        var handlers =
            serviceProvider
                .GetServices<IEventHandler<TEvent>>()
                .ToList();

        if (handlers.Count == 0)
        {
            logger.LogDebug(
                "[Event] No handlers registered for event {EventType}",
                typeof(TEvent).Name);

            return;
        }

        logger.LogDebug(
            "[Event] Publishing event {EventType} synchronously to {HandlerCount} handlers",
            typeof(TEvent).Name,
            handlers.Count);

        foreach (var handler in handlers)
        {
            await handler.Handle(
                message,
                cancellationToken);
        }
    }

    public Task PublishAsync<TEvent>(
        TEvent message,
        CancellationToken cancellationToken = default)
        where TEvent : IEvent
    {
        ArgumentNullException.ThrowIfNull(message);

        using var discoveryScope =
            scopeFactory.CreateScope();

        var handlerTypes =
            discoveryScope.ServiceProvider
                .GetServices<IEventHandler<TEvent>>()
                .Select(x => x.GetType())
                .Distinct()
                .ToList();

        logger.LogDebug(
            "[Event] Publishing event {EventType} asynchronously to {HandlerCount} handlers",
            typeof(TEvent).Name,
            handlerTypes.Count);

        foreach (var handlerType in handlerTypes)
        {
            _ = ExecuteHandlerAsync(
                message,
                handlerType,
                CancellationToken.None);
        }

        return Task.CompletedTask;
    }

    private async Task ExecuteHandlerAsync<TEvent>(
        TEvent message,
        Type handlerType,
        CancellationToken cancellationToken)
        where TEvent : IEvent
    {
        try
        {
            using var scope =
                scopeFactory.CreateScope();

            var handler =
                (IEventHandler<TEvent>)
                scope.ServiceProvider
                    .GetRequiredService(handlerType);

            logger.LogDebug(
                "[Event] Executing asynchronous handler {HandlerType} for {EventType}",
                handlerType.Name,
                typeof(TEvent).Name);

            await handler.Handle(
                message,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "[Event] Event handler failed. EventType={EventType}, HandlerType={HandlerType}",
                typeof(TEvent).Name,
                handlerType.Name);

            // TODO Notification Center
        }
    }
}
