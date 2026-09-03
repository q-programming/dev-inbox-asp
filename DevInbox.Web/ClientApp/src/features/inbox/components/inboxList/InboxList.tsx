import { flattenInboxPages, useInboxQuery } from "@feature/inbox/hooks/useInboxQuery";
import { parseInboxFilter } from "@feature/inbox/utils/inboxFilter";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import InboxItem from "../inboxItem/InboxItem";
import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteScrollTrigger } from "@shared/hooks/useInfiniteScrollTrigger";

import Box from '@mui/material/Box';


const InboxList = () => {
  const [searchParams] = useSearchParams();
  const filter = useMemo(() => parseInboxFilter(searchParams), [searchParams]);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInboxQuery(filter);
  const items = useMemo(() => flattenInboxPages(data?.pages), [data?.pages]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // The list owns its own scroll region (bounded by the app shell's fixed-height layout),
  // so it scrolls independently from the reading pane (InboxDetailPanel) next to it — the
  // pane stays put/fixed regardless of how far the list has been scrolled.
  const sentinelRef = useInfiniteScrollTrigger({
    hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore: fetchNextPage,
    root: scrollContainerRef.current,
  });

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
    <Box
      ref={scrollContainerRef}
      sx={{ height: '100%', overflowY: 'auto' }}
    >
      <List
        data-testid="inbox-list"
        disablePadding
        sx={{ bgcolor: 'background.default' }}
      >
        {items.map((item) => (
          <InboxItem
            key={item.id}
            item={item}
          />
        ))}
      </List>

      {/* Sentinel — pulls in the next page once it scrolls into view; removed once no more pages remain. */}
      {hasNextPage && (
        <Box
          ref={sentinelRef}
          data-testid="inbox-list-load-more-sentinel"
          sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default InboxList;