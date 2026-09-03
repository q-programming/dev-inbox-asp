import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import LinearProgress from '@mui/material/LinearProgress';
import { useIsFetching } from '@tanstack/react-query';

/**
 * Slim indeterminate progress bar shown just below the app header while inbox items are
 * being fetched (initial load, filter change, or infinite-scroll page fetch). Absolutely
 * positioned so it never affects header height/layout.
 */
const InboxLoadingBar = () => {
  const isFetchingInbox = useIsFetching({ queryKey: inboxKeys.items }) > 0;

  if (!isFetchingInbox) {
    return null;
  }

  return (
    <LinearProgress
      data-testid="inbox-loading-bar"
      color="primary"
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
      }}
    />
  );
};

export default InboxLoadingBar;
