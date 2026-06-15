package pl.qprogramming.devinbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pl.qprogramming.devinbox.config.PostgresTestContainerConfig;

/**
 * Base class for full-stack integration tests.
 *
 * <p>Starts the complete Spring Boot application context against a real PostgreSQL
 * container (via {@link PostgresTestContainerConfig}) and wires a security-aware
 * {@link MockMvc} ready for use in every subclass.
 *
 * <p>Convention:
 * <ul>
 *   <li>Subclasses named {@code *IT} run the full stack end-to-end.</li>
 *   <li>Add module-specific {@code @Autowired} fields (repositories, services) in the subclass.</li>
 *   <li>Add a {@code @BeforeEach} in the subclass to clear module-specific repository state
 *       before each test — {@code MockMvc} is guaranteed to be ready before any subclass
 *       {@code @BeforeEach} runs because the base {@code setUpMockMvc()} uses the same annotation.</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(PostgresTestContainerConfig.class)
public abstract class AbstractIntegrationTest {

    @Autowired
    protected WebApplicationContext wac;

    @Autowired
    protected ObjectMapper objectMapper;

    protected MockMvc mockMvc;

    @BeforeEach
    void setUpMockMvc() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }
}
