using System.Net;
using System.Net.Http.Json;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Tests.Infrastructure;

namespace DevInbox.Web.Tests.Features;

/// <summary>
/// Contract tests for stub controllers.
/// While an endpoint is not yet implemented it returns 500 (NotImplementedException).
/// When you implement an endpoint, change its expected status code to the real one from api.yml
/// and update the DisplayName — that is how you "flip" the reverse-TDD signal.
/// </summary>
public class StubContractTests(DevInboxWebApplicationFactory factory)
    : IClassFixture<DevInboxWebApplicationFactory>
{
    private const string Password = "strongpassword123";

    private readonly HttpClient _client = factory.CreateClient();

    /// <summary>
    /// Registers a unique user and logs in, leaving the jwt HttpOnly cookie set on <see cref="_client"/>
    /// for subsequent authenticated requests.
    /// </summary>
    private async Task RegisterAndLoginAsync()
    {
        var email = $"{Guid.NewGuid()}@example.com";

        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = Password,
            FirstName = "Jan",
            LastName = "Kowalski"
        });

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password });
        loginResponse.EnsureSuccessStatusCode();
    }

    // ── Health (implemented) ─────────────────────────────────────────────────

    [Fact(DisplayName = "GET /api/healthz returns 200 with UP status")]
    public async Task GetHealthzReturns200WithUpStatus()
    {
        var response = await _client.GetAsync("/api/healthz");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("UP", body!["status"]);
    }

    // ── Inbox (not yet implemented — target: 200) ────────────────────────────

    [Fact(DisplayName = "GET /api/inbox — stub, expects 501 until implemented (target: 200)")]
    public async Task GetInboxReturns500UntilImplemented()
    {
        var response = await _client.GetAsync("/api/inbox");
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    [Fact(DisplayName = "GET /api/inbox/{id} — stub, expects 501 until implemented (target: 200)")]
    public async Task GetInboxItemReturns500UntilImplemented()
    {
        var response = await _client.GetAsync($"/api/inbox/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    [Fact(DisplayName = "PUT /api/inbox/{id}/overlay — stub, expects 501 until implemented (target: 200)")]
    public async Task PutInboxOverlayReturns500UntilImplemented()
    {
        var response = await _client.PutAsJsonAsync($"/api/inbox/{Guid.NewGuid()}/overlay", new { });
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    // ── Notes (not yet implemented — target: 200/201/204) ────────────────────

    [Fact(DisplayName = "GET /api/notes — stub, expects 501 until implemented (target: 200)")]
    public async Task GetNotesReturns500UntilImplemented()
    {
        var response = await _client.GetAsync("/api/notes");
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    [Fact(DisplayName = "POST /api/notes — stub, expects 501 until implemented (target: 201)")]
    public async Task PostNoteReturns500UntilImplemented()
    {
        var response = await _client.PostAsJsonAsync("/api/notes", new { title = "Test", content = "Body" });
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    [Fact(DisplayName = "PUT /api/notes/{id} — stub, expects 501 until implemented (target: 200)")]
    public async Task PutNoteReturns500UntilImplemented()
    {
        var response = await _client.PutAsJsonAsync($"/api/notes/{Guid.NewGuid()}", new { title = "Updated", content = "Body" });
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    [Fact(DisplayName = "DELETE /api/notes/{id} — stub, expects 501 until implemented (target: 204)")]
    public async Task DeleteNoteReturns500UntilImplemented()
    {
        var response = await _client.DeleteAsync($"/api/notes/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    // ── Saved Views (not yet implemented — target: 200/201) ──────────────────

    [Fact(DisplayName = "GET /api/saved-views — stub, expects 501 until implemented (target: 200)")]
    public async Task GetSavedViewsReturns500UntilImplemented()
    {
        var response = await _client.GetAsync("/api/saved-views");
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    [Fact(DisplayName = "POST /api/saved-views — stub, expects 501 until implemented (target: 201)")]
    public async Task PostSavedViewReturns500UntilImplemented()
    {
        var response = await _client.PostAsJsonAsync("/api/saved-views", new { name = "My View", filterJson = "{}" });
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    // ── Settings (implemented) ────────────────────────────────────────────────

    [Fact(DisplayName = "GET /api/settings — implemented, returns 401 without an authenticated user")]
    public async Task GetSettingsReturns401WithoutAuthenticatedUser()
    {
        var response = await _client.GetAsync("/api/settings");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact(DisplayName = "PUT /api/settings — returns 401 without an authenticated user")]
    public async Task PutSettingsReturns401WithoutAuthenticatedUser()
    {
        var response = await _client.PutAsJsonAsync("/api/settings", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact(DisplayName = "GET /api/settings — returns default settings for an authenticated user")]
    public async Task GetSettingsReturns200WithDefaultSettingsForAuthenticatedUserAsync()
    {
        await RegisterAndLoginAsync();

        var response = await _client.GetAsync("/api/settings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<UserSettingsDto>();
        Assert.NotNull(body);
        Assert.Equal(Theme.Light, body!.Theme);
        Assert.Equal(Density.Relaxed, body.Density);
    }

    [Fact(DisplayName = "PUT /api/settings — persists and returns updated settings for an authenticated user")]
    public async Task PutSettingsReturns200WithUpdatedSettingsForAuthenticatedUserAsync()
    {
        await RegisterAndLoginAsync();

        var response = await _client.PutAsJsonAsync("/api/settings", new UserSettingsDto
        {
            Theme = Theme.Dark,
            Density = Density.Tight,
            FontSize = 20
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<UserSettingsDto>();
        Assert.NotNull(body);
        Assert.Equal(Theme.Dark, body!.Theme);
        Assert.Equal(Density.Tight, body.Density);
        Assert.Equal(20, body.FontSize);
    }

    // ── Sync (not yet implemented — target: 202) ─────────────────────────────

    [Fact(DisplayName = "POST /api/sync/trigger — stub, expects 501 until implemented (target: 202)")]
    public async Task PostSyncTriggerReturns500UntilImplemented()
    {
        var response = await _client.PostAsync("/api/sync/trigger", null);
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }
}
