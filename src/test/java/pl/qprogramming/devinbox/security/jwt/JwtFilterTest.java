package pl.qprogramming.devinbox.security.jwt;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link JwtFilter} covering all token resolution and validation branches.
 */
@ExtendWith(MockitoExtension.class)
class JwtFilterTest {

    @Mock
    private TokenProvider tokenProvider;
    @Mock
    private FilterChain filterChain;
    @Mock
    private Authentication authentication;

    private JwtFilter jwtFilter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        jwtFilter = new JwtFilter(tokenProvider);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();
    }

    @Nested
    @DisplayName("Bearer header token resolution")
    class BearerHeader {

        @Test
        @DisplayName("Should authenticate when valid Bearer token is present in Authorization header")
        void shouldAuthenticateWhenValidBearerToken() throws Exception {
            request.addHeader(JwtFilter.AUTHORIZATION_HEADER, "Bearer valid-jwt");
            when(tokenProvider.validateToken("valid-jwt")).thenReturn(true);
            when(tokenProvider.getAuthentication("valid-jwt")).thenReturn(authentication);

            jwtFilter.doFilterInternal(request, response, filterChain);

            assertThat(Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()))
                    .isEqualTo(authentication);
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should not authenticate when Bearer token fails validation")
        void shouldNotAuthenticateWhenBearerTokenInvalid() throws Exception {
            request.addHeader(JwtFilter.AUTHORIZATION_HEADER, "Bearer bad-jwt");
            when(tokenProvider.validateToken("bad-jwt")).thenReturn(false);

            jwtFilter.doFilterInternal(request, response, filterChain);

            Authentication actual = SecurityContextHolder.getContext().getAuthentication();
            assertThat(actual).isNull();
            verify(tokenProvider, never()).getAuthentication(anyString());
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should ignore Authorization header that does not start with Bearer")
        void shouldIgnoreNonBearerAuthorizationHeader() throws Exception {
            request.addHeader(JwtFilter.AUTHORIZATION_HEADER, "Basic dXNlcjpwYXNz");

            jwtFilter.doFilterInternal(request, response, filterChain);

            Authentication actual = SecurityContextHolder.getContext().getAuthentication();
            assertThat(actual).isNull();
            verifyNoInteractions(tokenProvider);
            verify(filterChain).doFilter(request, response);
        }
    }

    @Nested
    @DisplayName("Cookie token resolution")
    class CookieToken {

        @Test
        @DisplayName("Should authenticate when valid JWT cookie is present")
        void shouldAuthenticateWhenValidJwtCookie() throws Exception {
            request.setCookies(new jakarta.servlet.http.Cookie(JwtFilter.JWT_COOKIE_NAME, "cookie-jwt"));
            when(tokenProvider.validateToken("cookie-jwt")).thenReturn(true);
            when(tokenProvider.getAuthentication("cookie-jwt")).thenReturn(authentication);

            jwtFilter.doFilterInternal(request, response, filterChain);

            assertThat(Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()))
                    .isEqualTo(authentication);
        }

        @Test
        @DisplayName("Should not authenticate when JWT cookie value is blank")
        void shouldNotAuthenticateWhenJwtCookieBlank() throws Exception {
            request.setCookies(new jakarta.servlet.http.Cookie(JwtFilter.JWT_COOKIE_NAME, "  "));

            jwtFilter.doFilterInternal(request, response, filterChain);

            Authentication actual = SecurityContextHolder.getContext().getAuthentication();
            assertThat(actual).isNull();
            verifyNoInteractions(tokenProvider);
        }

        @Test
        @DisplayName("Should not authenticate when cookies are present but JWT cookie is absent")
        void shouldNotAuthenticateWhenJwtCookieAbsent() throws Exception {
            request.setCookies(new jakarta.servlet.http.Cookie("other-cookie", "value"));

            jwtFilter.doFilterInternal(request, response, filterChain);

            Authentication actual = SecurityContextHolder.getContext().getAuthentication();
            assertThat(actual).isNull();
            verifyNoInteractions(tokenProvider);
        }

        @Test
        @DisplayName("Should not authenticate when no cookies at all")
        void shouldNotAuthenticateWhenNoCookies() throws Exception {
            // no cookies set on request

            jwtFilter.doFilterInternal(request, response, filterChain);

            Authentication actual = SecurityContextHolder.getContext().getAuthentication();
            assertThat(actual).isNull();
            verifyNoInteractions(tokenProvider);
            verify(filterChain).doFilter(request, response);
        }
    }

    @Nested
    @DisplayName("Filter chain continuation")
    class FilterChainContinuation {

        @Test
        @DisplayName("Should always call filterChain.doFilter regardless of token presence")
        void shouldAlwaysContinueFilterChain() throws Exception {
            jwtFilter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
        }
    }
}
