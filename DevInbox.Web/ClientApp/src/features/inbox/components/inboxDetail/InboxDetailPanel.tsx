import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useInboxItemQuery } from '@feature/inbox/hooks/useInboxQuery';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { useMemo } from 'react';
import AdoDetail from './ado/AdoDetail';
import GithubDetail from './github/GithubDetail';
import NoteDetail from './note/AdoDetail';
import { ItemSource } from '@api';

const InboxDetailPanel = () => {
  const {
    selectedItemId,
    closeItem,
  } = useInboxStore();

  if (selectedItemId == null) {
    return null;
  }

  const { isLoading, data: details } = useInboxItemQuery(
    selectedItemId,
  );

  const detailComponent = useMemo(() => {
    if (!details || !details.source) {
      return null;
    }
    switch (details.source) {
        case ItemSource.Ado:
            return (<AdoDetail details={details} />);
        case ItemSource.Github:
            return (<GithubDetail details={details} />);
        case ItemSource.Note:
            return (<NoteDetail details={details} />);
        default:
            return (<> not supported </>);
    }
  }, [details]);

  if (isLoading && !details) {
    return (
      <Box
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
    );
  }

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',

            pl: {
              xs: 2,
              md: 1.5,
            },

            pr: 1,
            py: 1.5,
          }}
        >
          <Typography variant="h6">
            {details?.title}
          </Typography>

          <IconButton
            onClick={closeItem}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
          }}
        />
        source: {details?.source}
        {detailComponent}
      </Box>
  );
};

export default InboxDetailPanel;