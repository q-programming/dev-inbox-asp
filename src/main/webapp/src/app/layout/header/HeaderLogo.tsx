import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { AppRoute } from '@app/routes.ts';

/**
 * Logo image and "Dev Inbox" wordmark that links back to the home route.
 * Kept as a separate component so AppHeader stays thin and this can be
 * snapshot-tested or swapped without touching the toolbar layout.
 */
const HeaderLogo = () => (
  <Box
    component={RouterLink}
    to={AppRoute.HOME}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      textDecoration: 'none',
      flexShrink: 0,
    }}
  >
    <Box component="img" src="/logo.svg" alt="Dev Inbox" sx={{ width: 22, height: 22 }} />
    <Typography
      variant="h6"
      color="text.primary"
      sx={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
    >
      Dev Inbox
    </Typography>
  </Box>
);

export default HeaderLogo;
