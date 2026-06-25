using DevInbox.Web.Features.Identity.Domain;

namespace DevInbox.Web.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PostgreSQL 9.x does not support IDENTITY columns — use serial (sequences) instead
        modelBuilder.UseSerialColumns();
        base.OnModelCreating(modelBuilder);
    }
}