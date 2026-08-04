using DevInbox.Web.Infrastructure.Events;

namespace DevInbox.Web.Features.Identity.Events;

public record UserLoggedOutEvent(long UserId, string Email) : IEvent
{
}
