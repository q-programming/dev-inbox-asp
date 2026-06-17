import { memo, type MouseEvent, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Link as RouterLink } from 'react-router-dom';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { AppRoute } from '@app/routes';

/**
 * Shared footer — logo + wordmark left, copyright + nav links centre, icon right.
 * Used on the landing page and inside the authenticated shell.
 */
const Footer = memo(() => {
  const { status, profile, toggleTheme } = useUserStore();

  const handleThemeChange = useCallback(
    (_event: MouseEvent<HTMLElement>, val: string | null) => {
      if (val !== null) {
        toggleTheme();
      }
    },
    [toggleTheme],
  );

  const themeToggle = useMemo(
    () =>
      AuthStatus.AUTHENTICATED === status ? null : (
        <ToggleButtonGroup
          value={profile.theme}
          exclusive
          onChange={handleThemeChange}
          size="small"
          aria-label="theme mode"
          data-testid="theme-toggle"
          sx={{ height: 28 }}
        >
          <Tooltip title="Light mode">
            <ToggleButton value="light" aria-label="light mode">
              <LightModeIcon sx={{ fontSize: '0.9rem' }} />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Dark mode">
            <ToggleButton value="dark" aria-label="dark mode">
              <DarkModeIcon sx={{ fontSize: '0.9rem' }} />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      ),
    [status, profile.theme, handleThemeChange],
  );

  return (
    <Box
      component="footer"
      data-testid="site-footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        paddingY: 1,
        paddingX: { xs: 2, md: 6 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { xs: 1.5, md: 1 },
        bgcolor: 'background.paper',
      }}
    >
      {/* Left — logo + wordmark; on mobile also contains theme toggle on right */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: { xs: '100%', md: 'auto' },
        }}
      >
        <Link
          component={RouterLink}
          to={AppRoute.HOME}
          underline="none"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Box component="img" src="/logo.svg" alt="Dev Inbox" sx={{ width: 22, height: 22 }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: '0.9rem' }}
            color="text.primary"
          >
            Dev Inbox
          </Typography>
        </Link>
        {/* Theme toggle — mobile only, sits right of logo */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>{themeToggle}</Box>
      </Box>

      {/* Centre — copyright + links */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
          © {new Date().getFullYear()} Dev Inbox Inc. All rights reserved
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {(['GitHub', 'Docs', 'Privacy'] as const).map((label) => (
            <Link
              key={label}
              component={label === 'Privacy' ? RouterLink : 'a'}
              {...(label === 'Privacy' ? { to: '/privacy' } : { href: '#', target: '_blank' })}
              variant="caption"
              color="text.secondary"
              underline="hover"
            >
              {label}
            </Link>
          ))}
        </Box>
      </Box>

      {/* Right — theme toggle desktop only */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>{themeToggle}</Box>
    </Box>
  );
});

export default Footer;
