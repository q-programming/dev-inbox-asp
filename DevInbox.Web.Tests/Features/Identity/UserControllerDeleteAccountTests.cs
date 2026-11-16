using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Features.Identity.OAuth;
using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserControllerDeleteAccountTests
{
    private readonly User _user = new() { Id = 42, Email = "jan@example.com", Password = "hashed" };
    private readonly IUserService _userService = Substitute.For<IUserService>();
    private readonly IPublisher _publisher = Substitute.For<IPublisher>();
    private readonly ITransactionRunner _transactionRunner = Substitute.For<ITransactionRunner>();
    private readonly UserController _controller;

    public UserControllerDeleteAccountTests()
    {
        // The real runner needs a database; here it just executes the action it is given.
        _transactionRunner.ExecuteAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<Task>>()());
        _userService.GetCurrentUserAsync().Returns(_user);

        _controller = new UserController(
            _userService,
            Substitute.For<IJwtTokenService>(),
            Substitute.For<IHttpContextAccessor>(),
            Substitute.For<IGitHubOAuthService>(),
            Substitute.For<IGitHubProfileRepository>(),
            Substitute.For<IAdoProfileRepository>(),
            _publisher,
            _transactionRunner,
            NullLogger<UserController>.Instance);
    }

    [Fact(DisplayName = "DeleteAccountAsync should remove the user without publishing integration disconnect events")]
    public async Task DeleteAccountAsyncShouldRemoveUserAsync()
    {
        await _controller.DeleteAccountAsync();

        await _userService.Received(1).RemoveUserAsync(_user);
        await _publisher.DidNotReceive().Publish(Arg.Any<IntegrationDisconnectRequestEvent>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DeleteAccountAsync should run everything inside the transaction runner")]
    public async Task DeleteAccountAsyncShouldRunInsideTransactionAsync()
    {
        await _controller.DeleteAccountAsync();

        await _transactionRunner.Received(1).ExecuteAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DeleteAccountAsync should not publish a failure event when deletion succeeds")]
    public async Task DeleteAccountAsyncShouldNotPublishFailureOnSuccessAsync()
    {
        await _controller.DeleteAccountAsync();

        await _publisher.DidNotReceive().PublishAsync(Arg.Any<UserRemovalFailedEvent>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DeleteAccountAsync should publish a failure audit event with the exception type and rethrow when user removal fails")]
    public async Task DeleteAccountAsyncShouldAuditAndRethrowWhenRemovalFailsAsync()
    {
        _userService.RemoveUserAsync(_user).Returns(Task.FromException(new InvalidOperationException("secret db details")));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _controller.DeleteAccountAsync());

        // PublishAsync (own DI scope) — the request's DbContext still tracks the failed changes.
        await _publisher.Received(1).PublishAsync(
            Arg.Is<UserRemovalFailedEvent>(ev =>
                ev.UserId == _user.Id &&
                ev.Email == _user.Email &&
                ev.Cause == nameof(InvalidOperationException)),
            Arg.Any<CancellationToken>());
        await _publisher.DidNotReceive().Publish(Arg.Any<UserRemovalFailedEvent>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DeleteAccountAsync should not leak the exception message into the failure audit event")]
    public async Task DeleteAccountAsyncShouldNotLeakExceptionMessageAsync()
    {
        _userService.RemoveUserAsync(_user).Returns(Task.FromException(new InvalidOperationException("secret db details")));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _controller.DeleteAccountAsync());

        await _publisher.Received(1).PublishAsync(
            Arg.Is<UserRemovalFailedEvent>(ev => !ev.Cause.Contains("secret")),
            Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DeleteAccountAsync should audit the failure when the transaction commit fails")]
    public async Task DeleteAccountAsyncShouldAuditWhenTransactionFailsAsync()
    {
        _transactionRunner.ExecuteAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromException(new InvalidOperationException("commit failed")));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _controller.DeleteAccountAsync());

        await _publisher.Received(1).PublishAsync(Arg.Any<UserRemovalFailedEvent>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DeleteAccountAsync should rethrow the original exception instance")]
    public async Task DeleteAccountAsyncShouldRethrowOriginalExceptionAsync()
    {
        var original = new InvalidOperationException("original");
        _userService.RemoveUserAsync(_user).Returns(Task.FromException(original));

        var thrown = await Assert.ThrowsAsync<InvalidOperationException>(() => _controller.DeleteAccountAsync());

        Assert.Same(original, thrown);
    }
}
