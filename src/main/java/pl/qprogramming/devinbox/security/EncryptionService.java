package pl.qprogramming.devinbox.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import javax.crypto.AEADBadTagException;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Arrays;
import java.util.Base64;

/**
 * Handles symmetric encryption of sensitive values (tokens, PATs) stored in the database.
 *
 * <p>Uses AES-256-GCM: authenticated, non-deterministic (random 12-byte IV per call),
 * so identical plaintexts produce different ciphertexts and any tampering is detected.
 * Key is derived once at startup via PBKDF2WithHmacSHA256 (65 536 iterations, 256-bit).
 *
 * <p>Required config (app fails fast at startup if missing):
 * <pre>
 *   application.encryption.password  (or env APPLICATION_ENCRYPTION_PASSWORD)
 *   application.encryption.salt      (or env APPLICATION_ENCRYPTION_SALT)
 * </pre>
 */
@Service
@Slf4j
public class EncryptionService {

    // AES/GCM/NoPadding is mandatory per JCA spec — NoSuchAlgorithmException is structurally impossible.
    private static final String AES_GCM = "AES/GCM/NoPadding";
    private static final String AES = "AES";
    private static final String PBKDF2 = "PBKDF2WithHmacSHA256";
    private static final int GCM_TAG_BITS = 128;
    private static final int GCM_IV_BYTES = 12;

    private SecretKey secretKey;

    @Value("${application.encryption.password:#{systemEnvironment['APPLICATION_ENCRYPTION_PASSWORD']}}")
    private String password;

    @Value("${application.encryption.salt:#{systemEnvironment['APPLICATION_ENCRYPTION_SALT']}}")
    private String salt;

    /**
     * Initializes the encryption service by generating a new secret key.
     */
    @PostConstruct
    public void init() {
        try {
            log.info("Deriving AES-256 encryption key via PBKDF2");
            this.secretKey = getKeyFromPassword();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            // Hard fail — without the key no token can be encrypted or decrypted.
            throw new IllegalStateException(
                    "Failed to derive encryption key; check application.encryption.* config", e);
        }
    }

    /**
     * Encrypts {@code stringToEncrypt} with AES-256-GCM.
     * A fresh random IV is generated per call — identical inputs produce different ciphertexts.
     *
     * @param stringToEncrypt value to protect; {@code null}/blank is returned as {@code null}
     * @return Base64-encoded {@code IV || ciphertext+tag}, or {@code null}
     */
    public String encrypt(String stringToEncrypt) {
        if (ObjectUtils.isEmpty(stringToEncrypt)) return null;
        try {
            byte[] iv = new byte[GCM_IV_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_GCM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(stringToEncrypt.getBytes(StandardCharsets.UTF_8));
            // Prepend IV so decrypt can reconstruct GCMParameterSpec without a separate column.
            byte[] combined = new byte[GCM_IV_BYTES + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, GCM_IV_BYTES);
            System.arraycopy(ciphertext, 0, combined, GCM_IV_BYTES, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Token encryption failed", e);
        }
    }

    /**
     * Decrypts a value produced by {@link #encrypt}.
     *
     * @param stringToDecrypt Base64-encoded {@code IV || ciphertext+tag}; {@code null}/blank returns {@code null}
     * @throws IllegalStateException if data is corrupted, not valid Base64, or the key has changed
     */
    public String decrypt(String stringToDecrypt) {
        if (ObjectUtils.isEmpty(stringToDecrypt)) {
            return null;
        }
        try {
            // IllegalArgumentException (unchecked) if not valid Base64 — caught below explicitly.
            byte[] combined = Base64.getDecoder().decode(stringToDecrypt);
            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_BYTES);
            byte[] ciphertext = Arrays.copyOfRange(combined, GCM_IV_BYTES, combined.length);

            Cipher cipher = Cipher.getInstance(AES_GCM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (AEADBadTagException e) {
            // GCM auth tag mismatch — data was tampered with, or the encryption key has changed.
            throw new IllegalStateException(
                    "Token decryption failed: auth tag mismatch — data corrupted or key rotated", e);
        } catch (IllegalArgumentException e) {
            // Base64.getDecoder().decode() failed — DB value is not valid Base64.
            throw new IllegalStateException("Token decryption failed: stored value is not valid Base64", e);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Token decryption failed", e);
        }
    }

    /**
     * Generates the AES-256 secret key from the configured password and salt via PBKDF2WithHmacSHA256.
     *
     * <p>The derivation is deterministic: the same password + salt always produces the same key,
     * so the key can be recovered at any time without persisting it — simply call this method again.
     * Called automatically by {@link #init()} at startup; can also be called explicitly for key recovery.
     *
     * @return the derived {@link SecretKey}
     */
    public SecretKey getKeyFromPassword() throws NoSuchAlgorithmException, InvalidKeySpecException {
        if (salt == null || salt.isBlank()) {
            throw new IllegalArgumentException("application.encryption.salt must not be blank");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("application.encryption.password must not be blank");
        }
        SecretKeyFactory factory = SecretKeyFactory.getInstance(PBKDF2);
        KeySpec spec = new PBEKeySpec(password.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), 65_536, 256);
        return new SecretKeySpec(factory.generateSecret(spec).getEncoded(), AES);
    }
}
