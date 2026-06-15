package pl.qprogramming.devinbox.identity.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.qprogramming.devinbox.security.jwt.TokenEncryptionConverter;

@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "app_user_seq")
    @SequenceGenerator(name = "app_user_seq", sequenceName = "app_user_seq", allocationSize = 1)
    private Long id;

    @NotNull
    @Size(max = 50)
    @Column(name = "first_name", length = 50)
    private String firstName;

    @NotNull
    @Size(max = 50)
    @Column(name = "last_name", length = 50)
    private String lastName;

    @Email
    @NotNull
    @Size(min = 5, max = 254)
    @Column(length = 254, unique = true, nullable = false)
    private String email;

    @JsonIgnore
    @Size(max = 60)
    @Column(name = "password_hash", length = 60)
    private String passwordHash;

    /**
     * GitHub OAuth access token captured at login.
     * Used as the default token for GitHub API calls so users don't need to
     * configure a PAT manually. A PAT in settings overrides this when present.
     * Encrypted at rest via AES-256-GCM; rotate by re-logging in.
     */
    @JsonIgnore
    @Convert(converter = TokenEncryptionConverter.class)
    @Column(name = "github_token", length = 512)
    private String githubToken;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false)
    private AccountType accountType;

    @Column(nullable = false)
    @Builder.Default
    private boolean activated = false;

    public enum AccountType {
        REGULAR,
        OAUTH_GITHUB
    }
}
