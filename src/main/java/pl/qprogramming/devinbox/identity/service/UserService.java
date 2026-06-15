package pl.qprogramming.devinbox.identity.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.domain.UserRepository;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.exception.UserAlreadyExists;
import pl.qprogramming.devinbox.identity.exception.UserAuthFailed;
import pl.qprogramming.devinbox.shared.utils.SecurityUtils;

import java.util.Locale;
import java.util.Optional;

/**
 * Manages user-related operations: registration, authentication and retrieval.
 * JWT creation and cookie lifecycle are intentionally left to the API delegate layer.
 */
@RequiredArgsConstructor
@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user.
     *
     * @param request registration details
     * @return the persisted user
     * @throws UserAlreadyExists if the email is already taken
     */
    public User register(RegisterRequest request) {
        val email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExists(email);
        }
        val user = User.builder()
                .email(email)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .accountType(User.AccountType.REGULAR)
                .activated(true)
                .build();
        return userRepository.save(user);
    }

    /**
     * Authenticates a user against the configured {@link AuthenticationManager}.
     *
     * <p>Returns a {@link LoginResult} containing both the domain {@link User} and the
     * Spring Security {@link Authentication} so the caller can issue a JWT without
     * this service knowing anything about tokens or cookies.
     *
     * @param request login credentials
     * @return authenticated user + authentication context
     * @throws UserAuthFailed if credentials are invalid
     */
    public LoginResult login(LoginRequest request) {
        val email = normalizeEmail(request.getEmail());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
            val user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
            return new LoginResult(user, authentication);
        } catch (AuthenticationException ex) {
            log.debug("Authentication failed for {}", email);
            throw new UserAuthFailed("Authentication failed");
        }
    }

    /**
     * Retrieves the currently authenticated user from the security context.
     *
     * @return an Optional containing the current user, or empty if unauthenticated
     */
    public Optional<User> currentUser() {
        return SecurityUtils.getCurrentUserEmail()
                .flatMap(userRepository::findByEmailIgnoreCase);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}

