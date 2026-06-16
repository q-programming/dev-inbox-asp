package pl.qprogramming.devinbox.shared.utils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.experimental.UtilityClass;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pl.qprogramming.devinbox.security.jwt.JwtFilter;

import java.util.Objects;

@UtilityClass
public class CookieUtils {

    /**
     * Sets a JWT cookie in the current HTTP response.
     *
     * @param jwt the JWT token to be set in the cookie
     */
    public static void setJwtCookie(String jwt, int expirationMs) {
        Cookie cookie = new Cookie(JwtFilter.JWT_COOKIE_NAME, jwt);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(expirationMs / 1000);
        currentResponse().addCookie(cookie);
    }

    /**
     * Clears the JWT cookie from the current HTTP response.
     */
    public static void clearJwtCookie() {
        Cookie cookie = new Cookie(JwtFilter.JWT_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        currentResponse().addCookie(cookie);
    }

    /**
     * Retrieves the current HttpServletResponse.
     *
     * @return the current HttpServletResponse
     * @throws NullPointerException if the current request attributes or response are null
     */
    private HttpServletResponse currentResponse() {
        return ((ServletRequestAttributes) Objects.requireNonNull(
                RequestContextHolder.getRequestAttributes())).getResponse();
    }


}
