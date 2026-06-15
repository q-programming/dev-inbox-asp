package pl.qprogramming.devinbox.identity.api;

import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.annotation.ResponseStatusExceptionResolver;
import pl.qprogramming.devinbox.AbstractSpringTest;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.dto.AccountType;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.dto.UserDto;
import pl.qprogramming.devinbox.identity.exception.UserAlreadyExists;
import pl.qprogramming.devinbox.identity.exception.UserAuthFailed;
import pl.qprogramming.devinbox.identity.mapper.AccountMapper;
import pl.qprogramming.devinbox.identity.service.LoginResult;
import pl.qprogramming.devinbox.identity.service.UserService;
import pl.qprogramming.devinbox.security.jwt.TokenProvider;
import pl.qprogramming.devinbox.utils.TestFixtures;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthApiDelegateImplTest extends AbstractSpringTest {

    public static final String TEST_EMAIL = "john.doe@example.com";
    @Mock
    UserService userService;
    @Mock
    AccountMapper accountMapper;
    @Mock
    TokenProvider tokenProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        val delegate = new AuthApiDelegateImpl(accountMapper, userService, tokenProvider, applicationProperties);
        val controller = new AuthApiController(delegate);
        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setHandlerExceptionResolvers(new ResponseStatusExceptionResolver())
                .build();
    }

    private UserDto userDto() {
        val dto = new UserDto();
        dto.setId(1L);
        dto.setEmail(TEST_EMAIL);
        dto.setFirstName("John");
        dto.setLastName("Doe");
        dto.setAccountType(AccountType.REGULAR);
        return dto;
    }

    private LoginResult loginResult(User user) {
        val auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return new LoginResult(user, auth);
    }

    @Nested
    @DisplayName("POST /api/auth/register")
    class RegisterEndpoint {

        @Test
        @DisplayName("Should return 201 and UserDto when registration succeeds")
        void shouldReturn201OnSuccess() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request.json");
            val user = User.builder().id(1L).email(TEST_EMAIL).build();
            when(userService.register(any(RegisterRequest.class))).thenReturn(user);
            when(accountMapper.userToUserDto(user)).thenReturn(userDto());

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                    .andExpect(jsonPath("$.id").value(1));
        }

        @Test
        @DisplayName("Should return 409 when email is already registered")
        void shouldReturn409WhenEmailTaken() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request-duplicate.json");
            when(userService.register(any())).thenThrow(new UserAlreadyExists("duplicate@example.com"));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isConflict());
        }
    }

    @Nested
    @DisplayName("POST /api/auth/login")
    class LoginEndpoint {

        @Test
        @DisplayName("Should return 200, UserDto and set jwt cookie on valid credentials")
        void shouldReturn200OnValidCredentials() throws Exception {
            val body = TestFixtures.readJson("data/auth/login-request.json");
            val user = User.builder().id(1L).email(TEST_EMAIL).build();
            when(userService.login(any(LoginRequest.class))).thenReturn(loginResult(user));
            when(tokenProvider.createToken(any(), any())).thenReturn("jwt-token");
            when(accountMapper.userToUserDto(user)).thenReturn(userDto());

            // MockMvc sets up RequestContextHolder so CookieUtils can write the cookie
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                    .andExpect(cookie().exists("jwt"));
        }

        @Test
        @DisplayName("Should return 401 on wrong credentials")
        void shouldReturn401OnBadCredentials() throws Exception {
            val body = TestFixtures.readJson("data/auth/login-request-wrong-password.json");
            when(userService.login(any())).thenThrow(new UserAuthFailed("bad credentials"));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("POST /api/auth/logout")
    class LogoutEndpoint {

        @Test
        @DisplayName("Should return 204 and clear the jwt cookie")
        void shouldReturn204AndClearCookie() throws Exception {
            mockMvc.perform(post("/api/auth/logout"))
                    .andExpect(status().isNoContent())
                    .andExpect(cookie().maxAge("jwt", 0));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/me")
    class MeEndpoint {

        @Test
        @DisplayName("Should return 200 and UserDto when user is authenticated")
        void shouldReturn200WhenAuthenticated() throws Exception {
            val user = User.builder().id(1L).email(TEST_EMAIL).build();
            when(userService.currentUser()).thenReturn(Optional.of(user));
            when(accountMapper.userToUserDto(user)).thenReturn(userDto());

            mockMvc.perform(post("/api/auth/me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL));
        }

        @Test
        @DisplayName("Should return 204 when no authenticated user")
        void shouldReturn204WhenNoUser() throws Exception {
            when(userService.currentUser()).thenReturn(Optional.empty());

            mockMvc.perform(post("/api/auth/me"))
                    .andExpect(status().isNoContent());
        }
    }
}
