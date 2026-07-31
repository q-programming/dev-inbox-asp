using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Details;

public sealed class InboxDetailService(
    IEnumerable<IInboxDetailProvider> providers, ILogger<InboxDetailService> logger)
    : IInboxDetailService, IService
{
    private readonly Dictionary<Domain.ItemSource, IInboxDetailProvider> _providers =
        providers.ToDictionary(x => x.Source);

    public async Task PopulateAsync(
        InboxItem item,
        InboxItemDetail dto,
        CancellationToken cancellationToken = default)
    {
        if (!_providers.TryGetValue(item.Source, out var provider))
        {
            logger.LogError($"No detail provider registered for '{item.Source}'.");
            return;
        }

        await provider.PopulateAsync(
            item,
            dto,
            cancellationToken);
    }
}
