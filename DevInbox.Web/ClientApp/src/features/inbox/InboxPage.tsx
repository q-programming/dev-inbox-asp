import InboxList from './components/inboxList/InboxList';
import InboxDetailPanel from './components/inboxDetail/InboxDetailPanel';
import Slide from '@mui/material/Slide';

import Box from '@mui/material/Box';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useInboxStore } from './store/inbox.store';

const InboxPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(
    theme.breakpoints.down('md'),
  );
  const { selectedItemId } = useInboxStore();
  const hasSelectedItem = selectedItemId !== undefined && selectedItemId !== null;

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