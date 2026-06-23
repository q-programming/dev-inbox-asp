using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.SavedViews;

public class SavedViewsController : ISavedViewsBaseController, IComponent
{
    public Task<System.Collections.Generic.ICollection<SavedViewDto>> ListSavedViewsAsync()
        => throw new NotImplementedException();

    public Task<SavedViewDto> CreateSavedViewAsync(CreateSavedViewRequest body)
        => throw new NotImplementedException();
}
