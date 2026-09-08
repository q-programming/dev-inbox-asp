import type { InboxItemSummary } from '@api';
import { formatRelativeTime } from '@utils/date';

import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';

import InboxItemBadges from '../inboxItemBadge/InboxItemBadge';
import InboxItemIcon from '../inboxItemIcon/InboxItemIcon';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { Density } from '@api';

interface IInboxItem {
  item: InboxItemSummary;
}

/**
 * Row vertical spacing per density level — mirrors the ratios shown in the Settings preview cards.
 * `stackOnMobile: false` (Super Tight only) keeps the title/timestamp and repo/badges rows on a
 * single line even on narrow viewports, so density has a visible effect on mobile too instead of
 * being neutralised by the column-stacking that Relaxed/Tight rely on for readability.
 */
const DENSITY_ROW_STYLES: Record<
  Density,
  { py: number; minHeight: number; gap: number; rowMarginTop: number; stackOnMobile: boolean }
> = {
  [Density.Relaxed]: { py: 1.25, minHeight: 68, gap: 1.5, rowMarginTop: 0.5, stackOnMobile: true },
  [Density.Tight]: { py: 0.75, minHeight: 52, gap: 1, rowMarginTop: 0.25, stackOnMobile: true },
  [Density.SuperTight]: { py: 0.375, minHeight: 40, gap: 0.75, rowMarginTop: 0.125, stackOnMobile: false },
};

/** Fixed gap between the unread dot and source icon — kept constant across densities so the two
 * never visually collide, unlike the gap to the content column which shrinks with density. */
const LEADING_GAP = 0.75;

const InboxItem = ({ item }: IInboxItem) => {
  const { openItem, selectedItemId } = useInboxStore();
  const density = useSettingsStore((state) => state.density);
  const isSelected = selectedItemId === item.id;
  const { py, minHeight, gap, rowMarginTop, stackOnMobile } = DENSITY_ROW_STYLES[density];

  return (
    <ListItemButton
      data-testid="inbox-item"
      selected={isSelected}
      onClick={() => openItem(item?.id)}
      divider
      sx={{
        alignItems: 'stretch',
        px: 2,
        py,
        gap,
        minHeight,
        borderLeft: '3px solid',
        borderLeftColor: isSelected ? 'primary.main' : 'transparent',
        bgcolor: isSelected ? 'action.selected' : 'background.paper',

        '&:hover': {
          bgcolor: isSelected ? 'action.selected' : 'action.hover',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: LEADING_GAP,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 8,
            minWidth: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!item.isDone && (
            <Box
              data-testid="inbox-item-unread-dot"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            width: 24,
            minWidth: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <InboxItemIcon item={item} />
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Title row — timestamp sits inline on desktop (room to spare), but drops to its own
            row on mobile (flexDirection: column) so a long title can never push it off-screen —
            it stays fully visible instead of being clipped by the shell's overflow:hidden. */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: stackOnMobile ? 'column' : 'row', sm: 'row' },
            alignItems: { xs: stackOnMobile ? 'flex-start' : 'center', sm: 'center' },
            gap: { xs: stackOnMobile ? 0 : 1, sm: 1 },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              flex: { xs: stackOnMobile ? undefined : 1, sm: 1 },
              width: { xs: stackOnMobile ? '100%' : 'auto', sm: 'auto' },
              minWidth: 0,
              fontWeight: !item.isDone ? 600 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              flexShrink: 0,
              mt: { xs: stackOnMobile ? 0.25 : 0, sm: 0 },
            }}
          >
            {formatRelativeTime(item.activityAt)}
          </Typography>
        </Box>

        {/* Repository + badges row — wraps freely, since repo name/badges are short and fine
            to wrap inline. Comment/note indicators live in their own row below on mobile
            (flexDirection: column) so they never compete with badges for width; on desktop
            they're pinned to the end of this same row instead. Super Tight keeps this row inline
            on mobile too, matching the density's compact desktop behaviour. */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: stackOnMobile ? 'column' : 'row', sm: 'row' },
            alignItems: { xs: stackOnMobile ? 'flex-start' : 'center', sm: 'center' },
            gap: { xs: stackOnMobile ? 0.5 : 1, sm: 1 },
            mt: rowMarginTop,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              flexWrap: 'wrap',
              flex: { xs: stackOnMobile ? undefined : 1, sm: 1 },
            }}
          >
            {!!item.repository && (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {item.repository}
              </Typography>
            )}

            <InboxItemBadges item={item} />
          </Box>

          {(!!item.commentCount || item.hasNote) && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                flexShrink: 0,
                alignItems: 'center',
                color: 'text.secondary',
              }}
            >
              {!!item.commentCount && (
                <Tooltip title={`${item.commentCount} comment${item.commentCount === 1 ? '' : 's'}`}>
                  <Box
                    data-testid="inbox-item-comment-count"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                  >
                    <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" sx={{ lineHeight: 1 }}>
                      {item.commentCount}
                    </Typography>
                  </Box>
                </Tooltip>
              )}

              {item.hasNote && (
                <Tooltip title="Has a note">
                  <EditNoteIcon data-testid="inbox-item-has-note" sx={{ fontSize: 16 }} />
                </Tooltip>
              )}
            </Stack>
          )}
        </Box>
      </Box>
    </ListItemButton>
  );
};

export default InboxItem;