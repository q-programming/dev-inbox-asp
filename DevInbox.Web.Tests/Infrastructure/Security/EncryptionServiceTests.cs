using DevInbox.Web.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace DevInbox.Web.Tests.Infrastructure.Security;

/// <summary>
/// Unit tests for <see cref="EncryptionService"/>.
///
/// NOTE: The service derives its key with 600 000 PBKDF2 iterations, which takes
/// ~150–300 ms per instantiation. A single shared instance is therefore created
/// once for the full class via the constructor fixture pattern so that the cost
/// is paid only once per test run.
/// </summary>
public class EncryptionServiceTests : IDisposable
{
    // ── shared config values ──────────────────────────────────────────────────
    private const string ValidPassword = "test-password-for-unit-tests";
    private const string ValidSalt = "test-salt-for-unit-tests";

    // ── shared instance (key derived once for the whole class) ────────────────
    private readonly EncryptionService _encryptionService;
    private readonly ILogger<EncryptionService> _logger;

    public EncryptionServiceTests()
    {
        _logger = Substitute.For<ILogger<EncryptionService>>();
        _encryptionService = BuildService(ValidPassword, ValidSalt);
    }

    public void Dispose() => _encryptionService.Dispose();

    // ── helpers ───────────────────────────────────────────────────────────────

    private EncryptionService BuildService(string password, string salt)
    {
        var config = BuildConfig(password, salt);
        return new EncryptionService(config, _logger);
    }

