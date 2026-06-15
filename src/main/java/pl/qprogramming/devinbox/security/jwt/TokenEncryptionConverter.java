package pl.qprogramming.devinbox.security.jwt;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import pl.qprogramming.devinbox.security.EncryptionService;

import java.util.Objects;

/**
 * JPA converter that transparently encrypts/decrypts OAuth tokens stored in the DB.
 *
 * <p>Why field injection here: JPA spec requires a no-arg constructor on every
 * {@link AttributeConverter} so Hibernate can instantiate the class during
 * entity-manager bootstrap. Lombok's {@code @RequiredArgsConstructor} only
 * generates the all-args constructor, which causes a {@link NoSuchMethodException}
 * at startup. Using {@code @Autowired} field injection lets Hibernate create the
 * instance with the implicit no-arg constructor while Spring Boot's
 * {@code SpringBeanContainer} integration ensures the Spring-managed bean
 * (with the injected service) is the one actually used at runtime.
 */
@Converter
@Component
public class TokenEncryptionConverter implements AttributeConverter<String, String> {

    @Autowired
    private EncryptionService encryptionService;

    @PostConstruct
    public void validate() {
        Objects.requireNonNull(encryptionService,
                "EncryptionService was not injected — converter was instantiated outside Spring context");
    }

    @Override
    public String convertToDatabaseColumn(String plainText) {
        return encryptionService.encrypt(plainText);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return encryptionService.decrypt(dbData);
    }
}
