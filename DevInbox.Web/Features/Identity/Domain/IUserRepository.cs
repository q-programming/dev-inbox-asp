namespace DevInbox.Web.Features.Identity.Domain;

public interface IUserRepository : IRepository<User>
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<User?> FindByEmailAsync(string email);
}
