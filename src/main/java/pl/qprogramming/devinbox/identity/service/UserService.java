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
import pl.qprogramming.devinbox.config.ApplicationProperties;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.domain.UserRepository;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.exception.UserAlreadyExists;
import pl.qprogramming.devinbox.identity.exception.UserAuthFailed;
import pl.qprogramming.devinbox.security.jwt.TokenProvider;
import pl.qprogramming.devinbox.shared.utils.SecurityUtils;

import java.util.Locale;
import java.util.Optional;

import static pl.qprogramming.devinbox.shared.utils.CookieUtils.clearJwtCookie;
import static pl.qprogramming.devinbox.shared.utils.CookieUtils.setJwtCookie;

/**
 * Service class for managing user-related operations, including registration, login, and user retrieval.
 */
@RequiredArgsConstructor
@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final ApplicationProperties applicationProperties;

    /**
     * Register a new user with details provided in request.
     *
     * @param request the registration request
     * @return the registered user
     * @throws UserAlreadyExists if a user with the given email already exists
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
     * Authenticates a user and generates a JWT token.
     *
     * @param request the login request containing user credentials
     * @return the authenticated user
     * @throws UserAuthFailed if authentication fails
     */
    public User login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
            val user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
            String jwt = tokenProvider.createToken(authentication, user.getId());
            setJwtCookie(jwt, (int) applicationProperties.getJwt().getExpirationMs());
            return user;
        } catch (AuthenticationException ex) {
            log.debug("Authentication failed for {}", email);
            throw new UserAuthFailed("Authentication failed");
        }
    }

    /**
     * Clears the JWT cookie, effectively logging out the current user.
     */
    public void logout() {
        clearJwtCookie();
    }

    /**
     * Retrieves the currently authenticated user.
     *
     * @return an Optional containing the current user if authenticated, otherwise empty
     */
    public Optional<User> currentUser() {
        return SecurityUtils.getCurrentUserEmail()
                .flatMap(userRepository::findByEmailIgnoreCase);

    }

    /**
     * Normalizes an email address by trimming whitespace and converting it to lowercase.
     *
     * @param email the email address to normalize
     * @return the normalized email address, or null if the input email is null
     */
    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

}
