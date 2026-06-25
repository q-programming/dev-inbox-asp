using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Infrastructure.Persistence.Exceptions;

namespace DevInbox.Web.Infrastructure.Persistence;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<bool> ExistsByEmailAsync(string email)
    {
        return db.Users.AnyAsync(u => u.Email == email);
    }

    public async Task AddAsync(User user)
    {
        db.Users.Add(user);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) when (ex.IsUniqueConstraintViolation())
        {
            throw new UserAlreadyExistsException(user.Email);
        }
    }

    public Task<User?> FindByEmailAsync(string email)
    {
        return db.Users.SingleOrDefaultAsync(u => u.Email == email);
    }
}
