package pl.qprogramming.devinbox.shared.utils;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SecurityUtils} covering all principal extraction and authority-check branches.
 */
class SecurityUtilsTest {

    public static final String ROLE_USER = "ROLE_USER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void setAuthentication(String email) {
        var user = new User(email, "", List.of(new SimpleGrantedAuthority(ROLE_USER)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private void setStringPrincipalAuthentication() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("bob@example.com", null, List.of()));
    }

    @Nested
    @DisplayName("getCurrentUserEmail")
    class GetCurrentUserEmail {

        @Test
        @DisplayName("Should return email when authentication holds a UserDetails principal")
        void shouldReturnEmailWhenUserDetailsPrincipal() {
            setAuthentication("alice@example.com");

            assertThat(SecurityUtils.getCurrentUserEmail()).contains("alice@example.com");
        }

        @Test
        @DisplayName("Should return value when authentication principal is a plain String")
        void shouldReturnEmailWhenStringPrincipal() {
            setStringPrincipalAuthentication();

            assertThat(SecurityUtils.getCurrentUserEmail()).contains("bob@example.com");
        }

        @Test
        @DisplayName("Should return empty Optional when no authentication in context")
        void shouldReturnEmptyWhenNoAuthentication() {
            SecurityContextHolder.clearContext();

            assertThat(SecurityUtils.getCurrentUserEmail()).isEmpty();
        }
    }

    @Nested
    @DisplayName("hasCurrentUserAnyOfAuthorities")
    class HasAuthority {

        @Test
        @DisplayName("Should return true when user has one of the specified authorities")
        void shouldReturnTrueWhenAuthorityMatches() {
            setAuthentication("user@example.com");

            assertThat(SecurityUtils.hasCurrentUserAnyOfAuthorities(ROLE_USER, ROLE_ADMIN)).isTrue();
        }

        @Test
        @DisplayName("Should return false when user has none of the specified authorities")
        void shouldReturnFalseWhenNoAuthorityMatches() {
            setAuthentication("user@example.com");

            assertThat(SecurityUtils.hasCurrentUserAnyOfAuthorities(ROLE_ADMIN)).isFalse();
        }

        @Test
        @DisplayName("Should return false when no authentication in context")
        void shouldReturnFalseWhenNotAuthenticated() {
            SecurityContextHolder.clearContext();

            assertThat(SecurityUtils.hasCurrentUserAnyOfAuthorities(ROLE_USER)).isFalse();
        }
    }

    @Nested
    @DisplayName("hasCurrentUserNoneOfAuthorities")
    class HasNoneOfAuthority {

        @Test
        @DisplayName("Should return false when user holds a listed authority")
        void shouldReturnFalseWhenAuthorityPresent() {
            setAuthentication("user@example.com");

            assertThat(SecurityUtils.hasCurrentUserNoneOfAuthorities(ROLE_USER)).isFalse();
        }

        @Test
        @DisplayName("Should return true when user does not hold any listed authority")
        void shouldReturnTrueWhenAuthorityAbsent() {
            setAuthentication("user@example.com");

            assertThat(SecurityUtils.hasCurrentUserNoneOfAuthorities(ROLE_ADMIN)).isTrue();
        }
    }

    @Nested
    @DisplayName("hasCurrentUserThisAuthority")
    class HasThisAuthority {

        @Test
        @DisplayName("Should return true for an authority the user holds")
        void shouldReturnTrueForMatchingAuthority() {
            setAuthentication("user@example.com");

            assertThat(SecurityUtils.hasCurrentUserThisAuthority(ROLE_USER)).isTrue();
        }

        @Test
        @DisplayName("Should return false for an authority the user does not hold")
        void shouldReturnFalseForMissingAuthority() {
            setAuthentication("user@example.com");

            assertThat(SecurityUtils.hasCurrentUserThisAuthority(ROLE_ADMIN)).isFalse();
        }
    }
}
