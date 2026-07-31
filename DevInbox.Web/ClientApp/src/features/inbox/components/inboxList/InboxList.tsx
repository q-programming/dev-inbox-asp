import { useInboxQuery } from "@feature/inbox/hooks/useInboxQuery";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import InboxItem from "../inboxItem/InboxItem";

import Box from '@mui/material/Box';


const InboxList = () => {
  const { data, isLoading } = useInboxQuery();

  if (isLoading) {
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
    <List disablePadding>
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