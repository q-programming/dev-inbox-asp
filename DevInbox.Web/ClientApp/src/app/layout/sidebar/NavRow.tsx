import { memo } from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { NavLink } from 'react-router-dom';
import { type SidebarNavItem } from '../navConfig.tsx';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon.tsx';
import { buildInboxSearch } from '@feature/inbox/utils/inboxFilter';
import useSettingsStore from '@feature/settings/store/settings.store';
import { Density } from '@api';

export interface NavRowProps {
  item: SidebarNavItem;
  activeId?: string;
  collapsed: boolean;
  /** Called after navigating — used to close the temporary mobile drawer on tap. */
  onNavigate?: () => void;
}

/** Row sizing per density level — mirrors the scaling applied to inbox list rows. */
const DENSITY_NAV_ROW_STYLES: Record<Density, { minHeight: number; marginY: number }> = {
  [Density.Relaxed]: { minHeight: 36, marginY: 0.25 },
  [Density.Tight]: { minHeight: 32, marginY: 0.125 },
  [Density.SuperTight]: { minHeight: 28, marginY: 0 },
};

/**
 * A single navigation row in the sidebar.
 *
 * Memo-ised so each row only re-renders when its own item, activeId, or
 * collapsed flag changes — not on unrelated parent re-renders.
 * When collapsed, labels and counts are hidden and a Tooltip provides
 * discoverability.
 */
const NavRow = memo(({ item, activeId, collapsed, onNavigate }: NavRowProps) => {
  const isActive = item.id === activeId;
  const density = useSettingsStore((state) => state.density);
  const { minHeight, marginY } = DENSITY_NAV_ROW_STYLES[density];
  const icon =
    typeof item.icon === 'string' ? (
      <IntegrationIcon integration={item.icon} size={20} />
    ) : (
      item.icon
    );
  const to = item.route ? `${item.route}${buildInboxSearch(item.filter)}` : undefined;

  const button = (
    <ListItemButton
      dense
      selected={isActive}
      component={item.route ? NavLink : 'div'}
      {...(to ? { to, end: true } : {})}
      onClick={onNavigate}
      sx={{
        borderRadius: 1,
        marginY,
        justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight,
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 0 : 30,
          color: isActive ? 'inherit' : 'text.secondary',
          justifyContent: 'center',
        }}
      >
        {icon}
      </ListItemIcon>

      {!collapsed && (
        <>
          <ListItemText
            primary={item.label}
            slotProps={{
              primary: { variant: 'body2', noWrap: true, 'data-testid': 'nav-row-label' } as object,
            }}
          />
          {item.expandable && (
            <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled', fontSize: '1rem' }} />
          )}
          {(item.count !== undefined && item.count !== 0) && !item.expandable && (
            <ListItemSecondaryAction>
              <Typography
                variant="caption"
                color={isActive ? 'inherit' : 'text.secondary'}
                data-testid="nav-row-count"
              >
                {item.count}
              </Typography>
            </ListItemSecondaryAction>
          )}
        </>
      )}
    </ListItemButton>
  );

  // Wrap in Tooltip when collapsed so the label is still discoverable
  if (collapsed) {
    return (
      <Tooltip
        title={item.count !== undefined ? `${item.label} (${item.count})` : item.label}
        placement="right"
      >
        {button}
      </Tooltip>
    );
  }

  return button;
});

export default NavRow;
