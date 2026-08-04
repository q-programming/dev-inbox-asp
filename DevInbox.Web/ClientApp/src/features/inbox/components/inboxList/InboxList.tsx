import { useInboxQuery } from "@feature/inbox/hooks/useInboxQuery";
import { parseInboxFilter } from "@feature/inbox/utils/inboxFilter";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import InboxItem from "../inboxItem/InboxItem";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import Box from '@mui/material/Box';


const InboxList = () => {
  const [searchParams] = useSearchParams();
  const filter = useMemo(() => parseInboxFilter(searchParams), [searchParams]);
  const { data, isLoading } = useInboxQuery(filter);

  if (isLoading) {
    return (
      <Box
        data-testid="inbox-list-loading"
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
    <List
      data-testid="inbox-list"
      disablePadding
      sx={{ bgcolor: 'background.default' }}
    >
      {data?.items?.map((item) => (
        <InboxItem
          key={item.id}
          item={item}
        />
      ))}
    </List>
  );
};

export default InboxList;