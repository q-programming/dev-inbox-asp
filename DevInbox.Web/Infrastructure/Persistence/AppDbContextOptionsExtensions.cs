namespace DevInbox.Web.Infrastructure.Persistence;

/// <summary>
/// Single source of truth for <see cref="AppDbContext"/> provider configuration: Npgsql with the
/// snake_case naming convention. Used by <c>Program.cs</c> for the real app and reused by tests
/// (pointed at a Testcontainers connection string) so both always share the exact same EF Core setup.
/// </summary>
public static class AppDbContextOptionsExtensions
{
    public static DbContextOptionsBuilder<AppDbContext> UseAppNpgsql(
        this DbContextOptionsBuilder<AppDbContext> builder,
        string? connectionString)
    {
        builder.UseNpgsql(connectionString);
        builder.UseSnakeCaseNamingConvention();
        return builder;
    }

    public static DbContextOptionsBuilder UseAppNpgsql(
        this DbContextOptionsBuilder builder,
        string? connectionString)
    {
        builder.UseNpgsql(connectionString);
        builder.UseSnakeCaseNamingConvention();
        return builder;
    }
}

