package pl.qprogramming.devinbox.identity;

import jakarta.servlet.http.Cookie;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import pl.qprogramming.devinbox.AbstractIntegrationTest;
import pl.qprogramming.devinbox.audit.domain.AuditEventType;
import pl.qprogramming.devinbox.audit.repository.AuditRepository;
import pl.qprogramming.devinbox.identity.event.AuthenticationFailure;
import pl.qprogramming.devinbox.identity.event.UserAuthenticated;
import pl.qprogramming.devinbox.identity.event.UserCreated;
import pl.qprogramming.devinbox.identity.repository.UserRepository;
import pl.qprogramming.devinbox.utils.TestFixtures;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for auth endpoints against a real PostgreSQL container.
 * Exercises the full Spring stack: HTTP → controller → service → DB.
 *
 * <p>{@link RecordApplicationEvents} captures every domain event published to the
 * {@link org.springframework.context.ApplicationEventPublisher} so we can assert
 * both that events are published AND that the audit listener processes them.
 */
@RecordApplicationEvents
class AuthenticationIT extends AbstractIntegrationTest {

    public static final String TEST_EMAIL = "john.doe@example.com";
    @Autowired
    UserRepository userRepository;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    AuditRepository auditRepository;
    @Autowired
    ApplicationEvents applicationEvents;

    @BeforeEach
    void cleanUp() {
        auditRepository.deleteAll();
        userRepository.deleteAll();
    }

    /**
     * Registers using fixture data; returns the JWT cookie from the login response.
     */
    private Cookie registerAndLogin() throws Exception {
        val registerBody = TestFixtures.readJson("data/auth/register-request.json");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated());

        val loginBody = TestFixtures.readJson("data/auth/login-request.json");
        val loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        val cookie = loginResult.getResponse().getCookie("jwt");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    // ── register ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/auth/register")
    class Register {

        @Test
        @DisplayName("Should create user and return 201 with UserDto")
        void shouldRegisterNewUser() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request.json");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                    .andExpect(jsonPath("$.firstName").value("John"))
                    .andExpect(jsonPath("$.lastName").value("Doe"))
                    .andExpect(jsonPath("$.accountType").value("REGULAR"))
                    .andExpect(jsonPath("$.id").isNumber());

            assertThat(userRepository.findByEmailIgnoreCase(TEST_EMAIL)).isPresent();
        }

        @Test
        @DisplayName("Should store hashed password, never plaintext")
        void shouldStoreHashedPassword() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request.json");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());

