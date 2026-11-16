using DevInbox.Web.Infrastructure.Events;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace DevInbox.Web.Tests.Infrastructure.Events;

public sealed class EventPublisherTests
{
    private readonly ServiceCollection _services;
    private readonly ITestOutputHelper _output;
    public EventPublisherTests(ITestOutputHelper output)
    {
        _output = output;
        _services = new ServiceCollection();
        _services.AddLogging(builder =>
        {
            builder.SetMinimumLevel(LogLevel.Trace);
            builder.AddXUnit(_output);
        });

        _services.AddScoped<IPublisher, EventPublisher>();
        _services.AddScoped<IPublisher, EventPublisher>();
    }

    [Fact(DisplayName = "Publish should execute registered handler")]
    public async Task PublishShouldExecuteHandlerAsync()
    {
        // Arrange
        var handler = new TestEventHandler();
        RegisterHandler<TestEvent, TestEventHandler>(handler);
        using var provider = BuildProvider();
        var publisher = CreatePublisher(provider);
        // Act
        await publisher.Publish(new TestEvent("hello"));
        // Assert
        Assert.True(handler.Executed);
    }

    [Fact(DisplayName = "Publish should not throw when no handlers are registered")]
    public async Task PublishShouldIgnoreMissingHandlersAsync()
    {
        // Arrange
        using var provider = BuildProvider();
        var publisher = CreatePublisher(provider);
        // Act
        var exception = await Record.ExceptionAsync(() => publisher.Publish(new TestEvent("hello")));
        // Assert
        Assert.Null(exception);
    }

    [Fact(DisplayName = "Publish should run handlers by ascending Order, keeping registration order for equal Order")]
    public async Task PublishShouldRunHandlersInOrderAsync()
    {
        var order = new ExecutionOrder();
        _services.AddScoped<IEventHandler<TestEvent>>(_ => new OrderedTestHandler("late", 10, order));
        _services.AddScoped<IEventHandler<TestEvent>>(_ => new OrderedTestHandler("default-1", 0, order));
        _services.AddScoped<IEventHandler<TestEvent>>(_ => new OrderedTestHandler("early", -5, order));
        _services.AddScoped<IEventHandler<TestEvent>>(_ => new OrderedTestHandler("default-2", 0, order));
        using var provider = BuildProvider();
        var publisher = CreatePublisher(provider);

        await publisher.Publish(new TestEvent("hello"));

        Assert.Equal(["early", "default-1", "default-2", "late"], order.Steps);
    }

    [Fact(DisplayName = "Publish should stop at a failing handler, propagate its exception and skip later-ordered handlers")]
    public async Task PublishShouldStopAtFailingHandlerAsync()
    {
        var order = new ExecutionOrder();
        _services.AddScoped<IEventHandler<TestEvent>>(_ => new OrderedTestHandler("after", 10, order));
        _services.AddScoped<IEventHandler<TestEvent>, FailingEventHandler>();
        _services.AddScoped<IEventHandler<TestEvent>>(_ => new OrderedTestHandler("before", -1, order));
        using var provider = BuildProvider();
        var publisher = CreatePublisher(provider);

        await Assert.ThrowsAsync<InvalidOperationException>(() => publisher.Publish(new TestEvent("hello")));

        Assert.Equal(["before"], order.Steps);
    }

    [Fact(DisplayName = "PublishAsync should execute handler in background")]
    public async Task PublishAsyncShouldExecuteHandlerAsync()
    {
        // Arrange
        var handler =
            new AsyncTestHandler();
        RegisterHandler<TestEvent, AsyncTestHandler>(handler);
        using var provider = BuildProvider();
        var publisher = CreatePublisher(provider);
        // Act
        await publisher.PublishAsync(new TestEvent("hello"));
        // Assert
        await handler.Completion.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.True(handler.Completion.Task.IsCompleted);
    }

    [Fact(DisplayName = "PublishAsync should execute all handlers")]
    public async Task PublishAsyncShouldExecuteAllHandlersAsync()
    {
        // Arrange

        var first = new AsyncTestHandler();
        var second = new SecondAsyncTestHandler();

        RegisterHandler<TestEvent, AsyncTestHandler>(first);
        RegisterHandler<TestEvent, SecondAsyncTestHandler>(second);

        using var provider = BuildProvider();

        var publisher = CreatePublisher(provider);

        // Act

        await publisher.PublishAsync(
            new TestEvent("hello"));

        // Assert

        await first.Completion.Task
            .WaitAsync(TimeSpan.FromSeconds(2));

        await second.Completion.Task
            .WaitAsync(TimeSpan.FromSeconds(2));

        Assert.True(first.Completion.Task.IsCompleted);
        Assert.True(second.Completion.Task.IsCompleted);
    }

    [Fact(DisplayName = "PublishAsync should isolate handler exception")]
    public async Task PublishAsyncShouldNotThrowWhenHandlerFailsAsync()
    {
        // Arrange

        RegisterHandler<TestEvent, FailingEventHandler>(new FailingEventHandler());

        using var provider =
            BuildProvider();

        var publisher =
            CreatePublisher(provider);

        // Act

        var exception =
            await Record.ExceptionAsync(() => publisher.PublishAsync(new TestEvent("hello")));

        // Assert

        Assert.Null(exception);
    }

    private ServiceProvider BuildProvider()
    {
        return _services.BuildServiceProvider();
    }

    private IPublisher CreatePublisher(
        ServiceProvider provider)
    {
        return new EventPublisher(
            provider,
            provider.GetRequiredService<IServiceScopeFactory>(),
            provider.GetRequiredService<ILogger<EventPublisher>>());
    }

    private void RegisterHandler<TEvent, THandler>(
        THandler handler)
        where TEvent : IEvent
        where THandler : class, IEventHandler<TEvent>
    {
        _services.AddScoped<THandler>(
            _ => handler);

        _services.AddScoped<IEventHandler<TEvent>>(
            _ => handler);
    }
}

public sealed class ExecutionOrder
{
    public List<string> Steps { get; } = [];
}

public sealed class OrderedTestHandler(string name, int order, ExecutionOrder executionOrder) : IEventHandler<TestEvent>
{
    public int Order => order;

    public Task Handle(TestEvent message, CancellationToken cancellationToken)
    {
        executionOrder.Steps.Add(name);
        return Task.CompletedTask;
    }
}
