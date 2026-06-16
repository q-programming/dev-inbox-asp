/**
 * Identity module — user entity, authentication (login/register), Spring Security integration,
 * OAuth2 success handling, and per-user integration credentials (GitHub PAT, ADO PAT/org).
 *
 * <p>Allowed dependencies:
 * <ul>
 *   <li>{@code security}      — root package: {@code EncryptionService} used by the JPA
 *       token converter ({@code TokenEncryptionConverter}).</li>
 *   <li>{@code security::jwt} — named interface: {@code TokenProvider} used by the API delegate
 *       ({@code AuthApiDelegateImpl}) and the OAuth2 success handler to issue JWTs.</li>
 *   <li>{@code shared}        — root package: {@code ApplicationProperties} (JWT expiry config)
 *       consumed by the API delegate and the OAuth2 success handler.</li>
 *   <li>{@code shared::utils} — named interface: {@code CookieUtils} (cookie lifecycle)
 *       and {@code SecurityUtils} (current-user lookup).</li>
 * </ul>
 *
 * <p>{@code UserService} is intentionally free of JWT and cookie concerns — those are owned
 * by {@code AuthApiDelegateImpl} so the service layer stays focused on user operations.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"security", "security::jwt", "shared", "shared::utils"})
package pl.qprogramming.devinbox.identity;
