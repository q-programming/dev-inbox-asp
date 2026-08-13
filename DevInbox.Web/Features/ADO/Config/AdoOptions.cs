namespace DevInbox.Web.Features.ADO.Config;

public class AdoOptions
{
    public const string SectionName = "ADO";

    public string BaseUrl { get; set; } = "https://dev.azure.com";
}