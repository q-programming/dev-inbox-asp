import { useInboxStore } from '@feature/inbox/store/inbox.store';
import {
  buildInboxSearch,
  clearFilterDimensions,
  type FilterDimension,
  getActiveDimensions,
  type InboxFilter,
  parseInboxFilter,
  removeFilterDimension,
  toInboxSearchTerm,
} from '@feature/inbox/utils/inboxFilter';
import {
  translateInboxReason,
  translateItemSource,
  translateItemStatus,
  translateItemType,
} from '@feature/inbox/utils/reason';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { alpha, type Theme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';

const labelFor = (dimension: FilterDimension, filter: InboxFilter): string => {
  switch (dimension) {
    case 'source':
      return translateItemSource(filter.source);
    case 'itemType':
      return translateItemType(filter.itemType);
    case 'reason':
      return translateInboxReason(filter.reason);
    case 'status':
      return translateItemStatus(filter.status);
    case 'scope':
      // Holds either a repository or a team, so show just its last segment (same as the sidebar).
      return filter.scope?.split('/').pop() ?? '';
  }
};

const chipSx = {
  textTransform: 'none',
  fontSize: '0.8rem',
  fontWeight: 500,
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
  color: 'text.primary',
  borderColor: 'primary.main',
  '& .MuiChip-deleteIcon': { color: 'text.secondary', '&:hover': { color: 'text.primary' } },
} as const;

/**
 * Row of dismissible chips for every active inbox filter (sidebar filters + search term).
 * Dismissing a chip removes that filter from the URL / search state, which re-queries the list.
 */
const ActiveFilterBar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = useInboxStore((state) => state.searchTerm);
  const setSearchTerm = useInboxStore((state) => state.setSearchTerm);
  const filter = parseInboxFilter(searchParams);
  const dimensions = getActiveDimensions(filter);
  const term = toInboxSearchTerm(searchTerm);
  const chipCount = dimensions.length + (term ? 1 : 0);

  if (chipCount === 0) {
    return null;
  }

  const apply = (next: typeof filter) => setSearchParams(buildInboxSearch(next).replace(/^\?/, ''));

  const clearAll = () => {
    apply(clearFilterDimensions(filter));
    setSearchTerm('');
  };

  return (
    <Box
      data-testid="active-filter-bar"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.75,
        flex: 1,
        minWidth: 0,
      }}
    >
      {dimensions.map((dimension) => (
        <Chip
          key={dimension}
          data-testid={`active-filter-chip-${dimension}`}
          size="small"
          color="primary"
          variant="outlined"
          title={filter[dimension] as string}
          sx={chipSx}
          label={labelFor(dimension, filter)}
          onDelete={() => apply(removeFilterDimension(filter, dimension))}
        />
      ))}
      {term && (
        <Chip
          data-testid="active-filter-chip-term"
          size="small"
          color="primary"
          variant="outlined"
          sx={chipSx}
          label={`Search: ${term}`}
          onDelete={() => setSearchTerm('')}
        />
      )}
      {chipCount > 1 && (
        <Button
          data-testid="active-filter-clear-all"
          size="small"
          color="inherit"
          onClick={clearAll}
          sx={{ color: 'text.secondary' }}
        >
          Clear all
        </Button>
      )}
    </Box>
  );
};

export default ActiveFilterBar;
