using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace DevInbox.Web.Infrastructure.Security;

/// <summary>
/// Encrypts and decrypts strings using AES-256-GCM.
/// The key is derived deterministically from a password and salt via PBKDF2-SHA256 —
/// the same password + salt always produces the same key, so no key storage is needed.
/// Both values must be supplied via <c>Encryption:Password</c> and <c>Encryption:Salt</c>
/// configuration (e.g. Docker secrets / Azure Key Vault).
/// </summary>
public class EncryptionService : IDisposable
{
    private const int GcmTagBits = 128;
    private const int GcmIvBytes = 12;
    private const int Pbkdf2Iterations = 600_000; // OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
    private const int KeyBytes = 32; // 256-bit

    /// <summary>
    /// Key material held in a pinned array so the GC cannot copy it to another memory location,
    /// and zeroed on <see cref="Dispose"/> to minimise the window it is readable in a memory dump.
    /// </summary>
    private readonly byte[] _key;
    private readonly GCHandle _keyPin;
    private readonly ILogger<EncryptionService> _logger;
    private bool _disposed;

    public EncryptionService(IConfiguration configuration, ILogger<EncryptionService> logger)
    {
        _logger = logger;

        var password = configuration["Encryption:Password"];
        var salt = configuration["Encryption:Salt"];

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Encryption:Password must not be blank");
        }

        if (string.IsNullOrWhiteSpace(salt))
        {
            throw new InvalidOperationException("Encryption:Salt must not be blank");
        }

        _logger.LogInformation("Deriving AES-256 encryption key via PBKDF2");
        _key = DeriveKey(password, salt);
        _keyPin = GCHandle.Alloc(_key, GCHandleType.Pinned);
    }

    /// <summary>
    /// Encrypts <paramref name="plaintext"/> with AES-256-GCM.
    /// A fresh random IV is generated per call — identical inputs produce different ciphertexts.
    /// </summary>
    /// <returns>Base64-encoded <c>IV || ciphertext+tag</c>, or <c>null</c> for blank input.</returns>
    public string? Encrypt(string? plaintext)
    {
        if (string.IsNullOrEmpty(plaintext))
        {
            return null;
        }

        var iv = RandomNumberGenerator.GetBytes(GcmIvBytes);
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[GcmTagBits / 8];

        using var aesGcm = new AesGcm(_key, tag.Length);
        aesGcm.Encrypt(iv, plaintextBytes, ciphertext, tag);

        // Layout: IV (12) || ciphertext || tag (16)
        var combined = new byte[GcmIvBytes + ciphertext.Length + tag.Length];
        iv.CopyTo(combined, 0);
        ciphertext.CopyTo(combined, GcmIvBytes);
        tag.CopyTo(combined, GcmIvBytes + ciphertext.Length);

        return Convert.ToBase64String(combined);
    }

    /// <summary>
    /// Decrypts a value produced by <see cref="Encrypt"/>.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the auth tag fails (data tampered or key changed), or the value is not valid Base64.
    /// </exception>
    public string? Decrypt(string? ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext))
        {
            return null;
        }

        try
        {
            var combined = Convert.FromBase64String(ciphertext);
            var iv = combined[..GcmIvBytes];
            var tagOffset = combined.Length - (GcmTagBits / 8);
            var data = combined[GcmIvBytes..tagOffset];
            var tag = combined[tagOffset..];

            var plaintext = new byte[data.Length];
            using var aesGcm = new AesGcm(_key, tag.Length);
            aesGcm.Decrypt(iv, data, tag, plaintext);

            return Encoding.UTF8.GetString(plaintext);
        }
        catch (AuthenticationTagMismatchException ex)
        {
            throw new InvalidOperationException(
                "Token decryption failed: auth tag mismatch — data corrupted or key rotated", ex);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException(
                "Token decryption failed: stored value is not valid Base64", ex);
        }
    }

    /// <summary>
    /// Derives a 256-bit AES key from <paramref name="password"/> and <paramref name="salt"/>
    /// using PBKDF2-HMAC-SHA256 with 65 536 iterations.
    /// Deterministic: the same inputs always produce the same key.
    /// </summary>
    private static byte[] DeriveKey(string password, string salt) =>
        Rfc2898DeriveBytes.Pbkdf2(
            password: password,
            salt: Encoding.UTF8.GetBytes(salt),
            iterations: Pbkdf2Iterations,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: KeyBytes);

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        CryptographicOperations.ZeroMemory(_key);
        _keyPin.Free();
        _disposed = true;
        GC.SuppressFinalize(this);
    }
}
