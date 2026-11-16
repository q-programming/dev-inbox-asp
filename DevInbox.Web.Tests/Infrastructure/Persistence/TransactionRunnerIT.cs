using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevInbox.Web.Tests.Infrastructure.Persistence;

public class TransactionRunnerIT : DatabaseIntegrationTest
{
    private const string FirstEmail = "a@example.com";
    private const string Boom = "boom";

    private TransactionRunner _runner = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        _runner = new TransactionRunner(DataBase);
    }

    [Fact(DisplayName = "ExecuteAsync should commit all changes saved by the action")]
    public async Task ExecuteAsyncShouldCommitAsync()
    {
        await _runner.ExecuteAsync(async () =>
        {
            DataBase.Users.Add(new User { Email = FirstEmail, Password = "x" });
            await DataBase.SaveChangesAsync();
            DataBase.Users.Add(new User { Email = "b@example.com", Password = "x" });
            await DataBase.SaveChangesAsync();
        });

        await using var other = BuildDbContext();
        Assert.Equal(2, await other.Users.CountAsync());
    }

    [Fact(DisplayName = "ExecuteAsync should roll back every save and rethrow when the action throws")]
    public async Task ExecuteAsyncShouldRollBackOnExceptionAsync()
    {
        var thrown = await Assert.ThrowsAsync<InvalidOperationException>(() => _runner.ExecuteAsync(async () =>
        {
            DataBase.Users.Add(new User { Email = FirstEmail, Password = "x" });
            await DataBase.SaveChangesAsync();
            throw new InvalidOperationException(Boom);
        }));

        Assert.Equal(Boom, thrown.Message);
        await using var other = BuildDbContext();
        Assert.Equal(0, await other.Users.CountAsync());
    }

    [Fact(DisplayName = "ExecuteAsync should roll back earlier saves when a later save violates a constraint")]
    public async Task ExecuteAsyncShouldRollBackOnConstraintViolationAsync()
    {
        await Assert.ThrowsAsync<DbUpdateException>(() => _runner.ExecuteAsync(async () =>
        {
            DataBase.Users.Add(new User { Email = FirstEmail, Password = "x" });
            await DataBase.SaveChangesAsync();
            DataBase.Users.Add(new User { Email = FirstEmail, Password = "y" });
            await DataBase.SaveChangesAsync();
        }));

        await using var other = BuildDbContext();
        Assert.Equal(0, await other.Users.CountAsync());
    }

    [Fact(DisplayName = "ExecuteAsync should make bulk deletes part of the transaction too")]
    public async Task ExecuteAsyncShouldRollBackBulkDeletesAsync()
    {
        DataBase.Users.Add(new User { Email = "keep@example.com", Password = "x" });
        await DataBase.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _runner.ExecuteAsync(async () =>
        {
            await DataBase.Users.ExecuteDeleteAsync();
            throw new InvalidOperationException(Boom);
        }));

        await using var other = BuildDbContext();
        Assert.Equal(1, await other.Users.CountAsync());
    }
}
