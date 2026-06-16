import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import { AppRoute } from '@app/routes';

const NAV_LINKS = ['Features', 'Integrations', 'Pricing?'];

/** Sticky header for the public landing page — white bg, nav links, auth actions. */
const LandingHeader = () => (
  <AppBar
    position="sticky"
    elevation={0}
    data-testid="landing-header"
    sx={{
      bgcolor: 'background.paper',
      borderBottom: 1,
      borderColor: 'divider',
      color: 'text.primary',
    }}
  >
    <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
      {/* Logo + wordmark */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 140 }}>
        <Box
          component="img"
          src="/logo.svg"
          alt="Dev Inbox logo"
          data-testid="header-logo"
          sx={{ width: 28, height: 28 }}
        />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700 }}
          color="text.primary"
          noWrap
          data-testid="header-wordmark"
        >
          Dev Inbox
        </Typography>
      </Box>

      {/* Centre nav */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {NAV_LINKS.map((label) => (
          <MuiLink
            key={label}
            href="#"
            underline="none"
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500, '&:hover': { color: 'text.primary' } }}
          >
            {label}
          </MuiLink>
        ))}
      </Box>

      {/* Auth actions */}
      <Box sx={{ display: 'flex', gap: 1, minWidth: 140, justifyContent: 'flex-end' }}>
        <Button
          component={RouterLink}
          to={AppRoute.LOGIN}
          variant="text"
          color="inherit"
          data-testid="header-login"
        >
          Login
        </Button>
        <Button
          component={RouterLink}
          to={AppRoute.REGISTER}
          variant="contained"
          color="primary"
          data-testid="header-get-started"
        >
          Get Started
        </Button>
      </Box>
    </Toolbar>
  </AppBar>
);

export default LandingHeader;
