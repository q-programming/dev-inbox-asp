/**
 * Configuration module — application wiring, security filter chain, OpenAPI config, Jackson config.
 *
 * <p>Allowed dependencies:
 * <ul>
 *   <li>{@code security::jwt}     — named interface: {@code JwtFilter} and {@code TokenProvider}
 *       wired into the {@link org.springframework.security.web.SecurityFilterChain}.</li>
 *   <li>{@code identity::service} — named interface: {@code UserDetailsServiceImpl}
 *       wired as the Spring Security user-details provider.</li>
 *   <li>{@code identity::oauth}   — named interface: {@code OAuth2AuthenticationSuccessHandler}
 *       wired as the OAuth2 login success handler.</li>
 * </ul>
 *
 * <p>{@code ApplicationProperties} is no longer wired here — JWT expiry and cookie lifecycle
 * are owned by the {@code identity} API delegate.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"security::jwt", "identity::service", "identity::oauth"})
package pl.qprogramming.devinbox.config;
