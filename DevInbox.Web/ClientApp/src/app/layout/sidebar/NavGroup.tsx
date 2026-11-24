import { memo, useCallback, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import NavRow from './NavRow.tsx';
import { getNavGroupSource } from './navGroups.ts';
import { type SidebarNavItem } from '../navConfig.tsx';
import { AppRoute } from '@app/routes';

const SCOPE_ID_PREFIX = 'scope:';

interface NavGroupProps {
  /** The expandable parent item. Its id selects the data source. */
  item: SidebarNavItem;
  activeId?: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

/**
 * Expandable nav row that owns its open state and lazily loads its entries
 * the first time it is opened (inline when expanded, as a pop-out menu when collapsed).
 */
const NavGroup = memo(({ item, activeId, collapsed, onNavigate }: NavGroupProps) => {
  const [expanded, setExpanded] = useState(false);
  const [requested, setRequested] = useState(false);
  // Stable per item id, so calling the hook here keeps hook order constant.
  const useEntries = getNavGroupSource(item.id);
  const { data, isLoading } = useEntries(requested);

  const handleToggle = useCallback((): void => {
    setRequested(true);
    setExpanded((current) => !current);
  }, []);

  return (
    <NavRow
      item={item}
      activeId={activeId}
      collapsed={collapsed}
      expanded={expanded}
      onToggle={handleToggle}
    >
      {isLoading && <CircularProgress size={16} sx={{ margin: 1 }} aria-label="loading" />}
      {!isLoading && !data?.length && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 0.5 }}>
          Nothing to show yet
        </Typography>
      )}
      {data?.map((value) => (
        <NavRow
          key={value}
          item={{
            id: `${SCOPE_ID_PREFIX}${value}`,
            label: value.split('/').pop() ?? value,
            icon: null,
            route: AppRoute.INBOX,
            filter: { scope: value },
          }}
          activeId={activeId}
          collapsed={false}
          onNavigate={onNavigate}
        />
      ))}
    </NavRow>
  );
});

export default NavGroup;
