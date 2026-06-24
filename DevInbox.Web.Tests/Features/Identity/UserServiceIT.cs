using DevInbox.Web.Features.Identity;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserServiceIT : IAsyncLifetime
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private const string StrongPassword = "strongpassword123";
    private AppDbContext _db = default!;
    private UserService _service = default!;

    public Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"users-{Guid.NewGuid()}")
            .Options;

        _db = new AppDbContext(options);
        _service = new UserService(new UserRepository(_db), Substitute.For<IHttpContextAccessor>());
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _ = await _db.Database.EnsureDeletedAsync();
        await _db.DisposeAsync();
    }

    [Fact(DisplayName = "LoginAsync integration should authenticate user and return mapped dto")]
    public async Task LoginAsyncShouldSucceedAsync()
    {
        var user = new User
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = BCrypt.Net.BCrypt.HashPassword(StrongPassword)
        };
        _ = await _db.Users.AddAsync(user);
        _ = await _db.SaveChangesAsync();

        var result = await _service.LoginAsync(new LoginRequest
        {
            Email = TestEmail,
            Password = StrongPassword
        });

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "RegisterAsync integration should persist user and return mapped dto")]
    public async Task RegisterAsyncShouldPersistUserAndReturnMappedDtoAsync()
    {
        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = "strongpassword123"
        };

        var result = await _service.RegisterAsync(request);

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);

        var persistedUser = await _db.Users.SingleAsync();
        Assert.Equal(TestEmail, persistedUser.Email);
        Assert.Equal(FirstName, persistedUser.FirstName);
        Assert.Equal(LastName, persistedUser.LastName);
    }
}
