using DevInbox.Web.Features.ADO.Client;

namespace DevInbox.Web.Features.ADO.Config;

public static class AdoServiceCollectionExtensions
{
    public static IServiceCollection AddAdoClient(this IServiceCollection services, IConfiguration configuration)
    {
        var adoSection = configuration.GetSection(AdoOptions.SectionName);
        var adoOptions = adoSection.Get<AdoOptions>()
            ?? throw new InvalidOperationException("ADO configuration section is missing.");
        _ = services.Configure<AdoOptions>(adoSection);
        services.AddHttpClient<IAdoClient, AdoClient>("ado", (sp, client) =>
        {
            client.BaseAddress = new Uri(adoOptions.NormalizedBaseAddress);
        }).AddStandardResilienceHandler();
        services.AddHttpClient(AdoClient.AccountsHttpClientName, (sp, client) =>
        {
            client.BaseAddress = new Uri(adoOptions.NormalizedAccountsBaseAddress);
        }).AddStandardResilienceHandler();
        return services;
    }
}