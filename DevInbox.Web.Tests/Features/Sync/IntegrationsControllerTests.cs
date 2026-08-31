using DomainItemSource = DevInbox.Web.Features.Inbox.Domain.ItemSource;
using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Sync.Events;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Sync;

public class IntegrationsControllerTests
{
    private const long UserId = 42;
    private const string Email = "jan@example.com";

    private readonly IGitHubIntegrationService _gitHubIntegrationService;
    private readonly IAdoIntegrationService _adoIntegrationService;
    private readonly IAdoService _adoService;
    private readonly IUserService _userService;
    private readonly IPublisher _publisher;
    private readonly DevInbox.Web.Features.GitHub.IntegrationsController _controller;

    public IntegrationsControllerTests()
    {
        _gitHubIntegrationService = Substitute.For<IGitHubIntegrationService>();
        _adoIntegrationService = Substitute.For<IAdoIntegrationService>();
        _adoService = Substitute.For<IAdoService>();
        _userService = Substitute.For<IUserService>();
        _publisher = Substitute.For<IPublisher>();
        _controller = new DevInbox.Web.Features.GitHub.IntegrationsController(
            _gitHubIntegrationService,
            _adoIntegrationService,
            _adoService,
            _userService,
            _publisher);
        _userService.GetCurrentUserAsync().Returns(new User { Id = UserId, Email = Email, Password = "hashed" });
    }

    [Fact(DisplayName = "ConnectAdoPatAsync should delegate to the service and publish a full sync request")]
    public async Task ConnectAdoPatAsyncShouldPublishFullSyncRequestAsync()
    {
        var body = new ConnectPatRequest { Token = "ado_pat", ExpiresAt = DateTimeOffset.UtcNow.AddDays(14) };
        var expected = new IntegrationDto { Id = 7, Type = IntegrationType.Ado, Status = DevInbox.Web.Infrastructure.OpenApi.Generated.IntegrationStatus.ACTIVE };
        _adoIntegrationService.ConnectPatAsync(UserId, body.Token, body.ExpiresAt, Arg.Any<CancellationToken>()).Returns(expected);

        var result = await _controller.ConnectAdoPatAsync(body);

        Assert.Same(expected, result);
        await _adoIntegrationService.Received(1).ConnectPatAsync(UserId, body.Token, body.ExpiresAt, Arg.Any<CancellationToken>());
        await _publisher.Received(1).PublishAsync(Arg.Is<SyncRequestedEvent>(ev =>
            ev.UserId == UserId &&
            ev.Email == Email &&
            ev.ForceFullSync));
        await _publisher.DidNotReceive().Publish(Arg.Any<IntegrationDisconnectedEvent>(), Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "GetAdoOrganizationsAsync should delegate to the ADO service for the current user")]
    public async Task GetAdoOrganizationsAsyncShouldDelegateToServiceAsync()
    {
        _adoService.GetOrganizationsAsync(UserId, Arg.Any<CancellationToken>()).Returns(new List<string> { "contoso", "fabrikam" });

        var result = await _controller.GetAdoOrganizationsAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, o => o.Name == "contoso");
        Assert.Contains(result, o => o.Name == "fabrikam");
    }

    [Fact(DisplayName = "AddAdoOrganizationAsync should delegate to the ADO service and return the updated organization list")]
    public async Task AddAdoOrganizationAsyncShouldDelegateToServiceAsync()
    {
        var body = new AddAdoOrganizationRequest { OrganizationName = "contoso" };
        _adoService.AddOrganizationAsync(UserId, body.OrganizationName, Arg.Any<CancellationToken>()).Returns(new List<string> { "contoso" });

        var result = await _controller.AddAdoOrganizationAsync(body);

        Assert.Single(result);
        Assert.Equal("contoso", result.Single().Name);
        await _adoService.Received(1).AddOrganizationAsync(UserId, body.OrganizationName, Arg.Any<CancellationToken>());
    }

    [Fact(DisplayName = "DisconnectAdoAsync should delegate to the service and publish an ADO integration-disconnected event synchronously")]
    public async Task DisconnectAdoAsyncShouldPublishDisconnectedEventAsync()
    {
        await _controller.DisconnectAdoAsync();

        await _adoIntegrationService.Received(1).DisconnectAsync(UserId);
        await _publisher.Received(1).Publish(Arg.Is<IntegrationDisconnectedEvent>(ev =>
            ev.UserId == UserId &&
            ev.Source == DomainItemSource.Ado), Arg.Any<CancellationToken>());
        await _publisher.DidNotReceive().PublishAsync(Arg.Any<SyncRequestedEvent>(), Arg.Any<CancellationToken>());
    }
}
