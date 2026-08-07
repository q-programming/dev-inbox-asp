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
}