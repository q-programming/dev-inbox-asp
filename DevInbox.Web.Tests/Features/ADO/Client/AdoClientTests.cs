using System.Net;
using System.Net.Http.Headers;
using System.Text;
using DevInbox.Web.Features.ADO.Client;
using Microsoft.Extensions.DependencyInjection;
using RichardSzalay.MockHttp;

namespace DevInbox.Web.Tests.Features.ADO.Client;

/// <summary>
/// Tests for <see cref="AdoClient"/> PAT profile validation calls.
/// HTTP is intercepted via <see cref="MockHttpMessageHandler"/> wired into a real <see cref="HttpClient"/>.
/// </summary>
public class AdoClientTests
{
    private const string BaseUrl = "https://dev.azure.com/organization/";
    private const string ProfileEndpoint = "https://dev.azure.com/organization/_apis/profile/profiles/me?api-version=7.0";
    private const string Pat = "ado_pat_123";

    private readonly MockHttpMessageHandler _mockHttp;
    private readonly AdoClient _client;

    public AdoClientTests()
    {
        _mockHttp = new MockHttpMessageHandler();
        var httpClient = _mockHttp.ToHttpClient();
        httpClient.BaseAddress = new Uri(BaseUrl);
        _client = new AdoClient(httpClient);
    }

    [Fact(DisplayName = "GetCurrentUserProfileAsync should return the deserialized ADO profile and send Basic auth with empty username")]
    public async Task GetCurrentUserProfileAsyncShouldReturnProfileAndSendBasicAuthAsync()
    {
        AuthenticationHeaderValue? authorization = null;

        _mockHttp.When(HttpMethod.Get, ProfileEndpoint)
            .Respond(request =>
            {
                authorization = request.Headers.Authorization;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                        {
                          "id": "ado-user-1",
                          "displayName": "Jane Doe",
                          "emailAddress": "jane@example.com",
                          "avatar": {
                            "value": "https://example.com/avatar.png",
                            "size": "medium"
                          },
                          "descriptor": "aad.123"
                        }
                        """, Encoding.UTF8, "application/json")
                };
            });

        var result = await _client.GetCurrentUserProfileAsync(Pat);

        Assert.NotNull(authorization);
        Assert.Equal("Basic", authorization!.Scheme);
        Assert.Equal(Convert.ToBase64String(Encoding.ASCII.GetBytes($":{Pat}")), authorization.Parameter);
        Assert.Equal("ado-user-1", result.Id);
        Assert.Equal("Jane Doe", result.DisplayName);
        Assert.Equal("jane@example.com", result.EmailAddress);
        Assert.NotNull(result.Avatar);
        Assert.Equal("https://example.com/avatar.png", result.Avatar.Value);
        Assert.Equal("medium", result.Avatar.Size);
        Assert.Equal("aad.123", result.Descriptor);
    }

    [Fact(DisplayName = "GetCurrentUserProfileAsync should throw HttpRequestException when ADO returns non-success status")]
    public async Task GetCurrentUserProfileAsyncShouldThrowOnNonSuccessStatusAsync()
    {
        _mockHttp.When(HttpMethod.Get, ProfileEndpoint)
            .Respond(HttpStatusCode.Unauthorized);

        await Assert.ThrowsAsync<HttpRequestException>(() => _client.GetCurrentUserProfileAsync(Pat));
    }

    [Fact(DisplayName = "GetCurrentUserProfileAsync should throw InvalidOperationException when ADO returns an empty profile body")]
    public async Task GetCurrentUserProfileAsyncShouldThrowOnNullResponseBodyAsync()
    {
        _mockHttp.When(HttpMethod.Get, ProfileEndpoint)
            .Respond("application/json", "null");

        await Assert.ThrowsAsync<InvalidOperationException>(() => _client.GetCurrentUserProfileAsync(Pat));
    }
}
