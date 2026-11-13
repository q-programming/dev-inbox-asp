import { InboxItemDetail, ReviewState } from '@api';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatRelativeTime } from '@utils/date';
import {
  REASON_CHIP_COLOR,
  STATE_CHIP_COLOR,
  translateInboxReason,
} from '@feature/inbox/utils/reason';
import InboxDetailHeader from '../InboxDetailHeader';
import InboxDetailFooter from '../InboxDetailFooter';
import PersonAvatar from '../shared/PersonAvatar';
import RichContent from '../shared/RichContent';
import CollapsibleSection from '../shared/CollapsibleSection';
import CommentCard from '../shared/CommentCard';
import { Tooltip } from '@mui/material';

interface IGithubDetail {
  details: InboxItemDetail;
}

/** Colour of the small review-state dot shown next to each reviewer. */
const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  [ReviewState.Approved]: 'Approved',
  [ReviewState.ChangesRequested]: 'Changes requested',
  [ReviewState.Commented]: 'Commented',
  [ReviewState.Waiting]: 'Waiting',
};

const REVIEW_STATE_COLOR: Record<ReviewState, string> = {
  [ReviewState.Approved]: 'success.main',
  [ReviewState.ChangesRequested]: 'error.main',
  [ReviewState.Commented]: 'info.main',
  [ReviewState.Waiting]: 'text.disabled',
};

const GithubDetail = ({ details }: IGithubDetail) => {
  const pr = details.github;

  if (!pr) {
    return null;
  }

  return (
    <Box
      data-testid="github-detail"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <InboxDetailHeader details={details} url={pr.url} />

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
          {!!pr.repository && (
            <Typography variant="body2" color="text.secondary">
              {pr.repository}
            </Typography>
          )}
          {!!pr.pullRequestNumber && (
            <Typography variant="body2" color="text.secondary">
              #{pr.pullRequestNumber}
            </Typography>
          )}
          {!!details.reason && (
            <Chip
              data-testid="github-detail-reason-chip"
              data-reason={details.reason}
              size="small"
              color={REASON_CHIP_COLOR[details.reason] ?? 'default'}
              label={translateInboxReason(details.reason)}
            />
          )}
        </Stack>

        <Paper variant="outlined" sx={{ padding: 2, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <PersonAvatar person={pr.author} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  opened by{' '}
                  <Box component="span" data-testid="github-detail-author-name">
                    {pr.author?.displayName ?? pr.author?.login ?? 'unknown'}
                  </Box>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelativeTime(pr.createdAt)}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography
                data-testid="github-detail-unread-indicator"
                data-unread={!details.isDone}
                variant="caption"
                sx={{ color: !details.isDone ? 'primary.main' : 'text.secondary' }}
              >
                <Box component="span" sx={{ fontWeight: 600 }}>
                  <Chip
                    label={pr?.state}
                    color={STATE_CHIP_COLOR[pr?.state ?? 'open'] ?? 'default'}
                    size="small"
                    sx={{ fontWeight: 600, height: 20, minWidth: 0, marginRight: 0.5 }}
                  />
                </Box>
                {formatRelativeTime(pr.updatedAt)}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 4,
              rowGap: 2,
              mt: 2.5,
            }}
          >
            {!!pr.reviewers?.length && (
              <CollapsibleSection
                title="Reviewers"
                noTopMargin
                data-testid="github-detail-reviewers"
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr) auto',
                      sm: 'minmax(0, 1fr) auto auto',
                    },
                    columnGap: 2,
                    rowGap: 0.75,
                    alignItems: 'center',
                  }}
                >
                  {pr.reviewers.map((reviewer, index) => {
                    const state = reviewer.reviewState ?? ReviewState.Waiting;
                    return (
                      <Box
                        key={reviewer.reviewer?.login ?? index}
                        data-testid={`github-reviewer-${reviewer.reviewer?.login ?? index}`}
                        data-review-state={reviewer.reviewState}
                        sx={{ display: 'contents' }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', minWidth: 0 }}
                        >
                          <PersonAvatar person={reviewer.reviewer} size={20} />
                          <Typography variant="body2" noWrap>
                            {reviewer.reviewer?.displayName ?? reviewer.reviewer?.login}
                          </Typography>
                        </Stack>
                        <Tooltip title={REVIEW_STATE_LABEL[state]}>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: 'center', justifyContent: 'flex-start' }}
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                flexShrink: 0,
                                borderRadius: '50%',
                                bgcolor: REVIEW_STATE_COLOR[state],
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              data-testid="github-reviewer-state-label"
                              sx={{ display: { xs: 'none', sm: 'inline' }, whiteSpace: 'nowrap' }}
                            >
                              {REVIEW_STATE_LABEL[state]}
                            </Typography>
                          </Stack>
                        </Tooltip>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          data-testid="github-reviewer-time"
                          sx={{
                            display: { xs: 'none', sm: 'block' },
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                          }}
                        >
                          {formatRelativeTime(reviewer.reviewedAt)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CollapsibleSection>
            )}

            {!!pr.linkedWorkItems?.length && (
              <Box sx={{ minWidth: 0 }} data-testid="github-detail-linked-items">
                <Typography variant="overline" color="text.secondary">
                  Linked item
                </Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {pr.linkedWorkItems.map((workItem) => (
                    <Box key={workItem.id}>
                      <Link
                        href={workItem.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontWeight: 600,
                        }}
                      >
                        {workItem.id}
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                      {!!workItem.title && (
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block' }}
                        >
                          {workItem.title}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>

          {!!pr.labels?.length && (
            <Box sx={{ mt: 2.5 }} data-testid="github-detail-labels">
              <Typography variant="overline" color="text.secondary">
                Labels
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.75 }}
              >
                {pr.labels.map((label) => (
                  <Chip key={label} size="small" label={label} />
                ))}
              </Stack>
            </Box>
          )}

          {!!pr.summary && (
            <CollapsibleSection title="Description" data-testid="github-detail-summary">
              <RichContent format={pr.summaryFormat}>{pr.summary}</RichContent>
            </CollapsibleSection>
          )}
        </Paper>
        {!!pr.latestComments?.length && (
          <Box sx={{ minWidth: 0 }} data-testid="github-detail-latest-comment">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Latest comments
            </Typography>
            {pr.latestComments.map((comment, index) => (
              <CommentCard
                key={`${comment.author?.login ?? 'anon'}-${comment.createdAt}-${index}`}
                author={comment.author}
                body={comment.body}
                createdAt={comment.createdAt}
                format={comment.bodyFormat}
                externalUrl={comment.url ?? pr.url}
                externalUrlLabel="Open in GitHub"
                authorTestId="github-detail-latest-comment-author"
                bodyTestId="github-detail-latest-comment-body"
              />
            ))}
          </Box>
        )}
      </Box>
      <InboxDetailFooter details={details} />
    </Box>
  );
};

export default GithubDetail;
