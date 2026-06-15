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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import pl.qprogramming.devinbox.identity.domain.UserRepository;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.exception.UserAlreadyExists;
import pl.qprogramming.devinbox.identity.exception.UserAuthFailed;
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

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder, authenticationManager);
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
        @DisplayName("Should throw UserAlreadyExists when email is already taken")
        void shouldThrowWhenEmailTaken() throws Exception {
            when(userRepository.existsByEmailIgnoreCase("john.doe@example.com")).thenReturn(true);

            assertThatThrownBy(() -> userService.register(registerRequest()))
                    .isInstanceOf(UserAlreadyExists.class);
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
        @DisplayName("Should set accountType REGULAR and activated=true for new user")
        void shouldSetAccountTypeAndActivated() throws Exception {
            when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
            when(passwordEncoder.encode(any())).thenReturn("hashed");
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            val result = userService.register(registerRequest());

            assertThat(result.getAccountType())
                    .isEqualTo(pl.qprogramming.devinbox.identity.domain.User.AccountType.REGULAR);
            assertThat(result.isActivated()).isTrue();
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
            when(authenticationManager.authenticate(any())).thenReturn(auth);
            when(userRepository.findByEmailIgnoreCase("john.doe@example.com"))
                    .thenReturn(Optional.of(storedUser()));

            userService.login(req);

            ArgumentCaptor<UsernamePasswordAuthenticationToken> captor =
                    ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
            verify(authenticationManager).authenticate(captor.capture());
            assertThat(captor.getValue().getName()).isEqualTo("john.doe@example.com");
        }

        @Test
        @DisplayName("Should throw UserAuthFailed when credentials are wrong")
        void shouldThrowOnBadCredentials() throws Exception {
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("bad"));

            assertThatThrownBy(() -> userService.login(loginRequest()))
                    .isInstanceOf(UserAuthFailed.class);
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
