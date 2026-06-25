using DevInbox.Web.Infrastructure.Security;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DevInbox.Web.Infrastructure.Persistence;

/// <summary>
/// EF Core value converter that transparently encrypts on write and decrypts on read
/// using <see cref="EncryptionService"/>. Equivalent to a JPA <c>AttributeConverter</c>.
/// </summary>
public class EncryptedStringConverter(EncryptionService encryption)
    : ValueConverter<string?, string?>(
        value => encryption.Encrypt(value),
        value => encryption.Decrypt(value));
