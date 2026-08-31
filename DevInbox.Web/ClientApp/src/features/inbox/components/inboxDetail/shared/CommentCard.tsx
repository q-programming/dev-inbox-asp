import { PersonReference } from '@api';
import Link from '@mui/material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { formatRelativeTime } from '@utils/date';
import PersonAvatar from './PersonAvatar';
import RichContent, { RichContentFormat } from './RichContent';

interface ICommentCard {
  author?: PersonReference;
  body?: string;
  createdAt?: Date;
  format?: RichContentFormat;
  /** External URL to the comment/item, shown as an "open" icon-link next to the timestamp. */
  externalUrl?: string;
  externalUrlLabel?: string;
  authorTestId?: string;
  bodyTestId?: string;
}

/**
 * Shared comment/discussion entry card used by every integration's detail panel
 * (GitHub PR comments, ADO work item comments, ...). Rich body content is rendered via
 * `RichContent`, so each integration only needs to pass its own `format`.
 */
const CommentCard = ({
  author,
  body,
  createdAt,
  format,
  externalUrl,
  externalUrlLabel = 'Open',
  authorTestId,
  bodyTestId,
}: ICommentCard) => (
  <Paper variant="outlined" sx={{ padding: 2, bgcolor: 'action.hover', minWidth: 0, mt: 1 }}>
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <PersonAvatar person={author} size={24} />
        <Typography data-testid={authorTestId} variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {author?.displayName ?? author?.login}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {formatRelativeTime(createdAt)}
        </Typography>
      </Stack>
      {!!externalUrl && (
        <Tooltip title={externalUrlLabel}>
          <Link
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            underline="hover"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}
          >
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
        </Tooltip>
      )}
    </Stack>

    <Typography data-testid={bodyTestId} variant="body2" sx={{ mb: 1.5 }} component="div">
      <RichContent format={format}>{body ?? ''}</RichContent>
    </Typography>
  </Paper>
);

export default CommentCard;
