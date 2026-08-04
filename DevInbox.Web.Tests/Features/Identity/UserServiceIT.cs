using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserServiceIT : DatabaseIntegrationTest
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private const string StrongPassword = "strongpassword123";

    private UserService _service = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        _service = new UserService(new UserRepository(DataBase), Substitute.For<IHttpContextAccessor>(), Substitute.For<ILogger<UserService>>(), Substitute.For<IPublisher>());
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
        await DataBase.Users.AddAsync(user);
        await DataBase.SaveChangesAsync();

        var result = await _service.LoginAsync(new LoginRequest { Email = TestEmail, Password = StrongPassword });

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "RegisterAsync integration should persist user and return mapped dto")]
    public async Task RegisterAsyncShouldPersistUserAndReturnMappedDtoAsync()
    {
        var result = await _service.RegisterAsync(new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        });

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);

        var persisted = await DataBase.Users.SingleAsync();
        Assert.Equal(TestEmail, persisted.Email);
        Assert.Equal(FirstName, persisted.FirstName);
        Assert.Equal(LastName, persisted.LastName);
    }
}
