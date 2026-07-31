using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Infrastructure.Persistence;
using DevInbox.Web.Infrastructure.Persistence.Exceptions;

namespace DevInbox.Web.Features.Identity.Domain;

public class UserRepository(AppDbContext db) : Repository<User>(db), IUserRepository
{
    public Task<bool> ExistsByEmailAsync(string email)
    {
        return db.Users.AnyAsync(u => u.Email == email);
    }

    public override async Task AddAsync(User user)
    {
        try { await base.AddAsync(user); }
        catch (DbUpdateException ex) when (ex.IsUniqueConstraintViolation())
        {
            throw new UserAlreadyExistsException(user.Email);
        }
    }

    public Task<User?> FindByEmailAsync(string email)
    {
        return db.Users.SingleOrDefaultAsync(u => u.Email == email);
    }

    public Task<User?> FindByEmailWithGitHubProfileAsync(string email)
    {
        return db.Users.Include(u => u.GitHubProfile).SingleOrDefaultAsync(u => u.Email == email);
    }

    public Task<User?> FindByIdAsync(long id)
    {
        return db.Users.SingleOrDefaultAsync(u => u.Id == id);
    }
}
