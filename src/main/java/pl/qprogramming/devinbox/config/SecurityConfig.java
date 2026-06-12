package pl.qprogramming.devinbox.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/healthz", "/actuator/health", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().permitAll() // MVP: no auth yet — replace with .authenticated() when ready
            )
            .csrf(csrf -> csrf.disable()); // disable for REST API; re-enable with proper token config when adding auth
        return http.build();
    }
}
