using Npgsql;

namespace DevInbox.Web.Infrastructure.Persistence.Exceptions;

internal static class DbUpdateExceptionExtensions
{
    private const string UniqueViolationCode = "23505";

    /// <summary>
    /// Returns true when the exception wraps a PostgreSQL unique-constraint violation (SQLSTATE 23505).
    /// Use in a catch filter: catch (DbUpdateException ex) when (ex.IsUniqueConstraintViolation())
    /// </summary>
    internal static bool IsUniqueConstraintViolation(this DbUpdateException ex)
        => ex.InnerException is PostgresException pg && pg.SqlState == UniqueViolationCode;
}
