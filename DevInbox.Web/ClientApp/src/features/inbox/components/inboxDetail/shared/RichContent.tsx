import { ContentFormat } from '@api';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Content formats a comment/description body may arrive in from an integration. The backend
 * detects this once (see `ContentFormatDetector` in `AdoService`) and sends it alongside the
 * body, so this component never needs its own format-sniffing logic:
 * - GitHub content is always `markdown` (GitHub-flavoured).
 * - Azure DevOps descriptions/comments can be `html` (rich-text editor) or `markdown` (Azure
 *   DevOps' "switch to Markdown editor" toggle) per field/comment — there's no reliable
 *   indicator from the API itself, which is exactly why the backend sniffs and tags it.
 * - `plainText` covers empty/whitespace bodies (nothing to parse either way).
 */
export type RichContentFormat = ContentFormat;

interface IRichContent {
  /** Raw content, e.g. a GitHub PR body/comment (markdown) or an ADO description/comment (markdown or html). */
  children: string;
  format?: RichContentFormat;
}

const richContentSx = {
  minWidth: 0,
  wordBreak: 'break-word',
  fontSize: '0.875rem',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  '& p': { margin: 0, marginBottom: 1, '&:last-child': { marginBottom: 0 } },
  '& ul, & ol': { my: 1, pl: 3 },
  '& pre': {
    bgcolor: 'action.hover',
    padding: 1.5,
    borderRadius: 1,
    overflow: 'auto',
  },
  '& code': {
    bgcolor: 'action.hover',
    px: 0.5,
    borderRadius: 0.5,
    fontFamily: 'monospace',
    fontSize: '0.85em',
  },
  '& pre code': { bgcolor: 'transparent', padding: 0 },
  '& blockquote': {
    margin: 0,
    pl: 1.5,
    borderLeft: 3,
    borderColor: 'divider',
    color: 'text.secondary',
  },
  '& table': { borderCollapse: 'collapse', width: '100%' },
  '& th, & td': { border: 1, borderColor: 'divider', px: 1, py: 0.5 },
  '& img': { maxWidth: '100%' },
} as const;

const MarkdownContent = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      // eslint-disable-next-line id-length -- react-markdown's `components` API keys map to HTML tag names (here, the anchor tag).
      a: ({ href, children: linkChildren }) => (
        <Link href={href} target="_blank" rel="noopener noreferrer">
          {linkChildren}
        </Link>
      ),
    }}
  >
    {children}
  </ReactMarkdown>
);

/** Sanitizes raw HTML (e.g. an Azure DevOps rich-text field) before rendering it, stripping scripts/event handlers/etc. */
const HtmlContent = ({ children }: { children: string }) => {
  const sanitized = useMemo(() => DOMPurify.sanitize(children), [children]);
  // eslint-disable-next-line react/no-danger -- content is sanitized via DOMPurify immediately above.
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

/**
 * Renders a rich-text comment/description body read-only, shared by every integration's detail
 * panel (GitHub, ADO, ...). `format` (from the backend-provided `ContentFormat`) picks the renderer:
 * - `markdown` (default): GitHub-flavoured markdown via react-markdown + remark-gfm.
 * - `html`: sanitized via DOMPurify, then rendered as real markup (Azure DevOps rich-text fields).
 * - `plainText`: rendered verbatim in a plain div (whitespace preserved via `richContentSx`).
 */
const RichContent = ({ children, format = ContentFormat.Markdown }: IRichContent) => (
  <Box sx={richContentSx}>
    {format === ContentFormat.Html && <HtmlContent>{children}</HtmlContent>}
    {format === ContentFormat.PlainText && <div>{children}</div>}
    {format === ContentFormat.Markdown && <MarkdownContent>{children}</MarkdownContent>}
  </Box>
);

export default RichContent;
