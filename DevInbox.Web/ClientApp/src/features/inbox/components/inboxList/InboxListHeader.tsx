import { InboxSort } from '@api';
import { useBulkUpdateInboxItemsMutation } from '@feature/inbox/hooks/useInboxQuery';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { buildInboxSearch, parseInboxFilter, type InboxFilter } from '@feature/inbox/utils/inboxFilter';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Sort orders offered in the inbox list header, in menu display order. Triage-oriented rather
 * than generic (e.g. no alphabetical) — each maps to a real "what should I look at" decision. */
const SORT_OPTIONS: { value: InboxSort; label: string }[] = [
  { value: InboxSort.ActivityDesc, label: 'Newest activity' },
  { value: InboxSort.ActivityAsc, label: 'Oldest activity' },
  { value: InboxSort.PriorityDesc, label: 'Priority' },
  { value: InboxSort.CreatedDesc, label: 'Recently created' },
  { value: InboxSort.CommentsDesc, label: 'Most discussed' },
];

const DEFAULT_SORT = InboxSort.ActivityDesc;

/**
 * Header row above the inbox list: a sort control that's always visible on the right, and — once
 * one or more rows are checked — a contextual "N selected / Actions" bar that takes over the rest
 * of the row instead of permanently reserving space for it (mirrors Gmail/Outlook multi-select).
 */
const InboxListHeader = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseInboxFilter(searchParams);
  const currentSort = filter.sort ?? DEFAULT_SORT;

  const [sortAnchorEl, setSortAnchorEl] = useState<HTMLElement | null>(null);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(null);

  const { selectedIds, clearSelectedIds } = useInboxStore();
  const bulkUpdate = useBulkUpdateInboxItemsMutation();
  const hasSelection = selectedIds.size > 0;

  const applySort = (sort: InboxSort) => {
    const nextFilter: InboxFilter = { ...filter, sort };
    setSearchParams(buildInboxSearch(nextFilter).replace(/^\?/, ''));
    setSortAnchorEl(null);
  };

  const runBulkAction = (isDone?: boolean, isSaved?: boolean) => {
    bulkUpdate.mutate({ ids: Array.from(selectedIds), isDone, isSaved });
    clearSelectedIds();
    setActionsAnchorEl(null);
  };

  const currentSortLabel = SORT_OPTIONS.find((option) => option.value === currentSort)?.label ?? SORT_OPTIONS[0].label;

  return (
    <Box
      data-testid="inbox-list-header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: hasSelection ? 'space-between' : 'flex-end',
        gap: 1,
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {hasSelection && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            data-testid="inbox-list-selection-count"
            variant="body2"
            color="text.secondary"
          >
            {selectedIds.size} selected
          </Typography>
          <Button
            data-testid="inbox-selection-cancel-btn"
            size="small"
            color="inherit"
            onClick={() => clearSelectedIds()}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {hasSelection && (
          <>
            <Button
              data-testid="inbox-bulk-actions-btn"
              size="small"
              variant="outlined"
              endIcon={<KeyboardArrowDownIcon fontSize="small" />}
              onClick={(event) => setActionsAnchorEl(event.currentTarget)}
            >
              Actions
            </Button>
            <Menu
              data-testid="inbox-bulk-actions-menu"
              anchorEl={actionsAnchorEl}
              open={!!actionsAnchorEl}
              onClose={() => setActionsAnchorEl(null)}
            >
              <MenuItem
                data-testid="inbox-bulk-action-mark-done"
                onClick={() => runBulkAction(true, undefined)}
              >
                Mark as done
              </MenuItem>
              <MenuItem
                data-testid="inbox-bulk-action-mark-not-done"
                onClick={() => runBulkAction(false, undefined)}
              >
                Mark as not done
              </MenuItem>
              <MenuItem
                data-testid="inbox-bulk-action-save"
                onClick={() => runBulkAction(undefined, true)}
              >
                Save
              </MenuItem>
              <MenuItem
                data-testid="inbox-bulk-action-unsave"
                onClick={() => runBulkAction(undefined, false)}
              >
                Unsave
              </MenuItem>
            </Menu>
          </>
        )}

        <Button
          data-testid="inbox-sort-btn"
          size="small"
          color="inherit"
          endIcon={<KeyboardArrowDownIcon fontSize="small" />}
          onClick={(event) => setSortAnchorEl(event.currentTarget)}
          sx={{ color: 'text.secondary' }}
        >
          Sort: {currentSortLabel}
        </Button>
        <Menu
          data-testid="inbox-sort-menu"
          anchorEl={sortAnchorEl}
          open={!!sortAnchorEl}
          onClose={() => setSortAnchorEl(null)}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              data-testid={`inbox-sort-option-${option.value}`}
              selected={option.value === currentSort}
              onClick={() => applySort(option.value)}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
};

export default InboxListHeader;
