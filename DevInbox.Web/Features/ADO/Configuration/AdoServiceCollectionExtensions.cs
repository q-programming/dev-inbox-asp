using DevInbox.Web.Features.ADO.Client;
namespace DevInbox.Web.Features.ADO.Configuration;

public static class AdoServiceCollectionExtensions
{
    public static IServiceCollection AddAdoClient(this IServiceCollection services, IConfiguration configuration)
    {
        var adoSection = configuration.GetSection("ADO");
        var adoOptions = adoSection.Get<AdoOptions>()
            ?? throw new InvalidOperationException("ADO configuration section is missing.");
        _ = services.Configure<AdoOptions>(adoSection);
        services.AddHttpClient<IAdoClient, AdoClient>("ado", (sp, client) =>
        {
            client.BaseAddress = new Uri(adoOptions.BaseUrl);
        }).AddStandardResilienceHandler();
        return services;
    }
}