using System.Net.Http.Headers;
using System.Text;
using DevInbox.Web.Features.ADO.Client.DTO;

namespace DevInbox.Web.Features.ADO.Client;

public class AdoClient(HttpClient client) : IAdoClient, IService
{
    public async Task<string> GetWorkItemAsync(int workItemId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/_apis/wit/workitems/{workItemId}?api-version=7.0");
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }

    public async Task<AdoUserProfileDTO> GetCurrentUserProfileAsync(string personalAccessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "_apis/profile/profiles/me?api-version=7.0");
        // Azure DevOps PATs authenticate via HTTP Basic auth with an empty username and the PAT as
        // the password — there is no bearer-token scheme for PATs.
        var basicAuthValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{personalAccessToken}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuthValue);

        using var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<AdoUserProfileDTO>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Azure DevOps returned an empty user profile.");
    }
}