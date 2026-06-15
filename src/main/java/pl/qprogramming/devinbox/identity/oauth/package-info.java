/**
 * Exposed as a named interface so the {@code config} module can wire
 * {@code OAuth2AuthenticationSuccessHandler} into the Spring Security OAuth2 login flow
 * without accessing the rest of the {@code identity} module internals.
 */
@org.springframework.modulith.NamedInterface("oauth")
package pl.qprogramming.devinbox.identity.oauth;
