package pl.qprogramming.devinbox.identity.event;

import pl.qprogramming.devinbox.identity.domain.User;

public record AuthenticationFailure(long id, String email, String cause) {
    public static AuthenticationFailure from(User user, String cause) {
        return new AuthenticationFailure(user.getId(), user.getEmail(), cause);
    }
}
