using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Tests.Infrastructure.Persistence;

public class UserRepositoryConstraintIT : DatabaseIntegrationTest
{
    private const string DuplicateEmail = "duplicate@example.com";

    [Fact(DisplayName = "AddAsync should throw UserAlreadyExistsException on sequential duplicate email insert")]
    public async Task AddAsyncShouldThrowOnSequentialDuplicateEmailAsync()
    {
        await using var db = BuildDbContext();
        var repository = new UserRepository(db);

        await repository.AddAsync(new User { Email = DuplicateEmail, FirstName = "Jan" });

        await Assert.ThrowsAsync<UserAlreadyExistsException>(() =>
            repository.AddAsync(new User { Email = DuplicateEmail, FirstName = "Kuba" }));
    }

    [Fact(DisplayName = "AddAsync should throw UserAlreadyExistsException when two users with the same email are inserted concurrently")]
    public async Task AddAsyncShouldThrowOnConcurrentDuplicateEmailAsync()
    {
        async Task<Exception?> TryInsert(string firstName)
        {
            try
            {
                await using var db = BuildDbContext();
                await new UserRepository(db).AddAsync(new User { Email = DuplicateEmail, FirstName = firstName });
                return null;
            }
            catch (Exception ex) { return ex; }
        }

        var results = await Task.WhenAll(TryInsert("Jan"), TryInsert("Kuba"));

        var exceptions = results.Where(e => e is not null).ToList();
        Assert.Single(exceptions);
        Assert.IsType<UserAlreadyExistsException>(exceptions[0]);
    }
}
