namespace DevInbox.Web.Features.ADO.Config;

public class AdoOptions
{
    public const string SectionName = "ADO";

    /// <summary>
    /// Azure DevOps API base address. A trailing slash is enforced (see
    /// <see cref="NormalizedBaseAddress"/>) since HttpClient's relative-URI combining drops the
    /// base's last path segment when it doesn't end in "/" — without this, a mock BaseUrl like
    /// "http://localhost:8089/ado" would silently lose the "/ado" prefix on every relative request.
    /// </summary>
    public string BaseUrl { get; set; } = "https://dev.azure.com";

    /// <summary><see cref="BaseUrl"/> guaranteed to end with "/" so relative paths append correctly.</summary>
    public string NormalizedBaseAddress => BaseUrl.EndsWith('/') ? BaseUrl : $"{BaseUrl}/";
}