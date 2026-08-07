import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { useInboxItemQuery } from '@feature/inbox/hooks/useInboxQuery';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { ItemSource } from '@api';
import AdoDetail from './ado/AdoDetail';
import GithubDetail from './github/GithubDetail';
import NoteDetail from './note/NoteDetail';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { useEffect } from 'react';

const InboxDetailPanel = () => {
  const { selectedItemId, closeItem } = useInboxStore();
  const { addAlert } = useAlertStore();
  const { isLoading, data: details, isError } = useInboxItemQuery(selectedItemId);
  useEffect(() => {
    if (isError) {
      addAlert({
        message: 'Failed to load inbox item details.',
        type: AlertType.ERROR,
      });
      closeItem();
    }
  }, [isError, addAlert, closeItem]);

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
