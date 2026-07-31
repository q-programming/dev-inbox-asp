using System.Net.Http.Headers;
using DevInbox.Web.Features.GitHub.Client.DTO;

namespace DevInbox.Web.Features.GitHub.Client;

public class GitHubClient(HttpClient client) : IGitHubClient, IService
{
    public async Task<(GitHubUserProfileDTO Profile, string AccessToken)> GetCurrentUserAsync(string accessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/user");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var profile = await response.Content.ReadFromJsonAsync<GitHubUserProfileDTO>(cancellationToken: ct)
            ?? throw new InvalidOperationException("GitHub returned empty user profile.");

        return (profile, accessToken);
    }

    public Task SearchPullRequestsAsync(string accessToken, string query, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
