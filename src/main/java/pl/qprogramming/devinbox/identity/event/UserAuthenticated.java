package pl.qprogramming.devinbox.identity.event;


import pl.qprogramming.devinbox.identity.domain.User;

/**
 * UserAuthenticated record
 */
public record UserAuthenticated(long id, String email, String githubToken) {
    public static UserAuthenticated from(User user, String githubToken) {
        return new UserAuthenticated(user.getId(), user.getEmail(), githubToken);
    }
}
