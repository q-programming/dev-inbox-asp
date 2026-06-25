using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Infrastructure.Security;

namespace DevInbox.Web.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, EncryptionService encryption) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostgreSQL 9.x does not support IDENTITY columns — use serial (sequences) instead
        modelBuilder.UseSerialColumns();

        var encryptedString = new EncryptedStringConverter(encryption);
        modelBuilder.Entity<User>()
            .Property(user => user.GitHubAccessToken)
            .HasConversion(encryptedString);

        base.OnModelCreating(modelBuilder);
    }
}