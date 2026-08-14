import InboxList from './components/inboxList/InboxList';
import InboxDetailPanel from './components/inboxDetail/InboxDetailPanel';
import Slide from '@mui/material/Slide';

import Box from '@mui/material/Box';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppRoute } from '@app/routes';
import { useInboxStore } from './store/inbox.store';

/** Builds the URL for a specific inbox item's detail view (e.g. for deep-linking/bookmarking). */
const buildInboxItemPath = (itemId: number): string => `${AppRoute.INBOX}/${itemId}`;

const InboxPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(
    theme.breakpoints.down('md'),
  );
  const { itemId: itemIdParam } = useParams<{ itemId: string }>();
  const { selectedItemId, openItem } = useInboxStore();
  const hasSelectedItem = selectedItemId !== undefined && selectedItemId !== null;

  // Deep-link support: opening /inbox/{itemId} directly (bookmark, page refresh) selects
  // that item on mount. Zustand (persisted) remains the single source of truth for the
  // selection afterwards — the URL param is only read once to seed it.
  useEffect(() => {
    const parsed = itemIdParam ? Number(itemIdParam) : undefined;
    if (parsed !== undefined && !Number.isNaN(parsed)) {
      openItem(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the selected item in the address bar so it's bookmarkable/shareable and
  // survives a refresh. Uses replaceState (not navigate()) so this never adds a history
  // entry or triggers a route re-match/remount — selection changes stay purely client-side.
  useEffect(() => {
    const path = hasSelectedItem ? buildInboxItemPath(selectedItemId!) : AppRoute.INBOX;
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path);
    }
  }, [hasSelectedItem, selectedItemId]);

  // Mobile
  if (isMobile) {
    return (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {hasSelectedItem ? (
          <InboxDetailPanel />
        ) : (
          <InboxList />
        )}
      </Box>
    );
  }

  // Desktop
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: hasSelectedItem
            ? {
              md: '45%',
              lg: '42%',
              xl: '40%',
            }
            : '100%',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
          transition: theme.transitions.create('width', {
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <InboxList />
      </Box>

      {hasSelectedItem && (
        <Slide
          direction="left"
          in={hasSelectedItem}
          mountOnEnter
          unmountOnExit
        >
          <Box
            sx={{
              width: {
                md: '55%',
                lg: '58%',
                xl: '60%',
              },
              minWidth: 500,
              height: '100%',
              flexShrink: 0,
              borderLeft: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <InboxDetailPanel />
          </Box>
        </Slide>
      )}
    </Box>
  );
};

export default InboxPage;