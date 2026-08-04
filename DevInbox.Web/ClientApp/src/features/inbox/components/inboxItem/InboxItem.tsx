import type { InboxItemSummary } from '@api';
import { formatRelativeTime } from '@utils/date';

import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';

import InboxItemBadges from '../inboxItemBadge/InboxItemBadge';
import InboxItemIcon from '../inboxItemIcon/InboxItemIcon';
import { useInboxStore } from '@feature/inbox/store/inbox.store';

interface IInboxItem {
  item: InboxItemSummary;
}

const InboxItem = ({ item }: IInboxItem) => {
  const { openItem, selectedItemId } = useInboxStore();
  const isSelected = selectedItemId === item.id;

  return (
    <ListItemButton
      data-testid="inbox-item"
      selected={isSelected}
      onClick={() => openItem(item?.id)}
      divider
      sx={{
        alignItems: 'stretch',
        px: 2,
        py: 1.25,
        gap: 1.5,
        minHeight: 68,
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
          width: 8,
          minWidth: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.isUnread && (
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

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: item.isUnread ? 600 : 400,
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
            }}
          >
            {formatRelativeTime(item.activityAt)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 0.5,
            minWidth: 0,
            flexWrap: 'wrap',
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
              }}
            >
              {item.repository}
            </Typography>
          )}

          <InboxItemBadges item={item} />
        </Box>
      </Box>
    </ListItemButton>
  );
};

export default InboxItem;