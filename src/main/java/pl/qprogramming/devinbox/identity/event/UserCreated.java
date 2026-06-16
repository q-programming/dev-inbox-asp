package pl.qprogramming.devinbox.identity.event;


import pl.qprogramming.devinbox.identity.domain.User;

/**
 * UserAuthenticated record
 */
public record UserCreated(long id, String email, String firstName, String lastName, String accountType,
                          String githubToken) {

    public static UserCreated from(User user) {
        return new UserCreated(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getAccountType().name(), null);
    }

    public static UserCreated from(User user, String token) {
        return new UserCreated(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getAccountType().name(), token);
    }
}
