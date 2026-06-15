package pl.qprogramming.devinbox.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers one Springdoc group per modulith module so each module gets its own
 * Swagger UI tab and its own /v3/api-docs/{group} endpoint.
 * When a module is extracted into a microservice the matching group simply moves
 * with it — no Swagger config changes needed.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public GroupedOpenApi sharedApi() {
        return GroupedOpenApi.builder()
                .group("shared")
                .packagesToScan("pl.qprogramming.devinbox.shared.api")
                .build();
    }

    @Bean
    public GroupedOpenApi inboxApi() {
        return GroupedOpenApi.builder()
                .group("inbox")
                .packagesToScan("pl.qprogramming.devinbox.inbox.api")
                .build();
    }

    @Bean
    public GroupedOpenApi notesApi() {
        return GroupedOpenApi.builder()
                .group("notes")
                .packagesToScan("pl.qprogramming.devinbox.notes.api")
                .build();
    }

    @Bean
    public GroupedOpenApi identityApi() {
        return GroupedOpenApi.builder()
                .group("identity")
                .packagesToScan("pl.qprogramming.devinbox.identity.api")
                .pathsToMatch("/api/settings/**")
                .build();
    }

    @Bean
    public GroupedOpenApi authApi() {
        return GroupedOpenApi.builder()
                .group("auth")
                .packagesToScan("pl.qprogramming.devinbox.identity.api")
                .pathsToMatch("/api/auth/**")
                .build();
    }

    @Bean
    public GroupedOpenApi syncApi() {
        return GroupedOpenApi.builder()
                .group("sync")
                .packagesToScan("pl.qprogramming.devinbox.sync.api")
                .build();
    }
}
