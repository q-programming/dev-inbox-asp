package pl.qprogramming.devinbox;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Application context integration test with a real PostgreSQL container.
 * Verifies that the Spring context loads without errors, all Flyway
 * migrations run, and all beans are wired correctly.
 */
class ApplicationBootstrapTest extends AbstractIntegrationTest {

    @Test
    @DisplayName("Spring application context loads successfully")
    void contextLoads() {
        // passes if the Spring context starts without throwing
    }
}
