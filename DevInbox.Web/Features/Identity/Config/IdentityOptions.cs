namespace DevInbox.Web.Features.Identity.Config;

public class IdentityOptions
{
    public const string SectionName = "Identity";

    public bool RequireConfirmedAccount { get; set; }
    public bool UseMockData { get; set; }
}