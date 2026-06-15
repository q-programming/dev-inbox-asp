package pl.qprogramming.devinbox.security.jwt;

import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import pl.qprogramming.devinbox.AbstractSpringTest;
import pl.qprogramming.devinbox.shared.ApplicationProperties;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link TokenProvider}.
 * Extends {@link AbstractSpringTest} so {@code application-test.yml} is loaded and
 * {@link ApplicationProperties} is autowired — no manual property construction needed.
 */
class TokenProviderTest extends AbstractSpringTest {

    // Used only by edge-case tests that need a deliberately different secret.
    private static final String DIFFERENT_SECRET =
            "ZGlmZmVyZW50LXNlY3JldC10aGF0LWlzLWFsc28tbG9uZy1lbm91Z2g=";
    public static final String EXAMPLE_USER = "user@example.com";

    private TokenProvider tokenProvider;

    @BeforeEach
    void setup() {
        tokenProvider = new TokenProvider(applicationProperties);
    }

    private UsernamePasswordAuthenticationToken authFor(String email) {
        return new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Nested
    @DisplayName("createToken")
    class CreateToken {

        @Test
        @DisplayName("Should produce a non-blank serialised JWT string")
        void shouldProduceNonBlankToken() {
            val token = tokenProvider.createToken(authFor(EXAMPLE_USER), 1L);

            assertThat(token).isNotBlank();
        }

        @Test
        @DisplayName("Should embed the subject email so it survives a round-trip")
        void shouldEmbedSubjectInClaims() {
            val token = tokenProvider.createToken(authFor(EXAMPLE_USER), 1L);
            val auth = tokenProvider.getAuthentication(token);

            assertThat(auth.getName()).isEqualTo(EXAMPLE_USER);
        }

        @Test
        @DisplayName("Should carry ROLE_USER authority through a round-trip")
        void shouldCarryAuthority() {
            val token = tokenProvider.createToken(authFor(EXAMPLE_USER), 1L);
            val auth = tokenProvider.getAuthentication(token);

            assertThat(auth.getAuthorities())
                    .extracting(GrantedAuthority::getAuthority)
                    .containsExactly("ROLE_USER");
        }

        @Test
        @DisplayName("Should produce distinct tokens for different users")
        void shouldProduceDistinctTokensForDifferentUsers() {
            val t1 = tokenProvider.createToken(authFor("alice@example.com"), 1L);
            val t2 = tokenProvider.createToken(authFor("bob@example.com"), 2L);

            assertThat(t1).isNotEqualTo(t2);
        }
    }

    @Nested
    @DisplayName("validateToken")
    class ValidateToken {

        @Test
        @DisplayName("Should return true for a freshly issued token")
        void shouldReturnTrueForFreshToken() {
            val token = tokenProvider.createToken(authFor(EXAMPLE_USER), 1L);

            assertThat(tokenProvider.validateToken(token)).isTrue();
        }

        @Test
        @DisplayName("Should return false for a plain non-JWT string")
        void shouldReturnFalseForMalformedToken() {
            assertThat(tokenProvider.validateToken("not-a-token")).isFalse();
        }

        @Test
        @DisplayName("Should return false for an empty string")
        void shouldReturnFalseForEmptyString() {
            assertThat(tokenProvider.validateToken("")).isFalse();
        }

        @Test
        @DisplayName("Should return false when the signature has been tampered with")
        void shouldReturnFalseForTamperedSignature() {
            val token = tokenProvider.createToken(authFor(EXAMPLE_USER), 1L);
            val tampered = token.substring(0, token.length() - 5) + "XXXXX";

            assertThat(tokenProvider.validateToken(tampered)).isFalse();
        }

        @Test
        @DisplayName("Should return false for a token signed with a different secret")
        void shouldReturnFalseForForeignSecret() {
            val otherJwt = new ApplicationProperties.JWT();
            otherJwt.setSecret(DIFFERENT_SECRET);
            otherJwt.setExpirationMs(applicationProperties.getJwt().getExpirationMs());
            val otherProps = new ApplicationProperties();
            otherProps.setJwt(otherJwt);
            val otherProvider = new TokenProvider(otherProps);

            val foreignToken = otherProvider.createToken(authFor(EXAMPLE_USER), 1L);

            assertThat(tokenProvider.validateToken(foreignToken)).isFalse();
        }

        @Test
        @DisplayName("Should return false for an already expired token")
        void shouldReturnFalseForExpiredToken() throws InterruptedException {
            val expiredJwt = new ApplicationProperties.JWT();
            expiredJwt.setSecret(applicationProperties.getJwt().getSecret());
            expiredJwt.setExpirationMs(1L);
            val expiredProps = new ApplicationProperties();
            expiredProps.setJwt(expiredJwt);
            val shortLived = new TokenProvider(expiredProps);

            val token = shortLived.createToken(authFor(EXAMPLE_USER), 1L);
            Thread.sleep(50);

            assertThat(shortLived.validateToken(token)).isFalse();
        }
    }

    @Nested
    @DisplayName("getAuthentication")
    class GetAuthentication {

        @Test
        @DisplayName("Should throw IllegalArgumentException for a malformed token")
        void shouldThrowForMalformedToken() {
            assertThatThrownBy(() -> tokenProvider.getAuthentication("bad-token"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Cannot parse JWT token");
        }

        @Test
        @DisplayName("Should return the raw token string as credentials")
        void shouldReturnTokenAsCredentials() {
            val token = tokenProvider.createToken(authFor(EXAMPLE_USER), 1L);
            val auth = tokenProvider.getAuthentication(token);

            assertThat(auth.getCredentials()).isEqualTo(token);
        }
    }
}
