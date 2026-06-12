package pl.qprogramming.devinbox;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Application context integration test with a real PostgreSQL container.
 * Verifies that the Spring context loads without errors, all Flyway
 * migrations run, and all beans are wired correctly.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(PostgresTestContainerConfig.class)
class ApplicationBootstrapTest {

    @Test
    @DisplayName("Spring application context loads successfully")
    void contextLoads() {
        // passes if the Spring context starts without throwing
    }
}
