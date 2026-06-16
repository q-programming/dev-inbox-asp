package pl.qprogramming.devinbox.identity.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.event.AuthenticationFailure;
import pl.qprogramming.devinbox.identity.event.UserAuthenticated;
import pl.qprogramming.devinbox.identity.event.UserCreated;
import pl.qprogramming.devinbox.identity.exception.UserAlreadyExistsException;
import pl.qprogramming.devinbox.identity.exception.UserAuthFailedException;
import pl.qprogramming.devinbox.identity.repository.UserRepository;
import pl.qprogramming.devinbox.security.EncryptionService;
import pl.qprogramming.devinbox.shared.utils.EmailUtils;
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
    private final ApplicationEventPublisher events;
    private final EncryptionService encryptionService;

    /**
     * Registers a new user.
     *
     * @param request registration details
     * @return the persisted user
     * @throws UserAlreadyExistsException if the email is already taken
     */
    @Transactional
    public User register(RegisterRequest request) {
        val email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistsException(email);
        }
        var newUser = User.builder()
                .email(email)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .accountType(User.AccountType.REGULAR)
                .activated(true)
                .build();
        newUser = userRepository.save(newUser);
        events.publishEvent(UserCreated.from(newUser));
        return newUser;
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
     * @throws UserAuthFailedException if credentials are invalid
     */
    @Transactional(noRollbackFor = UserAuthFailedException.class)
    public LoginResult login(LoginRequest request) {
        val email = normalizeEmail(request.getEmail());
        val user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UserAuthFailedException("Authentication failed"));
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
            val encryptedToken = encryptionService.encrypt(user.getGithubToken());
            events.publishEvent(UserAuthenticated.from(user, encryptedToken));
            return new LoginResult(user, authentication);
        } catch (AuthenticationException ex) {
            log.debug("Authentication failed for {}", EmailUtils.maskEmail(email));
            events.publishEvent(AuthenticationFailure.from(user, ex.getMessage()));
            throw new UserAuthFailedException("Authentication failed");
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