    private static IConfiguration BuildConfig(string? password, string? salt)
    {
        var pairs = new Dictionary<string, string?>();
        if (password is not null)
        {
            pairs["Encryption:Password"] = password;
        }

        if (salt is not null)
        {
            pairs["Encryption:Salt"] = salt;
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(pairs)
            .Build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    public class Constructor
    {
        private readonly ILogger<EncryptionService> _logger = Substitute.For<ILogger<EncryptionService>>();

        private EncryptionService Build(string? password, string? salt)
        {
            var pairs = new Dictionary<string, string?>();
            if (password is not null)
            {
                pairs["Encryption:Password"] = password;
            }

            if (salt is not null)
            {
                pairs["Encryption:Salt"] = salt;
            }

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(pairs)
                .Build();

            return new EncryptionService(config, _logger);
        }

        [Fact(DisplayName = "Throws InvalidOperationException when Password key is absent")]
        public void ThrowsWhenPasswordKeyIsAbsent()
        {
            var ex = Assert.Throws<InvalidOperationException>(() => Build(password: null, salt: ValidSalt));
            Assert.Contains("Encryption:Password", ex.Message);
        }

        [Theory(DisplayName = "Throws InvalidOperationException when Password is blank or whitespace")]
        [InlineData("")]
        [InlineData("   ")]
        public void ThrowsWhenPasswordIsBlank(string blank)
        {
            var ex = Assert.Throws<InvalidOperationException>(() => Build(password: blank, salt: ValidSalt));
            Assert.Contains("Encryption:Password", ex.Message);
        }

        [Fact(DisplayName = "Throws InvalidOperationException when Salt key is absent")]
        public void ThrowsWhenSaltKeyIsAbsent()
        {
            var ex = Assert.Throws<InvalidOperationException>(() => Build(password: ValidPassword, salt: null));
            Assert.Contains("Encryption:Salt", ex.Message);
        }

        [Theory(DisplayName = "Throws InvalidOperationException when Salt is blank or whitespace")]
        [InlineData("")]
        [InlineData("   ")]
        public void ThrowsWhenSaltIsBlank(string blank)
        {
            var ex = Assert.Throws<InvalidOperationException>(() => Build(password: ValidPassword, salt: blank));
            Assert.Contains("Encryption:Salt", ex.Message);
        }

        [Fact(DisplayName = "Constructs successfully with valid Password and Salt")]
        public void ConstructsSuccessfullyWithValidConfig()
        {
            using var service = Build(ValidPassword, ValidSalt);
            Assert.NotNull(service);
        }

        private const string ValidPassword = "test-password-for-unit-tests";
        private const string ValidSalt = "test-salt-for-unit-tests";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Encrypt
    // ─────────────────────────────────────────────────────────────────────────

    public class Encrypt(EncryptionServiceTests fixture) : IClassFixture<EncryptionServiceTests>
    {
        private readonly EncryptionService _encryptionService = fixture._encryptionService;

        [Fact(DisplayName = "Returns null when plaintext is null")]
        public void ReturnsNullWhenPlaintextIsNull()
        {
            var result = _encryptionService.Encrypt(null);
            Assert.Null(result);
        }

        [Fact(DisplayName = "Returns null when plaintext is empty string")]
        public void ReturnsNullWhenPlaintextIsEmpty()
        {
            var result = _encryptionService.Encrypt(string.Empty);
            Assert.Null(result);
        }

        [Fact(DisplayName = "Returns valid Base64 string for non-empty input")]
        public void ReturnsValidBase64ForNonEmptyInput()
        {
            var result = _encryptionService.Encrypt("hello");

            Assert.NotNull(result);
            var bytes = Convert.FromBase64String(result!); // throws if invalid
            Assert.NotEmpty(bytes);
        }

        [Fact(DisplayName = "Encrypted output is not equal to plaintext")]
        public void EncryptedOutputIsNotEqualToPlaintext()
        {
            const string plaintext = "sensitive-data";

            var result = _encryptionService.Encrypt(plaintext);

            Assert.NotEqual(plaintext, result);
        }

        [Fact(DisplayName = "Two encryptions of same input produce different ciphertexts due to random IV")]
        public void TwoEncryptionsOfSameInputProduceDifferentCiphertexts()
        {
            const string plaintext = "same-input";

            var first = _encryptionService.Encrypt(plaintext);
            var second = _encryptionService.Encrypt(plaintext);

            Assert.NotEqual(first, second);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Decrypt
    // ─────────────────────────────────────────────────────────────────────────

    public class Decrypt(EncryptionServiceTests fixture) : IClassFixture<EncryptionServiceTests>
    {
        private readonly EncryptionService _encryptionService = fixture._encryptionService;

        [Fact(DisplayName = "Returns null when ciphertext is null")]
        public void ReturnsNullWhenCiphertextIsNull()
        {
            var result = _encryptionService.Decrypt(null);
            Assert.Null(result);
        }

        [Fact(DisplayName = "Returns null when ciphertext is empty string")]
        public void ReturnsNullWhenCiphertextIsEmpty()
        {
            var result = _encryptionService.Decrypt(string.Empty);
            Assert.Null(result);
        }

        [Fact(DisplayName = "Encrypt then Decrypt returns original ASCII plaintext")]
        public void RoundTripReturnsOriginalAsciiPlaintext()
        {
            const string original = "hello world";

            var encrypted = _encryptionService.Encrypt(original);
            var decrypted = _encryptionService.Decrypt(encrypted);

            Assert.Equal(original, decrypted);
        }

        [Fact(DisplayName = "Encrypt then Decrypt returns original Unicode plaintext")]
        public void RoundTripReturnsOriginalUnicodePlaintext()
        {
            const string original = "こんにちは 🌍 café naïve résumé";

            var encrypted = _encryptionService.Encrypt(original);
            var decrypted = _encryptionService.Decrypt(encrypted);

            Assert.Equal(original, decrypted);
        }

        [Fact(DisplayName = "Encrypt then Decrypt preserves special characters and symbols")]
        public void RoundTripPreservesSpecialCharacters()
        {
            const string original = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\\";

            var encrypted = _encryptionService.Encrypt(original);
            var decrypted = _encryptionService.Decrypt(encrypted);

            Assert.Equal(original, decrypted);
        }

        [Fact(DisplayName = "Encrypt then Decrypt preserves long plaintext")]
        public void RoundTripPreservesLongPlaintext()
        {
            var original = new string('x', 4096);

            var encrypted = _encryptionService.Encrypt(original);
            var decrypted = _encryptionService.Decrypt(encrypted);

            Assert.Equal(original, decrypted);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tamper detection
    // ─────────────────────────────────────────────────────────────────────────

    public class TamperDetection(EncryptionServiceTests fixture) : IClassFixture<EncryptionServiceTests>
    {
        private readonly EncryptionService _encryptionService = fixture._encryptionService;
        private readonly ILogger<EncryptionService> _logger = fixture._logger;

        [Fact(DisplayName = "Throws InvalidOperationException with auth-tag-mismatch message when decrypting with wrong key")]
        public void ThrowsWithAuthTagMismatchWhenDecryptingWithWrongKey()
        {
            var encrypted = _encryptionService.Encrypt("secret value");

            using var wrongKeyService = new EncryptionService(
                BuildConfig("completely-different-password", "completely-different-salt"),
                _logger);

            var ex = Assert.Throws<InvalidOperationException>(() => wrongKeyService.Decrypt(encrypted));
            Assert.Contains("auth tag mismatch", ex.Message);
        }

        [Fact(DisplayName = "Throws InvalidOperationException with Base64 message when ciphertext is not valid Base64")]
        public void ThrowsWithBase64MessageWhenCiphertextIsInvalidBase64()
        {
            const string notBase64 = "this-is-not-!!-valid-base64===???";

            var ex = Assert.Throws<InvalidOperationException>(() => _encryptionService.Decrypt(notBase64));
            Assert.Contains("not valid Base64", ex.Message);
        }

        [Fact(DisplayName = "Throws InvalidOperationException when ciphertext bytes are flipped")]
        public void ThrowsWhenCiphertextBytesAreFlipped()
        {
            var encrypted = _encryptionService.Encrypt("tamper me");
            var bytes = Convert.FromBase64String(encrypted!);

            // Flip a byte in the ciphertext region (after the 12-byte IV)
            bytes[15] ^= 0xFF;
            var tampered = Convert.ToBase64String(bytes);

            var ex = Assert.Throws<InvalidOperationException>(() => _encryptionService.Decrypt(tampered));
            Assert.Contains("auth tag mismatch", ex.Message);
        }

        private static IConfiguration BuildConfig(string password, string salt) =>
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Encryption:Password"] = password,
                    ["Encryption:Salt"] = salt
                })
                .Build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Key determinism — same password+salt always derives the same key
    // ─────────────────────────────────────────────────────────────────────────

    public class KeyDeterminism(EncryptionServiceTests fixture) : IClassFixture<EncryptionServiceTests>
    {
        private readonly EncryptionService _encryptService = fixture._encryptionService;
        private readonly ILogger<EncryptionService> _logger = fixture._logger;

        [Fact(DisplayName = "Fresh instance with same config can decrypt ciphertext from original instance")]
        public void FreshInstanceWithSameConfigDecryptsSuccessfully()
        {
            const string original = "data encrypted by first instance";
            var encrypted = _encryptService.Encrypt(original);

            using var freshService = new EncryptionService(
                BuildConfig(ValidPassword, ValidSalt),
                _logger);

            var decrypted = freshService.Decrypt(encrypted);

            Assert.Equal(original, decrypted);
        }

        private static IConfiguration BuildConfig(string password, string salt) =>
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Encryption:Password"] = password,
                    ["Encryption:Salt"] = salt
                })
                .Build();
    }
}
