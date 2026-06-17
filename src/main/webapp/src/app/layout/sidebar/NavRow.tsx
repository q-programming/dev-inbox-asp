import { memo } from 'react';
import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { type SidebarNavItem } from '../navConfig.tsx';

// ── Icon for SVG-based integration items ──────────────────────────────────────

const IntegrationIcon = memo(({ name }: { name: string }) => {
  const theme = useTheme();
  return (
    <Box
      component="img"
      src={`/${name}.svg`}
      alt={name}
      sx={{
        width: 16,
        height: 16,
        objectFit: 'contain',
        filter: theme.palette.mode === 'dark' ? 'invert(1) brightness(2)' : 'none',
        opacity: 0.75,
      }}
    />
  );
});

export interface NavRowProps {
  item: SidebarNavItem;
  activeId?: string;
  collapsed: boolean;
}

/**
 * A single navigation row in the sidebar.
 *
 * Memo-ised so each row only re-renders when its own item, activeId, or
 * collapsed flag changes — not on unrelated parent re-renders.
 * When collapsed, labels and counts are hidden and a Tooltip provides
 * discoverability.
 */
const NavRow = memo(({ item, activeId, collapsed }: NavRowProps) => {
  const isActive = item.id === activeId;
  const icon = typeof item.icon === 'string' ? <IntegrationIcon name={item.icon} /> : item.icon;

  const button = (
    <ListItemButton
      dense
      selected={isActive}
      component={item.route ? NavLink : 'div'}
      {...(item.route ? { to: item.route } : {})}
      sx={{
        borderRadius: 1,
        marginY: 0.25,
        justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight: 36,
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
          {item.count !== undefined && !item.expandable && (
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
