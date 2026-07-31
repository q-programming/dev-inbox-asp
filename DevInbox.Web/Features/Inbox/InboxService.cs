
using System.Security.Claims;
using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Features.Inbox;

public class InboxService(IInboxRepository inboxRepository, IHttpContextAccessor httpContextAccessor) : IInboxService, IService
{
    public async Task<Domain.Inbox> GetUserInboxAsync()
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userIdClaim)
            ? throw new NotFoundException("User ID claim not found in the current context.")
            : await GetUserInboxAsync(long.Parse(userIdClaim));
    }

    public async Task<Domain.Inbox> GetUserInboxAsync(long userId)
    {
        var inbox = await inboxRepository.GetByIdAsync(userId) ?? throw new NotFoundException($"Inbox not found for user {userId}");
        return inbox;
    }

    public async Task UpdateAsync(Domain.Inbox inbox)
    {
        await inboxRepository.UpdateAsync(inbox);
    }
}
