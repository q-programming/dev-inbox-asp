import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Link as RouterLink } from 'react-router-dom';
import useAuthStore from '@shared/store/auth.store';
import { Theme } from '@shared/theme/theme';
import { AppRoute } from '@app/routes';

/**
 * Shared footer — logo + wordmark left, copyright + nav links centre, icon right.
 * Used on the landing page and inside the authenticated shell.
 */
const Footer = () => {
  const { profile, toggleTheme } = useAuthStore();
  const isDark = profile.theme === Theme.DARK;

  return (
    <Box
      component="footer"
      data-testid="site-footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        py: 2.5,
        px: { xs: 3, md: 6 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        bgcolor: 'background.paper',
      }}
    >
      {/* Left — logo + brand */}
      <Link
        component={RouterLink}
        to={AppRoute.HOME}
        underline="none"
        color="inherit"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Box component="img" src="/logo.svg" alt="Dev Inbox" sx={{ width: 22, height: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.9rem' }} color="text.primary">
          Dev Inbox
        </Typography>
      </Link>

      {/* Centre — copyright + links */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.disabled">
          © {new Date().getFullYear()} Dev Inbox Inc. All rights reserved
        </Typography>
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

      {/* Right — theme toggle */}
      <Tooltip title={isDark ? 'Toggle Light mode' : 'Toggle Dark mode'}>
        <IconButton
          data-testid="theme-toggle"
          onClick={toggleTheme}
          size="small"
          color="inherit"
          aria-label={isDark ? 'Toggle Light mode' : 'Toggle Dark mode'}
        >
          {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default Footer;
