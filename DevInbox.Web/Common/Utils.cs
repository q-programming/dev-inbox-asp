namespace DevInbox.Web.Common;

public static class Utils
{
    /// <summary>
    /// Normalizes an email address by trimming whitespace and converting to lowercase.
    /// Returns null if the input email is null.
    /// </summary>
    public static string? NormalizeEmail(string email)
    {
        return email?.Trim().ToLower();
    }
}