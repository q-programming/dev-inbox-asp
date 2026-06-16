import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import BoltIcon from '@mui/icons-material/Bolt';
import { Link as RouterLink } from 'react-router-dom';
import { AppRoute } from '@app/routes';
import SyncedBadge from './SyncedBadge';

/**
 * Two-column hero. Left: copy + CTAs. Right: tilted inbox screenshot + SyncedBadge.
 */
const HeroSection = () => (
  <Box
    component="section"
    data-testid="hero-section"
    sx={{
      background: (theme) => theme.palette.hero.gradientBg,
      px: { xs: 3, md: 8 },
      py: { xs: 8, md: 10 },
    }}
  >
    <Grid container spacing={6} sx={{ alignItems: 'center', maxWidth: 1200, mx: 'auto' }}>
      {/* Left — copy */}
      <Grid size={{ xs: 12, md: 5 }}>
        {/* Version badge */}
        <Box
          data-testid="hero-version-badge"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2,
            py: 0.75,
            borderRadius: 99,
            bgcolor: (theme) => theme.palette.hero.badgeBg,
            mb: 4,
          }}
        >
          <BoltIcon sx={{ fontSize: '1rem', color: 'text.primary' }} />
          <Typography variant="overline" color="text.primary">
            VERSION {__APP_VERSION__} NOW LIVE
          </Typography>
        </Box>

        <Typography variant="h1" sx={{ mb: 0.5 }}>
          The single
          <br />
          answer to:
        </Typography>

        <Typography variant="h1" color="primary" sx={{ fontStyle: 'italic', mb: 3 }}>
          "What do I need
          <br />
          to focus on
          <br />
          today?"
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 420 }}>
          Stop drowning in tabs. Dev Inbox brings your GitHub PRs, ADO tasks, and personal
          engineering notes into one high-velocity command center.
        </Typography>

        <Button
          component={RouterLink}
          to={AppRoute.REGISTER}
          variant="contained"
          color="primary"
          size="large"
          data-testid="hero-get-started"
          sx={{ px: 5, py: 1.5 }}
        >
          Get Started for Free →
        </Button>
      </Grid>

      {/* Right — tilted screenshot */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Box sx={{ position: 'relative', perspective: '1200px', px: 2 }}>
          <Box
            component="img"
            src="/inbox.png"
            alt="Dev Inbox screenshot"
            data-testid="hero-screenshot"
            sx={{
              width: '100%',
              borderRadius: 3,
              boxShadow: 12,
              display: 'block',
              transform: 'rotateX(15deg) rotateY(-15deg) rotateZ(5deg) scale(0.95)',
              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': { transform: 'rotateX(5deg) rotateY(-5deg) rotateZ(2deg) scale(1)' },
            }}
          />
          <Box sx={{ position: 'absolute', bottom: -8, right: 0 }}>
            <SyncedBadge />
          </Box>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

export default HeroSection;
