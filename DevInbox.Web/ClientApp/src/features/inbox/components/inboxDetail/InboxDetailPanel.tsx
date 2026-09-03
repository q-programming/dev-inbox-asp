import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { inboxKeys, useInboxItemQuery } from '@feature/inbox/hooks/useInboxQuery';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { ApiError } from '@shared/api/httpClient';
import { useQueryClient } from '@tanstack/react-query';
import { ItemSource } from '@api';
import AdoDetail from './ado/AdoDetail';
import GithubDetail from './github/GithubDetail';
import NoteDetail from './note/NoteDetail';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { useEffect } from 'react';

const InboxDetailPanel = () => {
  const { selectedItemId, closeItem } = useInboxStore();
  const { addAlert } = useAlertStore();
  const queryClient = useQueryClient();
  const { isLoading, data: details, isError, error } = useInboxItemQuery(selectedItemId);
  useEffect(() => {
    if (isError) {
      const isGone = error instanceof ApiError && error.status === 404;
      addAlert({
        message: isGone
          ? 'This item no longer exists and has been removed from your inbox.'
          : 'Failed to load inbox item details.',
        type: AlertType.ERROR,
      });
      closeItem();
      if (isGone) {
        // The backend already deleted the stale item (e.g. its ADO work item/PR/project was
        // removed) — refresh the list/summary so it disappears from the UI without a manual sync.
        queryClient.invalidateQueries({ queryKey: inboxKeys.items });
        queryClient.invalidateQueries({ queryKey: inboxKeys.summary });
      }
    }
  }, [isError, error, addAlert, closeItem, queryClient]);

  if (selectedItemId == null) {
    return null;
  }

  const detailComponent = (() => {
    if (!details || !details.source) {
      return null;
    }
    switch (details.source) {
      case ItemSource.Ado:
        return <AdoDetail details={details} />;
      case ItemSource.Github:
        return <GithubDetail details={details} />;
      case ItemSource.Note:
        return <NoteDetail details={details} />;
      default:
        return null;
    }
  })();

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.default',

        display: 'flex',
        flexDirection: 'column',

        borderLeft: {
          xs: 0,
          md: 1,
        },

        borderColor: 'divider',
      }}
    >
      {isLoading && !details ? (
        <Box
          data-testid="inbox-detail-panel-loading"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 300,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        detailComponent
      )}
    </Box>
  );
};

export default InboxDetailPanel;
