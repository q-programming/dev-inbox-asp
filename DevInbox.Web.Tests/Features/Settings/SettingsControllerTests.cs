using DevInbox.Web.Features.Settings;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Settings;

/// <summary>
/// Unit tests for <see cref="SettingsController"/>.
/// <see cref="ISettingsService"/> is mocked — no database or mapping internals under test here,
/// only that the controller delegates correctly and maps the result via <c>SettingsMapper</c>.
/// Mirrors the structure of <c>UserControllerTests</c> in Features/Identity.
/// </summary>
public class SettingsControllerTests
{
    private readonly ISettingsService _settingsService;
    private readonly SettingsController _controller;

    public SettingsControllerTests()
    {
        _settingsService = Substitute.For<ISettingsService>();
        _controller = new SettingsController(_settingsService);
    }

    [Fact(DisplayName = "GetSettingsAsync should return a dto mapped from the service result")]
    public Task GetSettingsAsyncShouldReturnMappedDtoAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "UpdateSettingsAsync should forward the request body to SaveSettings")]
    public Task UpdateSettingsAsyncShouldForwardBodyToSaveSettingsAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "UpdateSettingsAsync should return a dto mapped from the updated settings")]
    public Task UpdateSettingsAsyncShouldReturnMappedDtoAsync() => throw new NotImplementedException();
}
