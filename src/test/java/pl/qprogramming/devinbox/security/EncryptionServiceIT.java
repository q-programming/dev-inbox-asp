package pl.qprogramming.devinbox.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pl.qprogramming.devinbox.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests for {@link EncryptionService} — extends {@link AbstractIntegrationTest} so the full
 * Spring context wires {@code application.encryption.*} from {@code application-test.yml} automatically.
 */
class EncryptionServiceIT extends AbstractIntegrationTest {

    @Autowired
    private EncryptionService encryptionService;

    @Nested
    @DisplayName("encrypt")
    class Encrypt {

        @Test
        @DisplayName("Should return non-blank Base64 ciphertext for a normal string")
        void shouldEncryptToNonBlankBase64() {
            assertThat(encryptionService.encrypt("secret-token")).isNotBlank();
        }

        @Test
        @DisplayName("Should produce different ciphertext on each call due to random IV")
        void shouldProduceDifferentCiphertextEachCall() {
            assertThat(encryptionService.encrypt("same-value"))
                    .isNotEqualTo(encryptionService.encrypt("same-value"));
        }

        @Test
        @DisplayName("Should return null for null input")
        void shouldReturnNullForNullInput() {
            assertThat(encryptionService.encrypt(null)).isNull();
        }

        @Test
        @DisplayName("Should return null for empty string input")
        void shouldReturnNullForEmptyInput() {
            assertThat(encryptionService.encrypt("")).isNull();
        }
    }

    @Nested
    @DisplayName("decrypt")
    class Decrypt {

        @Test
        @DisplayName("Should recover original plaintext after encrypt/decrypt round-trip")
        void shouldDecryptToOriginalPlaintext() {
            var plaintext = "my-github-token-123";
            assertThat(encryptionService.decrypt(encryptionService.encrypt(plaintext))).isEqualTo(plaintext);
        }

        @Test
        @DisplayName("Should return null for null input")
        void shouldReturnNullForNullInput() {
            assertThat(encryptionService.decrypt(null)).isNull();
        }

        @Test
        @DisplayName("Should return null for blank input")
        void shouldReturnNullForBlankInput() {
            assertThat(encryptionService.decrypt("")).isNull();
        }

        @Test
        @DisplayName("Should throw IllegalStateException for tampered ciphertext (GCM auth tag mismatch)")
        void shouldThrowForTamperedCiphertext() {
            var ciphertext = encryptionService.encrypt("value");
            var tampered = ciphertext.substring(0, ciphertext.length() - 4) + "AAAA";

            assertThatThrownBy(() -> encryptionService.decrypt(tampered))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("decryption failed");
        }

        @Test
        @DisplayName("Should throw IllegalStateException for a value that is not valid Base64")
        void shouldThrowForInvalidBase64() {
            assertThatThrownBy(() -> encryptionService.decrypt("not!!valid==base64"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not valid Base64");
        }
    }
}