            val saved = userRepository.findByEmailIgnoreCase(TEST_EMAIL).orElseThrow();
            assertThat(saved.getPasswordHash()).isNotEqualTo("SecretPass1!");
            assertThat(passwordEncoder.matches("SecretPass1!", saved.getPasswordHash())).isTrue();
        }

        @Test
        @DisplayName("Should return 409 when registering the same email twice")
        void shouldReturn409OnDuplicateEmail() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request.json");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("Should treat email as case-insensitive for duplicate detection")
        void shouldDetectDuplicateEmailCaseInsensitively() throws Exception {
            val original = TestFixtures.readJson("data/auth/register-request.json");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(original))
                    .andExpect(status().isCreated());

            val dupRequest = TestFixtures.readFixture(
                    "data/auth/register-request.json",
                    pl.qprogramming.devinbox.identity.dto.RegisterRequest.class);
            dupRequest.setEmail("JOHN.DOE@EXAMPLE.COM");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dupRequest)))
                    .andExpect(status().isConflict());
        }
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/auth/login")
    class Login {

        @BeforeEach
        void registerUser() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request.json");
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Should return 200 and set jwt cookie on valid credentials")
        void shouldLoginWithValidCredentials() throws Exception {
            val body = TestFixtures.readJson("data/auth/login-request.json");
            val result = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                    .andReturn();

            assertThat(result.getResponse().getCookies())
                    .anySatisfy(c -> {
                        assertThat(c.getName()).isEqualTo("jwt");
                        assertThat(c.isHttpOnly()).isTrue();
                        assertThat(c.getValue()).isNotBlank();
                    });
        }

        @Test
        @DisplayName("Should return 401 on wrong password")
        void shouldReturn401OnWrongPassword() throws Exception {
            val body = TestFixtures.readJson("data/auth/login-request-wrong-password.json");
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Should accept email in any case (case-insensitive login)")
        void shouldLoginWithUppercaseEmail() throws Exception {
            val loginReq = TestFixtures.readFixture(
                    "data/auth/login-request.json",
                    pl.qprogramming.devinbox.identity.dto.LoginRequest.class);
            loginReq.setEmail("JOHN.DOE@EXAMPLE.COM");

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginReq)))
                    .andExpect(status().isOk());
        }
    }

    // ── logout ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/auth/logout")
    class Logout {

        @Test
        @DisplayName("Should return 204 and clear the jwt cookie when authenticated")
        void shouldLogoutAndClearCookie() throws Exception {
            val jwt = registerAndLogin();

            val result = mockMvc.perform(post("/api/auth/logout").cookie(jwt))
                    .andExpect(status().isNoContent())
                    .andReturn();

            assertThat(result.getResponse().getCookies())
                    .anySatisfy(c -> {
                        assertThat(c.getName()).isEqualTo("jwt");
                        assertThat(c.getMaxAge()).isZero();
                    });
        }

        @Test
        @DisplayName("Should return 401 when not authenticated")
        void shouldReturn401WhenNotAuthenticated() throws Exception {
            mockMvc.perform(post("/api/auth/logout"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ── /me ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/auth/me")
    class Me {

        @Test
        @DisplayName("Should return 204 when no JWT cookie is present")
        void shouldReturn204WithNoCookie() throws Exception {
            mockMvc.perform(post("/api/auth/me"))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("Should return 200 with UserDto when a valid JWT cookie is present")
        void shouldReturn200WithValidJwt() throws Exception {
            val jwt = registerAndLogin();

            mockMvc.perform(post("/api/auth/me").cookie(jwt))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL));
        }
    }

    // ── audit trail ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Audit trail")
    class AuditTrail {

        @Test
        @DisplayName("Should publish UserCreated event and persist USER_CREATED audit entry on registration")
        void shouldAuditUserCreated() throws Exception {
            val body = TestFixtures.readJson("data/auth/register-request.json");
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());

            // Verify the domain event was published (synchronous — happens during the HTTP call)
            assertThat(applicationEvents.stream(UserCreated.class))
                    .hasSize(1)
                    .first()
                    .satisfies(e -> {
                        assertThat(e.email()).isEqualTo(TEST_EMAIL);
                        assertThat(e.accountType()).isEqualTo("REGULAR");
                    });

            // Verify the async listener persisted the audit entry
            await().atMost(Duration.ofSeconds(5))
                    .untilAsserted(() ->
                            assertThat(auditRepository.findByEventType(AuditEventType.USER_CREATED))
                                    .isNotEmpty());
        }

        @Test
        @DisplayName("Should publish UserAuthenticated event and persist USER_AUTHENTICATED audit entry on login")
        void shouldAuditUserAuthenticated() throws Exception {
            val registerBody = TestFixtures.readJson("data/auth/register-request.json");
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerBody))
                    .andExpect(status().isCreated());

            val loginBody = TestFixtures.readJson("data/auth/login-request.json");
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody))
                    .andExpect(status().isOk());

            // Verify the domain events were published
            assertThat(applicationEvents.stream(UserCreated.class)).hasSize(1);
            assertThat(applicationEvents.stream(UserAuthenticated.class))
                    .hasSize(1)
                    .first()
                    .satisfies(e -> assertThat(e.email()).isEqualTo(TEST_EMAIL));

            // Verify the async listener persisted the audit entry
            await().atMost(Duration.ofSeconds(5))
                    .untilAsserted(() ->
                            assertThat(auditRepository.findByEventType(AuditEventType.USER_AUTHENTICATED))
                                    .isNotEmpty());
        }

        @Test
        @DisplayName("Should publish AuthenticationFailure event and persist AUTHENTICATION_FAILED audit entry on wrong password")
        void shouldAuditAuthenticationFailure() throws Exception {
            val registerBody = TestFixtures.readJson("data/auth/register-request.json");
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerBody))
                    .andExpect(status().isCreated());

            val badLoginBody = TestFixtures.readJson("data/auth/login-request-wrong-password.json");
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(badLoginBody))
                    .andExpect(status().isUnauthorized());

            // Verify the domain events were published
            assertThat(applicationEvents.stream(UserCreated.class)).hasSize(1);
            assertThat(applicationEvents.stream(AuthenticationFailure.class))
                    .hasSize(1)
                    .first()
                    .satisfies(e -> assertThat(e.email()).isEqualTo(TEST_EMAIL));

            // Verify the async listener persisted the audit entry
            await().atMost(Duration.ofSeconds(5))
                    .untilAsserted(() ->
                            assertThat(auditRepository.findByEventType(AuditEventType.AUTHENTICATION_FAILED))
                                    .isNotEmpty());
        }
    }
}
