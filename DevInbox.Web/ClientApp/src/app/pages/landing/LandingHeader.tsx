import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import { AppRoute } from '@app/routes';

const NAV_LINKS = ['Features', 'Integrations', 'Pricing?'];

/** Sticky header for the public landing page — white bg, nav links, auth actions. */
const LandingHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
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
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
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
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            gap: 1,
            minWidth: 140,
            justifyContent: 'flex-end',
          }}
        >
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

        <IconButton
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary' }}
          aria-label="open navigation menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <Box sx={{ width: 280, padding: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2,
            }}
          >
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
              Menu
            </Typography>
            <IconButton aria-label="close navigation menu" onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack spacing={1.5}>
            {NAV_LINKS.map((label) => (
              <MuiLink
                key={label}
                href="#"
                underline="none"
                variant="body1"
                color="text.primary"
                onClick={() => setMobileMenuOpen(false)}
                sx={{ fontWeight: 500 }}
              >
                {label}
              </MuiLink>
            ))}

            <Button
              component={RouterLink}
              to={AppRoute.LOGIN}
              variant="text"
              color="inherit"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Button>
            <Button
              component={RouterLink}
              to={AppRoute.REGISTER}
              variant="contained"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default LandingHeader;
