using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.SavedViews;

public class SavedViewsController : ISavedViewsBaseController, IComponent
{
    public Task<ICollection<SavedViewDto>> ListSavedViewsAsync()
    {
        throw new ServiceNotImplementedException();
    }

    public Task<SavedViewDto> CreateSavedViewAsync(CreateSavedViewRequest body)
    {
        throw new ServiceNotImplementedException();
    }
}
