using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;
using DomainDensity = DevInbox.Web.Features.Settings.Domain.Density;
using DomainTheme = DevInbox.Web.Features.Settings.Domain.Theme;
using DtoDensity = DevInbox.Web.Infrastructure.OpenApi.Generated.Density;
using DtoTheme = DevInbox.Web.Infrastructure.OpenApi.Generated.Theme;

namespace DevInbox.Web.Tests.Features.Settings;

/// <summary>
/// Unit tests for <see cref="SettingsController"/>.
/// <see cref="ISettingsService"/> is mocked — no database or mapping internals under test here,
/// only that the controller delegates correctly and maps the result via <c>SettingsMapper</c>.
/// Mirrors the structure of <c>UserControllerTests</c> in Features/Identity.
/// </summary>
public class SettingsControllerTests
{
    private const string TestEmail = "jan@example.com";

    private readonly ISettingsService _settingsService;
    private readonly SettingsController _controller;

    public SettingsControllerTests()
    {
        _settingsService = Substitute.For<ISettingsService>();
        _controller = new SettingsController(_settingsService);
    }

    private static UserSettings BuildUserSettings(DomainTheme theme = DomainTheme.Dark, DomainDensity density = DomainDensity.Tight, int fontSize = 16) => new()
    {
        Theme = theme,
        Density = density,
        FontSize = fontSize,
        User = new User { Email = TestEmail }
    };

    [Fact(DisplayName = "GetSettingsAsync should return a dto mapped from the service result")]
    public async Task GetSettingsAsyncShouldReturnMappedDtoAsync()
    {
        _settingsService.GetSettingsAsync().Returns(BuildUserSettings());

        var result = await _controller.GetSettingsAsync();

        Assert.Equal(DtoTheme.Dark, result.Theme);
        Assert.Equal(DtoDensity.Tight, result.Density);
        Assert.Equal(16, result.FontSize);
    }

    [Fact(DisplayName = "GetSettingsAsync should propagate exceptions raised by the service")]
    public async Task GetSettingsAsyncShouldPropagateServiceExceptionAsync()
    {
        _settingsService.GetSettingsAsync().Returns<UserSettings>(_ => throw new InvalidOperationException());

        await Assert.ThrowsAsync<InvalidOperationException>(() => _controller.GetSettingsAsync());
    }

    [Fact(DisplayName = "UpdateSettingsAsync should forward the request body to SaveSettings")]
    public async Task UpdateSettingsAsyncShouldForwardBodyToSaveSettingsAsync()
    {
        var body = new UserSettingsDto { Theme = DtoTheme.Light, Density = DtoDensity.Relaxed, FontSize = 18 };
        _settingsService.SaveSettingsAsync(Arg.Any<UserSettingsDto>()).Returns(BuildUserSettings());

        await _controller.UpdateSettingsAsync(body);

        await _settingsService.Received(1).SaveSettingsAsync(body);
    }

    [Fact(DisplayName = "UpdateSettingsAsync should return a dto mapped from the updated settings")]
    public async Task UpdateSettingsAsyncShouldReturnMappedDtoAsync()
    {
        _settingsService.SaveSettingsAsync(Arg.Any<UserSettingsDto>())
            .Returns(BuildUserSettings(DomainTheme.Light, DomainDensity.Relaxed, 18));

        var result = await _controller.UpdateSettingsAsync(new UserSettingsDto { Theme = DtoTheme.Light, Density = DtoDensity.Relaxed, FontSize = 18 });

        Assert.Equal(DtoTheme.Light, result.Theme);
        Assert.Equal(DtoDensity.Relaxed, result.Density);
        Assert.Equal(18, result.FontSize);
    }

    [Fact(DisplayName = "UpdateSettingsAsync should propagate exceptions raised by the service")]
    public async Task UpdateSettingsAsyncShouldPropagateServiceExceptionAsync()
    {
        _settingsService.SaveSettingsAsync(Arg.Any<UserSettingsDto>())
            .Returns<UserSettings>(_ => throw new InvalidOperationException());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _controller.UpdateSettingsAsync(new UserSettingsDto { Theme = DtoTheme.Light, Density = DtoDensity.Relaxed, FontSize = 18 }));
    }
}
