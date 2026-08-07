using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes;
using DevInbox.Web.Features.Notes.Mapper;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Inbox.Details;

public sealed class InboxDetailService(
    IEnumerable<IInboxDetailProvider> providers, INotesService notesService, ILogger<InboxDetailService> logger)
    : IInboxDetailService, IService
{
    private readonly Dictionary<Domain.ItemSource, IInboxDetailProvider> _providers =
        providers.ToDictionary(x => x.Source);
    private readonly NotesMapper _notesMapper = new();

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

        // A note attached to another item (GitHub PR, ADO work item, ...) isn't the item itself, so it
        // doesn't belong to any per-source provider — surface it separately regardless of item.Source.
        // (Notes attached to other notes aren't supported, so skip Source == Note.)
        if (item.Source != Domain.ItemSource.Note)
        {
            var attachedNote = await notesService.GetAttachedNoteAsync(item.Id);
            if (attachedNote is not null)
            {
                dto.AttachedNote = _notesMapper.ToDetail(attachedNote);
            }
        }
    }
}
