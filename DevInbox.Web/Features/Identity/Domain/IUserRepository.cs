namespace DevInbox.Web.Features.Identity.Domain;

public interface IUserRepository : IService
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<User?> FindByEmailAsync(string email);
    Task AddAsync(User user);
}
