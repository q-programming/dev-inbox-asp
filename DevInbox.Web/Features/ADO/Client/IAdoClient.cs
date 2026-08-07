namespace DevInbox.Web.Features.ADO.Client;

public interface IAdoClient
{
    Task<string> GetWorkItemAsync(int workItemId);

}