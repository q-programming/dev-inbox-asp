
namespace DevInbox.Web.Features.Identity.Exceptions;
 public class UserAlreadyExistsException(string email) 
     : ConflictException($"User with email '{email}' already exists");