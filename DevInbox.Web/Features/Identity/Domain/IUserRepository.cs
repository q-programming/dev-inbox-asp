namespace DevInbox.Web.Features.Identity.Domain;

public interface IUserRepository : IRepository<User>
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<User?> FindByEmailAsync(string email);
    Task<User?> FindByIdAsync(long id);
    Task<User?> FindByEmailWithGitHubProfileAsync(string email);
}
