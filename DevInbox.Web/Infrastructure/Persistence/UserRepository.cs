using DevInbox.Web.Features.Identity;

namespace DevInbox.Web.Infrastructure.Persistence;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<bool> ExistsByEmailAsync(string email)
    {
        return db.Users.AnyAsync(existingUser => existingUser.Email == email);
    }

    public async Task AddAsync(User user)
    {
        _ = db.Users.Add(user);
        _ = await db.SaveChangesAsync();
    }

    public async Task<User?> FindByEmailAsync(string email)
    {
        return await db.Users.SingleOrDefaultAsync(existingUser => existingUser.Email == email);
    }
}
