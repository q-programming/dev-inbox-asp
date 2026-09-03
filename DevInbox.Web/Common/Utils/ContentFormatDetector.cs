using System.Text.RegularExpressions;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Common.Utils;

/// <summary>
/// Sniffs whether a rich-text field (Azure DevOps work item/PR description or comment body) is
/// HTML or Markdown, so the format only needs to be detected once — right after it's fetched from
/// the integration — rather than re-derived by the frontend on every render.
/// Azure DevOps has no API-level indicator for this: depending on whether the author used the
/// rich-text editor or toggled "switch to Markdown editor" (per field/comment, not per organization),
/// the same <c>text</c>/<c>description</c> property can come back as either HTML markup or raw
/// Markdown source. GitHub content, by contrast, is always GitHub-flavoured Markdown, so callers
/// for that integration should set <see cref="ContentFormat.Markdown"/> directly instead of calling
/// this detector.
/// </summary>
public static partial class ContentFormatDetector
{
    // Matches an opening HTML tag, e.g. "<div>", "<a href="...">", "<br/>" — good enough to
    // distinguish "this is markup" from "this is plain text or Markdown syntax" without pulling in
    // a full HTML parser just to classify content.
    [GeneratedRegex(@"<[a-zA-Z][^>]*>")]
    private static partial Regex HtmlTagRegex();

    /// <summary>
    /// Detects the format of a rich-text field's raw content. Empty/whitespace-only content is
    /// classified as <see cref="ContentFormat.PlainText"/> (nothing to render as either markup or
    /// Markdown); anything containing an HTML tag is <see cref="ContentFormat.Html"/>; everything
    /// else is assumed to be <see cref="ContentFormat.Markdown"/> (plain text renders identically
    /// either way, so defaulting to Markdown here avoids a third render path on the frontend).
    /// </summary>
    public static ContentFormat Detect(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return ContentFormat.PlainText;
        }

        return HtmlTagRegex().IsMatch(content) ? ContentFormat.Html : ContentFormat.Markdown;
    }
}
