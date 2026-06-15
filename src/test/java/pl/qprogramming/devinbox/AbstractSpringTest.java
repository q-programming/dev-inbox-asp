package pl.qprogramming.devinbox;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.PropertySource;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import pl.qprogramming.devinbox.shared.ApplicationProperties;
import pl.qprogramming.devinbox.utils.YamlPropertySourceFactory;

/**
 * Base class for lightweight unit tests that need real Spring-bound configuration
 * without starting the full application context.
 *
 * <p>Loads {@code application-test.yml} so every subclass can simply
 * {@code @Autowired ApplicationProperties applicationProperties} — no manual property
 * construction, no duplicated constants.
 *
 * <p>Tests that also need Mockito mocks should add
 * {@code @ExtendWith(MockitoExtension.class)} and manually construct their
 * subject-under-test in {@code @BeforeEach}, injecting the mocks together with
 * the inherited {@link #applicationProperties}.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = AbstractSpringTest.Config.class)
public abstract class AbstractSpringTest {

    @Autowired
    protected ApplicationProperties applicationProperties;

    @EnableConfigurationProperties(ApplicationProperties.class)
    @PropertySource(
            value = "classpath:application-test.yml",
            factory = YamlPropertySourceFactory.class)
    static class Config {
    }
}
