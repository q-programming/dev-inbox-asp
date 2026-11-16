namespace DevInbox.Web.Infrastructure.Persistence;

public sealed class TransactionRunner(AppDbContext db) : ITransactionRunner, IService
{
    public async Task ExecuteAsync(Func<Task> action, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await action();
        await transaction.CommitAsync(cancellationToken);
    }
}
