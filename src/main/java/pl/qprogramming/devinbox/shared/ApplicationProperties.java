package pl.qprogramming.devinbox.shared;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "application", ignoreUnknownFields = false)
@Getter
@Setter
public class ApplicationProperties {
    private JWT jwt;
    private Encryption encryption;
    private Database databaseInitializer;

    /**
     * Base URL of the frontend application.
     * Set this when the frontend runs on a different origin than the backend (e.g. local dev
     * with Vite on port 3000 and Spring Boot on port 8080).
     * Leave empty in production where both are served from the same origin.
     */
    private String frontendUrl = "";

    @Getter
    @Setter
    public static class Database {
        private boolean enabled;
    }

    @Getter
    @Setter
    public static class JWT {
        private String secret;
        private long expirationMs;
    }

    @Getter
    @Setter
    public static class Encryption {
        private String password;
        private String salt;
    }

}
