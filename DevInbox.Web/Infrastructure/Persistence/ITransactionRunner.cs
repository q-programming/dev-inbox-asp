namespace DevInbox.Web.Infrastructure.Persistence;

/// <summary>
/// Runs an operation inside a single database transaction (comparable to Spring's <c>@Transactional</c>).
/// Every scoped repository shares the same <see cref="AppDbContext"/>, so all their saves —
/// including those made by synchronously published event handlers — join the transaction.
/// </summary>
public interface ITransactionRunner
{
    /// <summary>Commits when <paramref name="action"/> completes; rolls back if it throws.</summary>
    Task ExecuteAsync(Func<Task> action, CancellationToken cancellationToken = default);
}
