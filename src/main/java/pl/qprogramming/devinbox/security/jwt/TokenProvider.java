package pl.qprogramming.devinbox.security.jwt;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;
import pl.qprogramming.devinbox.config.ApplicationProperties;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Component
public class TokenProvider {

    private static final Logger log = LoggerFactory.getLogger(TokenProvider.class);

    private static final String AUTHORITIES_KEY = "auth";
    private static final String ID_KEY = "id";

    private final ApplicationProperties applicationProperties;

    /**
     * Derives a 64-byte HMAC-SHA-512 key from the configured secret.
     * If the raw secret is shorter than 64 bytes (the minimum for HS512), it is stretched
     * via SHA-512 so the key always meets the algorithm's requirements.
     */
    private byte[] secretBytes() {
        String secret = applicationProperties.getJwt().getSecret();
        byte[] keyBytes;
        try {
            // Try Base64-decoded first; fall back to raw UTF-8
            keyBytes = java.util.Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 64) {
            try {
                keyBytes = MessageDigest.getInstance("SHA-512").digest(keyBytes);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-512 algorithm unavailable", e);
            }
        }
        return keyBytes;
    }

    public String createToken(Authentication authentication, Long userId) {
        String authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        Date expiry = new Date(System.currentTimeMillis() + applicationProperties.getJwt().getExpirationMs());

        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(authentication.getName())
                    .expirationTime(expiry)
                    .claim(AUTHORITIES_KEY, authorities)
                    .claim(ID_KEY, userId)
                    .build();

            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);
            JWSSigner signer = new MACSigner(secretBytes());
            jwt.sign(signer);
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create JWT token", e);
        }
    }

    public Authentication getAuthentication(String token) {
        try {
            JWTClaimsSet claims = SignedJWT.parse(token).getJWTClaimsSet();

            Collection<? extends GrantedAuthority> authorities = Arrays
                    .stream(claims.getStringClaim(AUTHORITIES_KEY).split(","))
                    .filter(auth -> !auth.isBlank())
                    .map(SimpleGrantedAuthority::new)
                    .toList();

            User principal = new User(claims.getSubject(), "", authorities);
            return new UsernamePasswordAuthenticationToken(principal, token, authorities);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot parse JWT token", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            JWSVerifier verifier = new MACVerifier(secretBytes());
            return jwt.verify(verifier)
                    && new Date().before(jwt.getJWTClaimsSet().getExpirationTime());
        } catch (Exception e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }
}
