import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Content formats a comment/description body may arrive in from an integration.
 * GitHub always returns GitHub-flavoured markdown. Azure DevOps' rich-text fields can be
 * either markdown or HTML depending on the API/editor used to author them — once the real
 * ADO client is wired, each call site should pass whichever format that field actually is.
 */
export type RichContentFormat = 'markdown' | 'html';

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
  '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
  '& ul, & ol': { my: 1, pl: 3 },
  '& pre': {
    bgcolor: 'action.hover',
    p: 1.5,
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
  '& pre code': { bgcolor: 'transparent', p: 0 },
  '& blockquote': {
    m: 0,
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

/**
 * Renders a rich-text comment/description body read-only, shared by every integration's detail
 * panel (GitHub, ADO, ...). `format` picks the renderer:
 * - `markdown` (default): GitHub-flavoured markdown via react-markdown + remark-gfm.
 * - `html`: not wired yet — no integration currently returns real HTML content. Once ADO's
 *   real API is hooked up, add a sanitize-then-render branch here (e.g. dompurify +
 *   dangerouslySetInnerHTML) rather than in a per-feature component.
 */
const RichContent = ({ children, format = 'markdown' }: IRichContent) => (
  <Box sx={richContentSx}>
    {format === 'html' ? children : <MarkdownContent>{children}</MarkdownContent>}
  </Box>
);

export default RichContent;
