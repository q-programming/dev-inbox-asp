package pl.qprogramming.devinbox.identity.api;

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

@RequiredArgsConstructor
@Component
public class AuthApiDelegateImpl implements AuthApiDelegate {

    private final AccountMapper accountMapper;
    private final UserService userService;

    @Override
    public ResponseEntity<UserDto> register(RegisterRequest request) {
        val saved = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountMapper.userToUserDto(saved));
    }

    @Override
    public ResponseEntity<UserDto> login(LoginRequest request) {
        val user = userService.login(request);
        return ResponseEntity.ok(accountMapper.userToUserDto(user));
    }

    @Override
    public ResponseEntity<Void> logout() {
        userService.logout();
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<UserDto> me() {
        val user = userService
                .currentUser()
                .map(accountMapper::userToUserDto);
        return user
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
