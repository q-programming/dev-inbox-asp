package pl.qprogramming.devinbox.identity.mapper;

import org.mapstruct.Mapper;
import pl.qprogramming.devinbox.identity.domain.User;
import pl.qprogramming.devinbox.identity.dto.UserDto;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    UserDto userToUserDto(User user);
}
