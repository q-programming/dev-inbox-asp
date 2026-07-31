using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.Security;

namespace DevInbox.Web.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, EncryptionService encryption) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostgreSQL 9.x does not support IDENTITY columns — use serial (sequences) instead
        modelBuilder.UseSerialColumns();

        var encryptedString = new EncryptedStringConverter(encryption);
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.GitHubAccessToken).HasConversion(encryptedString);
            entity.Property(user => user.Type).HasConversion<string>();
            entity.Property(user => user.Type).HasConversion<string>();

        });
        modelBuilder.Entity<UserSettings>(entity =>
        {
            entity.Property(setting => setting.Theme).HasConversion<string>();
            entity.Property(setting => setting.Density).HasConversion<string>();
        });
        modelBuilder.Entity<AuditEntry>(entity =>
        {
            entity.Property(audit => audit.EventType).HasConversion<string>();
        });

        base.OnModelCreating(modelBuilder);
    }
}
