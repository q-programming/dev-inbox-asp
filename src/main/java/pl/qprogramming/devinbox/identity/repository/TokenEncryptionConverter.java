package pl.qprogramming.devinbox.identity.repository;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import pl.qprogramming.devinbox.security.EncryptionService;

import java.util.Objects;

/**
 * JPA converter that transparently encrypts/decrypts OAuth tokens stored in the DB.
 *
 * <p>Why a package-private no-arg constructor exists: JPA spec requires a no-arg constructor
 * on every {@link AttributeConverter} so Hibernate can instantiate the class during
 * entity-manager bootstrap. Constructor injection is used for the Spring-managed instance
 * (which is the one actually used at runtime via Hibernate's {@code SpringBeanContainer}
 * integration). The no-arg constructor is only used by Hibernate during schema introspection;
 * calling convert methods on such an instance would throw because {@code encryptionService}
 * would be null — but Spring Boot ensures the Spring-managed bean is always used instead.
 */
@Converter
@Component
public class TokenEncryptionConverter implements AttributeConverter<String, String> {

    private final EncryptionService encryptionService;

    /**
     * Required by JPA / Hibernate bootstrap — Spring-managed bean is used at runtime.
     */
    @SuppressWarnings("unused")
    TokenEncryptionConverter() {
        this.encryptionService = null;
    }

    @Autowired
    public TokenEncryptionConverter(EncryptionService encryptionService) {
        this.encryptionService = Objects.requireNonNull(encryptionService,
                "EncryptionService must not be null");
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

