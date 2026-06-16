package pl.qprogramming.devinbox.shared.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailUtilsTest {
    @Test
    @DisplayName("Should mask standard email address")
    void shouldMaskStandardEmail() {
        // Arrange
        String email = "john.doe@example.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("j***@e***.com");
    }

    @Test
    @DisplayName("Should mask email with short local part")
    void shouldMaskEmailWithShortLocalPart() {
        // Arrange
        String email = "a@test.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("a***@t***.com");
    }

    @Test
    @DisplayName("Should mask email with long local part")
    void shouldMaskEmailWithLongLocalPart() {
        // Arrange
        String email = "very.long.email.address@company.org";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("v***@c***.org");
    }

    @Test
    @DisplayName("Should mask email with subdomain")
    void shouldMaskEmailWithSubdomain() {
        // Arrange
        String email = "user@mail.example.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("u***@m***.example.com");
    }

    @Test
    @DisplayName("Should mask email with multiple subdomains")
    void shouldMaskEmailWithMultipleSubdomains() {
        // Arrange
        String email = "admin@mail.subdomain.example.co.uk";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("a***@m***.subdomain.example.co.uk");
    }

    @Test
    @DisplayName("Should mask email without dot in domain")
    void shouldMaskEmailWithoutDotInDomain() {
        // Arrange
        String email = "user@localhost";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("u***@l***");
    }

    @Test
    @DisplayName("Should return *** for null email")
    void shouldReturnAsterisksForNullEmail() {
        // Act
        String masked = EmailUtils.maskEmail(null);
        // Assert
        assertThat(masked).isEqualTo("***");
    }

    @Test
    @DisplayName("Should return *** for empty email")
    void shouldReturnAsterisksForEmptyEmail() {
        // Act
        String masked = EmailUtils.maskEmail("");
        // Assert
        assertThat(masked).isEqualTo("***");
    }

    @Test
    @DisplayName("Should return *** for invalid email without @")
    void shouldReturnAsterisksForEmailWithoutAt() {
        // Arrange
        String email = "notanemail.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("***");
    }

    @Test
    @DisplayName("Should return *** for email starting with @")
    void shouldReturnAsterisksForEmailStartingWithAt() {
        // Arrange
        String email = "@example.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("***");
    }

    @Test
    @DisplayName("Should mask email with numbers")
    void shouldMaskEmailWithNumbers() {
        // Arrange
        String email = "user123@test456.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("u***@t***.com");
    }

    @Test
    @DisplayName("Should mask email with special characters")
    void shouldMaskEmailWithSpecialCharacters() {
        // Arrange
        String email = "user+tag@example.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("u***@e***.com");
    }

    @Test
    @DisplayName("Should mask email with hyphen in domain")
    void shouldMaskEmailWithHyphenInDomain() {
        // Arrange
        String email = "contact@my-company.com";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("c***@m***.com");
    }

    @Test
    @DisplayName("Should mask email with country code TLD")
    void shouldMaskEmailWithCountryCodeTLD() {
        // Arrange
        String email = "admin@example.co.uk";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("a***@e***.co.uk");
    }

    @Test
    @DisplayName("Should mask email with single character domain")
    void shouldMaskEmailWithSingleCharDomain() {
        // Arrange
        String email = "test@a.io";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("t***@a***.io");
    }

    @Test
    @DisplayName("Should preserve case sensitivity")
    void shouldPreserveCaseSensitivity() {
        // Arrange
        String email = "John.Doe@Example.COM";
        // Act
        String masked = EmailUtils.maskEmail(email);
        // Assert
        assertThat(masked).isEqualTo("J***@E***.COM");
    }
}