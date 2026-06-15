package pl.qprogramming.devinbox.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Utility for loading JSON fixture files from the test classpath.
 *
 * <p>Fixtures live in {@code src/test/resources/data/} grouped by domain:
 * <ul>
 *   <li>{@code data/auth/register-request.json}
 *   <li>{@code data/auth/login-request.json}
 *   <li>{@code data/auth/stored-user.json}
 * </ul>
 *
 * <p>Usage:
 * <pre>{@code
 *   val request = readFixture("data/auth/register-request.json", RegisterRequest.class);
 *   val body    = readJson("data/auth/register-request.json");
 * }</pre>
 */
public final class TestFixtures {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Deserialises a classpath JSON fixture into the requested type.
     *
     * @param resource classpath-relative path under {@code src/test/resources/}
     * @param type     target class
     */
    public static <T> T readFixture(String resource, Class<T> type) throws IOException {
        try (InputStream is = new ClassPathResource(resource).getInputStream()) {
            return MAPPER.readValue(is, type);
        }
    }

    /**
     * Returns the raw JSON string from a classpath fixture file.
     * Suitable for use as a MockMvc request body.
     */
    public static String readJson(String resource) throws IOException {
        try (InputStream is = new ClassPathResource(resource).getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private TestFixtures() {
    }
}
