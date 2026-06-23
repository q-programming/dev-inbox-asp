using DevInbox.Web.Features.Identity;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserServiceIT : IAsyncLifetime
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private AppDbContext _db = default!;
    private UserService _service = default!;

    public Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"users-{Guid.NewGuid()}")
            .Options;

        _db = new AppDbContext(options);
        _service = new UserService(new UserRepository(_db));
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _ = await _db.Database.EnsureDeletedAsync();
        await _db.DisposeAsync();
    }

    [Fact(DisplayName = "RegisterAsync integration should persist user and return mapped dto")]
    public async Task RegisterAsyncShouldPersistUserAndReturnMappedDtoAsync()
    {
        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
        };

        var result = await _service.RegisterAsync(request);

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
        Assert.NotNull(result.Integrations);
        Assert.Empty(result.Integrations);

        var persistedUser = await _db.Users.SingleAsync();
        Assert.Equal(TestEmail, persistedUser.Email);
        Assert.Equal(FirstName, persistedUser.FirstName);
        Assert.Equal(LastName, persistedUser.LastName);
    }
}
