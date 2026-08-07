using DevInbox.Web.Features.Audit.Domain;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Features.Notes.Domain;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.Security;

namespace DevInbox.Web.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, EncryptionService encryption) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
    public DbSet<GitHubProfile> GitHubProfiles => Set<GitHubProfile>();
    public DbSet<Inbox> Inboxes => Set<Inbox>();
    public DbSet<InboxItem> InboxItems => Set<InboxItem>();
    public DbSet<InboxItemState> InboxItemStates => Set<InboxItemState>();
    public DbSet<Note> Notes => Set<Note>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostgreSQL 9.x does not support IDENTITY columns — use serial (sequences) instead
        modelBuilder.UseSerialColumns();

        var encryptedString = new EncryptedStringConverter(encryption);
        modelBuilder.Entity<User>(entity =>
        {
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
        modelBuilder.Entity<GitHubProfile>(entity =>
        {
            entity.Property(profile => profile.AccessToken).HasConversion(encryptedString);
        });
        modelBuilder.Entity<Inbox>(entity =>
        {
            entity.Property(inbox => inbox.SyncStatus).HasConversion<string>();
        });
        modelBuilder.Entity<InboxItem>(entity =>
        {
            entity.Property(inbox => inbox.Type).HasConversion<string>();
            entity.Property(inbox => inbox.Source).HasConversion<string>();
            entity.Property(inbox => inbox.Reason).HasConversion<string>();
            entity.Property(inbox => inbox.Title).HasConversion(encryptedString);
        });
        modelBuilder.Entity<Note>(entity =>
        {
            // AttachedToInboxItemId needs this: there's no data-annotation equivalent for delete
            // behavior. Without it, the convention default (ClientSetNull) only nullifies the FK for
            // notes already loaded into the context — a bulk/untracked delete of the target InboxItem
            // (e.g. during resync) would otherwise hit a FK constraint violation instead of orphaning
            // the note gracefully.
            entity.HasOne(note => note.AttachedToInboxItem)
                .WithMany()
                .HasForeignKey(note => note.AttachedToInboxItemId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.Property(note => note.Title).HasConversion(encryptedString);
            entity.Property(note => note.Body).HasConversion(encryptedString);
        });

        base.OnModelCreating(modelBuilder);
    }
}
