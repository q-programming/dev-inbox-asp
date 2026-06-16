package pl.qprogramming.devinbox.identity.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pl.qprogramming.devinbox.identity.dto.LoginRequest;
import pl.qprogramming.devinbox.identity.dto.RegisterRequest;
import pl.qprogramming.devinbox.identity.dto.UserDto;
import pl.qprogramming.devinbox.identity.mapper.AccountMapper;
import pl.qprogramming.devinbox.identity.service.UserService;
import pl.qprogramming.devinbox.security.jwt.TokenProvider;
import pl.qprogramming.devinbox.shared.ApplicationProperties;

import static pl.qprogramming.devinbox.shared.utils.CookieUtils.clearJwtCookie;
import static pl.qprogramming.devinbox.shared.utils.CookieUtils.setJwtCookie;

@RequiredArgsConstructor
@Component
public class AuthApiDelegateImpl implements AuthApiDelegate {

    private final AccountMapper accountMapper;
    private final UserService userService;
    private final TokenProvider tokenProvider;
    private final ApplicationProperties applicationProperties;
    private final HttpServletRequest httpServletRequest;

    @Override
    public ResponseEntity<UserDto> register(RegisterRequest request) {
        val saved = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountMapper.userToUserDto(saved));
    }

    @Override
    public ResponseEntity<UserDto> login(LoginRequest request) {
        val result = userService.login(request);
        val jwt = tokenProvider.createToken(result.authentication(), result.user().getId());
        setJwtCookie(jwt, (int) applicationProperties.getJwt().getExpirationMs());
        return ResponseEntity.ok(accountMapper.userToUserDto(result.user()));
    }

    @Override
    public ResponseEntity<Void> logout() {
        clearJwtCookie();
        // Invalidate the server-side session so the JSESSIONID cannot be used to re-authenticate
        // after the JWT cookie has been cleared (e.g. after OAuth2 login creates a session).
        HttpSession session = httpServletRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<UserDto> me() {
        return userService.currentUser()
                .map(accountMapper::userToUserDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}

