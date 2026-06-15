package pl.qprogramming.devinbox.identity.oauth;

import lombok.val;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pl.qprogramming.devinbox.AbstractSpringTest;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.domain.UserRepository;
import pl.qprogramming.devinbox.security.jwt.TokenProvider;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link OAuth2AuthenticationSuccessHandler}.
 * Extends {@link AbstractSpringTest} so {@link pl.qprogramming.devinbox.shared.ApplicationProperties}
 * is bound from {@code application-test.yml} — no mocking of properties needed.
 */
@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationSuccessHandlerTest extends AbstractSpringTest {

    public static final String TEST_USER = "john@example.com";
    public static final String LOGIN = "login";
    public static final String FIRST_NAME = "johndoe";
    public static final String EMAIL = "email";
    public static final String FULL_NAME = "John Doe";
    public static final String NAME = "name";
    public static final String JOHN = "John";
    public static final String DOE = "Doe";
    public static final String GH_TOKEN = "gh-token";
    public static final String GH_ACCESS_TOKEN = "gh-access-token";
    @Mock
    private TokenProvider tokenProvider;
    @Mock
    private UserRepository userRepository;
    @Mock
    private OAuth2AuthorizedClientService authorizedClientService;

    private OAuth2AuthenticationSuccessHandler handler;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setup() {
        applicationProperties.setFrontendUrl("");
        handler = new OAuth2AuthenticationSuccessHandler(
                tokenProvider, userRepository, applicationProperties, authorizedClientService);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request, response));
        when(tokenProvider.createToken(any(), any())).thenReturn("jwt-token");
    }

    @AfterEach
    void teardown() {
        RequestContextHolder.resetRequestAttributes();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private OAuth2AuthenticationToken oauthToken(Map<String, Object> attributes) {
        OAuth2User oAuth2User = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                attributes, LOGIN);
        return new OAuth2AuthenticationToken(
                oAuth2User, List.of(new SimpleGrantedAuthority("ROLE_USER")), "github");
    }

    private void stubAuthorizedClient(String accessToken) {
        val client = mock(OAuth2AuthorizedClient.class);
        val oauthToken = mock(OAuth2AccessToken.class);
        when(oauthToken.getTokenValue()).thenReturn(accessToken);
        when(client.getAccessToken()).thenReturn(oauthToken);
        when(authorizedClientService.loadAuthorizedClient(anyString(), anyString()))
                .thenReturn(client);
    }

    private User savedUser(String email) {
        return User.builder()
                .id(1L).email(email)
                .firstName(JOHN).lastName(DOE)
                .accountType(User.AccountType.OAUTH_GITHUB)
                .activated(true)
                .build();
    }

    // ── new user provisioning ─────────────────────────────────────────────────

    @Nested
    @DisplayName("New user provisioning")
    class NewUser {

        @Test
        @DisplayName("Should create a new user when GitHub email is present and unknown")
        void shouldCreateNewUserWithEmail() throws IOException {
            val attrs = Map.<String, Object>of(
                    LOGIN, FIRST_NAME, EMAIL, TEST_USER, NAME, FULL_NAME);
            stubAuthorizedClient(GH_ACCESS_TOKEN);
            when(userRepository.findByEmailIgnoreCase(TEST_USER)).thenReturn(Optional.empty());
            when(userRepository.save(any())).thenReturn(savedUser(TEST_USER));

            handler.onAuthenticationSuccess(request, response, oauthToken(attrs));

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getEmail()).isEqualTo(TEST_USER);
            assertThat(captor.getValue().getAccountType()).isEqualTo(User.AccountType.OAUTH_GITHUB);
            assertThat(captor.getValue().getGithubToken()).isEqualTo(GH_ACCESS_TOKEN);
        }

        @Test
        @DisplayName("Should use login+@github.invalid as email when GitHub email is null")
        void shouldFallbackToGithubInvalidEmail() throws IOException {
            val attrs = Map.<String, Object>of(LOGIN, FIRST_NAME, NAME, FULL_NAME);
            stubAuthorizedClient(GH_TOKEN);
            when(userRepository.findByEmailIgnoreCase("johndoe@github.invalid")).thenReturn(Optional.empty());
            when(userRepository.save(any())).thenReturn(savedUser("johndoe@github.invalid"));

            handler.onAuthenticationSuccess(request, response, oauthToken(attrs));

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getEmail()).isEqualTo("johndoe@github.invalid");
        }

        @Test
        @DisplayName("Should split name into firstName and lastName")
        void shouldSplitNameIntoFirstAndLast() throws IOException {
            val attrs = Map.<String, Object>of(
                    LOGIN, FIRST_NAME, EMAIL, TEST_USER, NAME, FULL_NAME);
            stubAuthorizedClient(GH_TOKEN);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            handler.onAuthenticationSuccess(request, response, oauthToken(attrs));

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getFirstName()).isEqualTo(JOHN);
            assertThat(captor.getValue().getLastName()).isEqualTo(DOE);
        }
    }

    // ── existing user refresh ─────────────────────────────────────────────────

    @Nested
    @DisplayName("Existing user token refresh")
    class ExistingUser {

        @Test
        @DisplayName("Should refresh GitHub token on existing user and save")
        void shouldRefreshGithubTokenOnExistingUser() throws IOException {
            val attrs = Map.<String, Object>of(
                    LOGIN, FIRST_NAME, EMAIL, TEST_USER, NAME, FULL_NAME);
            stubAuthorizedClient("new-gh-token");
            val existing = savedUser(TEST_USER);
            when(userRepository.findByEmailIgnoreCase(TEST_USER))
                    .thenReturn(Optional.of(existing));
            when(userRepository.save(any())).thenReturn(existing);

            handler.onAuthenticationSuccess(request, response, oauthToken(attrs));

            assertThat(existing.getGithubToken()).isEqualTo("new-gh-token");
            verify(userRepository).save(existing);
        }
    }

    // ── redirect ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Redirect after success")
    class Redirect {

        @Test
        @DisplayName("Should redirect to / when frontendUrl is blank")
        void shouldRedirectToRootWhenNoFrontendUrl() throws IOException {
            val attrs = Map.<String, Object>of(LOGIN, FIRST_NAME, EMAIL, TEST_USER);
            stubAuthorizedClient(GH_TOKEN);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.save(any())).thenReturn(savedUser(TEST_USER));

            handler.onAuthenticationSuccess(request, response, oauthToken(attrs));

            assertThat(response.getRedirectedUrl()).isEqualTo("/");
        }

        @Test
        @DisplayName("Should redirect to frontendUrl/ when frontendUrl is configured")
        void shouldRedirectToFrontendUrl() throws IOException {
            applicationProperties.setFrontendUrl("http://localhost:5173");
            val attrs = Map.<String, Object>of(LOGIN, FIRST_NAME, EMAIL, TEST_USER);
            stubAuthorizedClient(GH_TOKEN);
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.save(any())).thenReturn(savedUser(TEST_USER));

            handler.onAuthenticationSuccess(request, response, oauthToken(attrs));

            assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/");
        }
    }

    // ── non-oauth2 token ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Non-OAuth2 authentication (edge case)")
    class NonOauth2Token {

        @Test
        @DisplayName("Should not capture GitHub token when authentication is not OAuth2")
        void shouldNotCaptureTokenForNonOauthAuth() throws IOException {
            val attrs = Map.<String, Object>of(LOGIN, FIRST_NAME, EMAIL, TEST_USER);
            val plainAuth = new UsernamePasswordAuthenticationToken(
                    new DefaultOAuth2User(List.of(), attrs, LOGIN), null, List.of());
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            when(userRepository.save(any())).thenReturn(savedUser(TEST_USER));

            handler.onAuthenticationSuccess(request, response, plainAuth);

            verify(authorizedClientService, never()).loadAuthorizedClient(any(), any());
        }
    }
}

