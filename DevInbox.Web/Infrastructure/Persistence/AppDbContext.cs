using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.Security;

namespace DevInbox.Web.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, EncryptionService encryption) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostgreSQL 9.x does not support IDENTITY columns — use serial (sequences) instead
        modelBuilder.UseSerialColumns();

        var encryptedString = new EncryptedStringConverter(encryption);
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.GitHubAccessToken).HasConversion(encryptedString);
            entity.Property(user => user.Type).HasConversion<string>();

        });
        modelBuilder.Entity<UserSettings>(entity =>
        {
            entity.Property(s => s.Theme).HasConversion<string>();
            entity.Property(s => s.Density).HasConversion<string>();
        });

        base.OnModelCreating(modelBuilder);
    }
}