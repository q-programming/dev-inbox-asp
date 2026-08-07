import { InboxItemDetail, PersonReference } from '@api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatRelativeTime } from '@utils/date';
import { REASON_CHIP_COLOR, translateInboxReason } from '@feature/inbox/utils/reason';
import InboxDetailHeader from '../InboxDetailHeader';
import InboxDetailFooter from '../InboxDetailFooter';

interface IAdoDetail {
  details: InboxItemDetail;
}

/** Builds up-to-two-letter initials from a display name, for avatar fallbacks. */
const initials = (name?: string): string =>
  name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') ?? '?';

const PersonAvatar = ({ person, size = 32 }: { person?: PersonReference; size?: number }) => (
  <Avatar
    src={person?.avatarUrl ?? undefined}
    sx={{ width: size, height: size, fontSize: size * 0.4 }}
  >
    {initials(person?.displayName)}
  </Avatar>
);

const AdoDetail = ({ details }: IAdoDetail) => {
  const workItem = details.ado ?? {};

  return (
    <Box
      data-testid="ado-detail"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <InboxDetailHeader details={details} url={workItem?.url} />

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: { xs: 2, md: 3 },
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
        >
          {!!workItem.workItemType && (
            <Typography variant="body2" color="text.secondary">
              {workItem.workItemType}
            </Typography>
          )}
          {!!workItem.workItemId && (
            <Typography variant="body2" color="text.secondary">
              #{workItem.workItemId}
            </Typography>
          )}
          {!!details.reason && (
            <Chip
              data-testid="ado-detail-reason-chip"
              data-reason={details.reason}
              size="small"
              color={REASON_CHIP_COLOR[details.reason] ?? 'default'}
              label={translateInboxReason(details.reason)}
            />
          )}
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
          {(!!workItem.state || !!workItem.area) && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                columnGap: 4,
                rowGap: 0.5,
                mb: 2.5,
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Status
              </Typography>
              <Typography variant="overline" color="text.secondary">
                Area Path
              </Typography>
              <Typography variant="body2" data-testid="ado-detail-status" noWrap>
                {workItem.state ?? '—'}
              </Typography>
              <Typography variant="body2" data-testid="ado-detail-area" noWrap>
                {workItem.area ?? '—'}
              </Typography>
            </Box>
          )}

          {!!workItem.description && (
            <Box sx={{ minWidth: 0 }} data-testid="ado-detail-description">
              <Typography variant="overline" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {workItem.description}
              </Typography>
            </Box>
          )}

          {!!workItem.tags?.length && (
            <Box sx={{ mt: 2.5 }} data-testid="ado-detail-tags">
              <Typography variant="overline" color="text.secondary">
                Tags
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.75 }}
              >
                {workItem.tags.map((tag) => (
                  <Chip key={tag} size="small" label={tag} />
                ))}
              </Stack>
            </Box>
          )}

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', mt: 2.5, minWidth: 0 }}
          >
            <PersonAvatar person={workItem.assignedTo} size={28} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                assigned to{' '}
                <Box component="span" data-testid="ado-detail-assignee-name">
                  {workItem.assignedTo?.displayName ?? workItem.assignedTo?.login ?? 'unassigned'}
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatRelativeTime(workItem.createdAt)}
              </Typography>
            </Box>
          </Stack>
        </Paper>
        {!!workItem.comments?.length && (
          <Box sx={{ minWidth: 0 }} data-testid="ado-detail-comments">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Comments
            </Typography>
            {workItem.comments.map((comment, index) => (
              <Paper
                key={`${comment.author?.login ?? comment.author?.displayName ?? 'anon'}-${comment.createdAt}-${index}`}
                variant="outlined"
                sx={{ p: 2, bgcolor: 'action.hover', minWidth: 0, mt: 1 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <PersonAvatar person={comment.author} size={24} />
                  <Typography
                    data-testid="ado-detail-comment-author"
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                  >
                    {comment.author?.displayName ?? comment.author?.login}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(comment.createdAt)}
                  </Typography>
                </Stack>

                <Typography data-testid="ado-detail-comment-body" variant="body2" sx={{ mb: 1.5 }}>
                  {comment.body}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
      <InboxDetailFooter details={details} />
    </Box>
  );
};

export default AdoDetail;