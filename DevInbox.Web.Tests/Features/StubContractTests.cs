using System.Net;
using System.Net.Http.Json;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Tests.Infrastructure;

namespace DevInbox.Web.Tests.Features;

/// <summary>
/// Contract tests for the stub/implemented controllers behind <see cref="DevInboxWebApplicationFactory"/>.
/// While an endpoint is not yet implemented it returns 501 (<see cref="Common.ServiceNotImplementedException"/>).
/// When you implement an endpoint, change its expected status code to the real one from api.yml
/// and update the DisplayName — that is how you "flip" the reverse-TDD signal.
/// Implements <see cref="IAsyncLifetime"/> to reset the shared factory's database before every test,
/// since <see cref="DevInboxWebApplicationFactory"/> is reused (one Postgres container) across all facts
/// in this class via <see cref="IClassFixture{TFixture}"/> — without this, data left behind by one test
/// (e.g. seeded inbox items) could leak into another and make results order-dependent/flaky.
/// </summary>
public class StubContractTests(DevInboxWebApplicationFactory factory)
    : IClassFixture<DevInboxWebApplicationFactory>, IAsyncLifetime
{
    private const string Password = "strongpassword123";

    private readonly HttpClient _client = factory.CreateClient();

    public Task InitializeAsync() => factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

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

    // ── Inbox (implemented) ───────────────────────────────────────────────────

    [Fact(DisplayName = "GET /api/inbox — implemented, returns 200 with an empty page for a new user")]
    public async Task GetInboxReturns200WithEmptyPageForNewUserAsync()
    {
        await RegisterAndLoginAsync();

        var response = await _client.GetAsync("/api/inbox");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InboxPage>();
        Assert.NotNull(body);
        Assert.Empty(body!.Items);
        Assert.Equal(0, body.TotalElements);
    }

    [Fact(DisplayName = "GET /api/inbox/item/{id} — implemented, returns 404 for an item that doesn't exist")]
    public async Task GetInboxItemReturns404WhenNotFoundAsync()
    {
        await RegisterAndLoginAsync();

        var response = await _client.GetAsync("/api/inbox/item/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "PUT /api/inbox/item/{id}/overlay — stub, expects 501 until implemented (target: 200)")]
    public async Task PutInboxOverlayReturns501UntilImplementedAsync()
    {
        var response = await _client.PutAsJsonAsync("/api/inbox/item/1/overlay", new { });
        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
    }

    // ── Notes (implemented write endpoints) ───────────────────────────────────

    [Fact(DisplayName = "POST /api/notes returns 404 for an unauthenticated request (cookie challenge target)")]
    public async Task PostNoteReturns404WithoutAuthenticatedUserAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/notes", new CreateNoteRequest
        {
            Title = "Test note",
            Body = "Body"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "POST /api/notes returns 200 for an authenticated user")]
    public async Task PostNoteReturns200ForAuthenticatedUserAsync()
    {
        await RegisterAndLoginAsync();

        var response = await _client.PostAsJsonAsync("/api/notes", new CreateNoteRequest
        {
            Title = "Test note",
            Body = "Body",
            Tags = ["todo"]
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<NoteDetail>();
        Assert.NotNull(body);
        Assert.Equal("Test note", body!.Title);
    }

    [Fact(DisplayName = "PUT /api/notes/{id} throws KeyNotFoundException when note does not exist")]
    public async Task PutNoteThrowsWhenNoteNotFoundAsync()
    {
        await RegisterAndLoginAsync();

        _ = await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _client.PutAsJsonAsync("/api/notes/999999", new CreateNoteRequest
            {
                Title = "Updated note",
                Body = "Body"
            }));
    }

    [Fact(DisplayName = "DELETE /api/notes/{id} throws KeyNotFoundException when note does not exist")]
    public async Task DeleteNoteThrowsWhenNoteNotFoundAsync()
    {
        await RegisterAndLoginAsync();

        _ = await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _client.DeleteAsync("/api/notes/999999"));
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

    // ── Sync (implemented) ────────────────────────────────────────────────────

    [Fact(DisplayName = "POST /api/sync/trigger — implemented, returns 200 for an authenticated user")]
    public async Task PostSyncTriggerReturns200ForAuthenticatedUserAsync()
    {
        await RegisterAndLoginAsync();

        var response = await _client.PostAsync("/api/sync/trigger", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
