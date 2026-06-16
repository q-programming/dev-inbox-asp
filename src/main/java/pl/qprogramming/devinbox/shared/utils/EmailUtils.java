package pl.qprogramming.devinbox.shared.utils;

import lombok.experimental.UtilityClass;

@UtilityClass
public class EmailUtils {

    /**
     * Masks the given email address by showing only the first character of the local part
     * and the first character of the domain part, replacing the rest with asterisks
     * @param email the email address to be masked
     * @return the masked email address
     */
    public static String maskEmail(String email) {
        if (email == null || email.isEmpty()) {
            return "***";
        }

        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "***";
        }

        String localPart = email.substring(0, atIndex);
        String domain = email.substring(atIndex + 1);

        String maskedLocal = localPart.charAt(0) + "***";

        int dotIndex = domain.indexOf('.');
        String maskedDomain = dotIndex > 0
            ? domain.charAt(0) + "***" + domain.substring(dotIndex)
            : domain.charAt(0) + "***";

        return maskedLocal + "@" + maskedDomain;
    }
}
