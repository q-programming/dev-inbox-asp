namespace DevInbox.Web.Common.Utils;

public static class EmailUtils
{
    /// <summary>
    /// Masks the given email address by showing only the first character of the local part
    /// and the first character of the domain part, replacing the rest with asterisks.
    /// </summary>
    /// <param name="email">The email address to be masked.</param>
    /// <returns>The masked email address.</returns>
    public static string MaskEmail(string? email)
    {
        if (string.IsNullOrEmpty(email))
        {
            return "***";
        }

        var atIndex = email.IndexOf('@');
        if (atIndex <= 0)
        {
            return "***";
        }

        var localPart = email[..atIndex];
        var domain = email[(atIndex + 1)..];

        var maskedLocal = $"{localPart[0]}***";

        var dotIndex = domain.IndexOf('.');
        var maskedDomain = dotIndex > 0
            ? $"{domain[0]}***{domain[dotIndex..]}"
            : $"{domain[0]}***";

        return $"{maskedLocal}@{maskedDomain}";
    }

    /// <summary>
    /// Normalizes an email address by trimming whitespace and converting to lowercase.
    /// Returns null if the input email is null.
    /// </summary>
    public static string? NormalizeEmail(string email)
    {
        return email?.Trim().ToLower();
    }
}
