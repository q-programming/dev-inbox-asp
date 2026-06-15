package pl.qprogramming.devinbox.identity.service;

import org.springframework.security.core.Authentication;
import pl.qprogramming.devinbox.identity.domain.User;

/**
 * Carries the result of a successful authentication.
 *
 * <p>Separating the authenticated {@link User} from the Spring Security
 * {@link Authentication} lets {@link UserService} stay focused on user
 * operations while the API layer ({@code AuthApiDelegateImpl}) owns JWT
 * creation and cookie management.
 */
public record LoginResult(User user, Authentication authentication) {
}
