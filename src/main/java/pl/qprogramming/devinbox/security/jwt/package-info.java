/**
 * JWT token infrastructure — JwtFilter and TokenProvider — exposed as a named interface
 * so other modules can depend on JWT types via {@code security::jwt} in their
 * {@code allowedDependencies}.
 */
@org.springframework.modulith.NamedInterface("jwt")
package pl.qprogramming.devinbox.security.jwt;
