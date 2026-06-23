using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserServiceTests
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private readonly IUserRepository _users;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _users = Substitute.For<IUserRepository>();
        _service = new UserService(_users);
    }

    [Fact(DisplayName = "RegisterAsync should normalize email, map dto, and persist user")]
    public async Task RegisterAsyncShouldMapUserAndPersistViaRepositoryAsync()
    {
        _ = _users.ExistsByEmailAsync(TestEmail).Returns(false);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
        };

        var result = await _service.RegisterAsync(request);

        _ = await _users.Received(1).ExistsByEmailAsync(TestEmail);
        await _users.Received(1).AddAsync(Arg.Is<User>(u =>
            u.Email == TestEmail &&
            u.FirstName == FirstName &&
            u.LastName == LastName));

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
        Assert.NotNull(result.Integrations);
        Assert.Empty(result.Integrations);
    }

    [Fact(DisplayName = "RegisterAsync should throw when user with email already exists")]
    public async Task RegisterAsyncShouldThrowErrorForExistingEmailAsync()
    {
        _ = _users.ExistsByEmailAsync(TestEmail).Returns(true);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
        };

        _ = await Assert.ThrowsAsync<UserAlreadyExistsException>(async () => await _service.RegisterAsync(request));

        _ = await _users.Received(1).ExistsByEmailAsync(TestEmail);
        await _users.DidNotReceive().AddAsync(Arg.Is<User>(user =>
            user.Email == TestEmail &&
            user.FirstName == FirstName &&
            user.LastName == LastName));
    }
}
