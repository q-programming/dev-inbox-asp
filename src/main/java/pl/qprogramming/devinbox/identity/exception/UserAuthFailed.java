package pl.qprogramming.devinbox.identity.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class UserAuthFailed extends RuntimeException {
    public UserAuthFailed(String message) {
        super(message);
    }
}
