package pl.qprogramming.devinbox.identity.service;

import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.event.AuthenticationFailure;
import pl.qprogramming.devinbox.identity.event.UserAuthenticated;
import pl.qprogramming.devinbox.identity.event.UserCreated;
import pl.qprogramming.devinbox.identity.exception.UserAlreadyExistsException;
import pl.qprogramming.devinbox.identity.exception.UserAuthFailedException;
import pl.qprogramming.devinbox.identity.repository.UserRepository;
import pl.qprogramming.devinbox.security.EncryptionService;
import pl.qprogramming.devinbox.utils.TestFixtures;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 * Pure Mockito — no Spring context needed; JWT and cookie concerns live in the API delegate.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private ApplicationEventPublisher events;
    @Mock
    private EncryptionService encryptionService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder, authenticationManager, events, encryptionService);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private RegisterRequest registerRequest() throws Exception {
        return TestFixtures.readFixture("data/auth/register-request.json", RegisterRequest.class);
    }

    private LoginRequest loginRequest() throws Exception {
        return TestFixtures.readFixture("data/auth/login-request.json", LoginRequest.class);
    }

    private pl.qprogramming.devinbox.identity.domain.User storedUser() throws Exception {
        return TestFixtures.readFixture("data/auth/stored-user.json",
                pl.qprogramming.devinbox.identity.domain.User.class);
    }

    // ── register ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("register")
    class Register {

        @Test
        @DisplayName("Should save and return new user when email is not taken")
        void shouldRegisterNewUser() throws Exception {
            when(userRepository.existsByEmailIgnoreCase("john.doe@example.com")).thenReturn(false);
            when(passwordEncoder.encode("SecretPass1!")).thenReturn("$2a$10$hashed");
            when(userRepository.save(any())).thenReturn(storedUser());

            val result = userService.register(registerRequest());

            assertThat(result.getEmail()).isEqualTo("john.doe@example.com");
            assertThat(result.getFirstName()).isEqualTo("John");
            verify(userRepository).save(any());
        }

        @Test
        @DisplayName("Should normalise email to lowercase before checking duplicates")
        void shouldNormaliseEmailToLowercase() throws Exception {
            val req = registerRequest();
            req.setEmail("  JOHN.DOE@EXAMPLE.COM  ");
            when(userRepository.existsByEmailIgnoreCase("john.doe@example.com")).thenReturn(false);
            when(passwordEncoder.encode(any())).thenReturn("hashed");
            when(userRepository.save(any())).thenReturn(storedUser());

            userService.register(req);

            ArgumentCaptor<pl.qprogramming.devinbox.identity.domain.User> captor =
                    ArgumentCaptor.forClass(pl.qprogramming.devinbox.identity.domain.User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getEmail()).isEqualTo("john.doe@example.com");
        }

        @Test
        @DisplayName("Should throw UserAlreadyExistsException when email is already taken")
        void shouldThrowWhenEmailTaken() throws Exception {
            when(userRepository.existsByEmailIgnoreCase("john.doe@example.com")).thenReturn(true);

            assertThatThrownBy(() -> userService.register(registerRequest()))
                    .isInstanceOf(UserAlreadyExistsException.class);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should store BCrypt-encoded password hash, never plaintext")
        void shouldStoreBcryptHash() throws Exception {
            when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
            when(passwordEncoder.encode("SecretPass1!")).thenReturn("$2a$10$hashed");
            when(userRepository.save(any())).thenReturn(storedUser());

            userService.register(registerRequest());

            ArgumentCaptor<pl.qprogramming.devinbox.identity.domain.User> captor =
                    ArgumentCaptor.forClass(pl.qprogramming.devinbox.identity.domain.User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getPasswordHash()).isEqualTo("$2a$10$hashed");
        }

        @Test
        @DisplayName("Should publish UserCreated event after successful registration")
        void shouldPublishUserCreatedEvent() throws Exception {
            when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
            when(passwordEncoder.encode(any())).thenReturn("hashed");
            when(userRepository.save(any())).thenAnswer(inv -> {
                pl.qprogramming.devinbox.identity.domain.User u = inv.getArgument(0);
                u.setId(1L);
                return u;
            });

            userService.register(registerRequest());

            ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
            verify(events).publishEvent(captor.capture());
            assertThat(captor.getValue()).isInstanceOf(UserCreated.class);
            val event = (UserCreated) captor.getValue();
            assertThat(event.email()).isEqualTo("john.doe@example.com");
            assertThat(event.accountType()).isEqualTo("REGULAR");
            assertThat(event.githubToken()).isNull();
        }

        @Test
        @DisplayName("Should not publish any event when registration fails due to duplicate email")
        void shouldNotPublishEventOnDuplicateEmail() throws Exception {
            when(userRepository.existsByEmailIgnoreCase("john.doe@example.com")).thenReturn(true);

            assertThatThrownBy(() -> userService.register(registerRequest()))
                    .isInstanceOf(UserAlreadyExistsException.class);
            verifyNoInteractions(events);
        }
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("login")
    class Login {

        @Test
        @DisplayName("Should authenticate and return LoginResult with user and authentication")
        void shouldReturnLoginResultOnValidCredentials() throws Exception {
            val auth = new UsernamePasswordAuthenticationToken(
                    "john.doe@example.com", null,
                    List.of(new SimpleGrantedAuthority("ROLE_USER")));
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com"))
                    .thenReturn(Optional.of(storedUser()));

            val result = userService.login(loginRequest());

            assertThat(result.user().getEmail()).isEqualTo("john.doe@example.com");
            assertThat(result.authentication().getName()).isEqualTo("john.doe@example.com");
        }

        @Test
        @DisplayName("Should normalise email to lowercase before authentication")
        void shouldNormaliseEmailBeforeAuth() throws Exception {
            val req = loginRequest();
            req.setEmail("  JOHN.DOE@EXAMPLE.COM  ");
            val auth = new UsernamePasswordAuthenticationToken(
                    "john.doe@example.com", null, List.of());
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com"))
                    .thenReturn(Optional.of(storedUser()));
            when(authenticationManager.authenticate(any())).thenReturn(auth);

            userService.login(req);

            ArgumentCaptor<UsernamePasswordAuthenticationToken> captor =
                    ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
            verify(authenticationManager).authenticate(captor.capture());
            assertThat(captor.getValue().getName()).isEqualTo("john.doe@example.com");
        }

        @Test
        @DisplayName("Should throw UserAuthFailedException when user is not found in the database")
        void shouldThrowWhenUserNotFound() throws Exception {
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.login(loginRequest()))
                    .isInstanceOf(UserAuthFailedException.class);
            verifyNoInteractions(authenticationManager, events, encryptionService);
        }

        @Test
        @DisplayName("Should throw UserAuthFailedException when credentials are wrong")
        void shouldThrowOnBadCredentials() throws Exception {
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com"))
                    .thenReturn(Optional.of(storedUser()));
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("bad"));

            assertThatThrownBy(() -> userService.login(loginRequest()))
                    .isInstanceOf(UserAuthFailedException.class);
        }

        @Test
        @DisplayName("Should call encryptionService.encrypt with the user's GitHub token during login")
        void shouldEncryptGithubTokenDuringLogin() throws Exception {
            val user = storedUser();
            val auth = new UsernamePasswordAuthenticationToken(
                    "john.doe@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com")).thenReturn(Optional.of(user));
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(encryptionService.encrypt(any())).thenReturn("encrypted-token");

            userService.login(loginRequest());

            verify(encryptionService).encrypt(user.getGithubToken());
        }

        @Test
        @DisplayName("Should publish UserAuthenticated event with encrypted token after successful login")
        void shouldPublishUserAuthenticatedEvent() throws Exception {
            val user = storedUser();
            val auth = new UsernamePasswordAuthenticationToken(
                    "john.doe@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com")).thenReturn(Optional.of(user));
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(encryptionService.encrypt(any())).thenReturn("encrypted-token");

            userService.login(loginRequest());

            ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
            verify(events).publishEvent(captor.capture());
            assertThat(captor.getValue()).isInstanceOf(UserAuthenticated.class);
            val event = (UserAuthenticated) captor.getValue();
            assertThat(event.email()).isEqualTo("john.doe@example.com");
            assertThat(event.githubToken()).isEqualTo("encrypted-token");
        }

        @Test
        @DisplayName("Should publish AuthenticationFailure event on bad credentials")
        void shouldPublishAuthenticationFailureEvent() throws Exception {
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com"))
                    .thenReturn(Optional.of(storedUser()));
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            assertThatThrownBy(() -> userService.login(loginRequest()))
                    .isInstanceOf(UserAuthFailedException.class);

            ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
            verify(events).publishEvent(captor.capture());
            assertThat(captor.getValue()).isInstanceOf(AuthenticationFailure.class);
            val event = (AuthenticationFailure) captor.getValue();
            assertThat(event.email()).isEqualTo("john.doe@example.com");
            assertThat(event.cause()).isEqualTo("Bad credentials");
        }
    }

    // ── currentUser ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("currentUser")
    class CurrentUser {

        @Test
        @DisplayName("Should return the authenticated user when security context has a principal")
        void shouldReturnUserWhenAuthenticated() throws Exception {
            val auth = new UsernamePasswordAuthenticationToken(
                    new User("john.doe@example.com", "", List.of()), null, List.of());
            org.springframework.security.core.context.SecurityContextHolder
                    .getContext().setAuthentication(auth);
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com"))
                    .thenReturn(Optional.of(storedUser()));

            try {
                val result = userService.currentUser();
                assertThat(result).isPresent();
                assertThat(result.get().getEmail()).isEqualTo("john.doe@example.com");
            } finally {
                org.springframework.security.core.context.SecurityContextHolder.clearContext();
            }
        }

        @Test
        @DisplayName("Should return empty Optional when security context has no authentication")
        void shouldReturnEmptyWhenUnauthenticated() {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();

            val result = userService.currentUser();

            assertThat(result).isEmpty();
            verifyNoInteractions(userRepository);
        }
    }
}
