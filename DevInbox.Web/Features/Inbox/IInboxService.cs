
namespace DevInbox.Web.Features.Inbox;

public interface IInboxService
{
    Task<Domain.Inbox> GetUserInboxAsync();
    Task<Domain.Inbox> GetUserInboxAsync(long userId);
    Task UpdateAsync(Domain.Inbox inbox);
}
