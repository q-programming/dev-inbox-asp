package pl.qprogramming.devinbox.security.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;
import pl.qprogramming.devinbox.config.ApplicationProperties;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.domain.UserRepository;
import pl.qprogramming.devinbox.security.jwt.TokenProvider;

import java.io.IOException;
import java.util.List;

import static pl.qprogramming.devinbox.shared.utils.CookieUtils.setJwtCookie;

@Slf4j
@RequiredArgsConstructor
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    public static final String EMAIL = "email";
    public static final String LOGIN = "login";
    public static final String NAME = "name";
    public static final String GITHUB_INVALID = "@github.invalid";
    private final TokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final ApplicationProperties applicationProperties;
    private final OAuth2AuthorizedClientService authorizedClientService;

    @Override
    @Transactional
    public void onAuthenticationSuccess(@NonNull HttpServletRequest request,
                                        @NonNull HttpServletResponse response,
                                        @NonNull Authentication authentication) throws IOException {
        val oAuth2User = (OAuth2User) authentication.getPrincipal();
        if (ObjectUtils.isEmpty(oAuth2User)) {
            throw new IllegalStateException("Something went horribly wrong and we have not recived user");
        }

        String email = oAuth2User.getAttribute(EMAIL);
        String login = oAuth2User.getAttribute(LOGIN);
        String name = oAuth2User.getAttribute(NAME);

        if (email == null || email.isBlank()) {
            email = login + GITHUB_INVALID;
        }
        // Extract the GitHub access token (scope: read:user,user:email,repo) so the sync
        // module can call the GitHub API without requiring the user to set up a PAT manually.
        String githubAccessToken = extractGithubToken(authentication);
        final String resolvedEmail = email;
        String[] nameParts = (name != null && !name.isBlank())
                ? name.split(" ", 2)
                : new String[]{login != null ? login : "", ""};

        final String resolvedToken = githubAccessToken;
        User user = userRepository.findByEmailIgnoreCase(resolvedEmail)
                .map(existing -> {
                    // Refresh the token on every login so it stays current.
                    if (resolvedToken != null) {
                        existing.setGithubToken(resolvedToken);
                    }
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    val newUser = User.builder()
                            .firstName(nameParts[0])
                            .lastName(nameParts.length > 1 ? nameParts[1] : "")
                            .email(resolvedEmail)
                            .accountType(User.AccountType.OAUTH_GITHUB)
                            .activated(true)
                            .githubToken(resolvedToken)
                            .build();
                    return userRepository.save(newUser);
                });
        var userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(), "", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        var springAuth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        String jwt = tokenProvider.createToken(springAuth, user.getId());
        setJwtCookie(jwt, (int) applicationProperties.getJwt().getExpirationMs());
        log.debug("OAuth2 login succeeded for {}, github token captured: {}", user.getEmail(), resolvedToken != null);
        // In production the frontend is served from the same origin, so "/" is correct.
        // In local development the Vite dev server runs on a different port; frontendUrl
        // is configured to point there so the browser lands on the React app after OAuth.
        String frontendUrl = applicationProperties.getFrontendUrl();
        String redirectTarget = (frontendUrl != null && !frontendUrl.isBlank())
                ? frontendUrl + "/"
                : "/";
        getRedirectStrategy().sendRedirect(request, response, redirectTarget);
    }

    /**
     * Extracts the GitHub OAuth access token from the authorised-client registry.
     * Returns {@code null} if the client cannot be loaded (should not happen during a success callback).
     */
    private String extractGithubToken(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            return null;
        }
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                oauthToken.getAuthorizedClientRegistrationId(),
                oauthToken.getName());
        if (client == null || client.getAccessToken() == null) {
            log.warn("Could not load GitHub authorized client for principal {}", oauthToken.getName());
            return null;
        }
        return client.getAccessToken().getTokenValue();
    }
}
