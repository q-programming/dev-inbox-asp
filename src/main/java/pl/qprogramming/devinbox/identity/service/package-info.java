/**
 * Exposed as a named interface so the {@code config} module can wire
 * {@code UserDetailsServiceImpl} into the Spring Security filter chain
 * without accessing the rest of the {@code identity} module internals.
 */
@org.springframework.modulith.NamedInterface("service")
package pl.qprogramming.devinbox.identity.service;
