namespace DevInbox.Web.Features.Identity;

public interface IUserRepository : IService
{
    Task<bool> ExistsByEmailAsync(string email);
    Task AddAsync(User user);
}
