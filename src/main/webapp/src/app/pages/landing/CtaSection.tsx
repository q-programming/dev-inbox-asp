import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import { AppRoute } from '@app/routes';

/** Dark primary CTA banner — closing call-to-action on the landing page. */
const CtaSection = () => (
  <Box
    component="section"
    data-testid="cta-section"
    sx={{ px: { xs: 3, md: 8 }, pb: { xs: 6, md: 8 }, bgcolor: 'background.default' }}
  >
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        bgcolor: 'primary.main',
        borderRadius: 4,
        px: { xs: 4, md: 8 },
        py: { xs: 6, md: 8 },
        textAlign: 'center',
        color: 'primary.contrastText',
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: 800 }} gutterBottom data-testid="cta-heading">
        Ready to reclaim your focus?
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.85, mb: 4, maxWidth: 480, mx: 'auto' }}>
        Join developers who start their day with a single, clear view of what matters most.
      </Typography>
      <Button
        component={RouterLink}
        to={AppRoute.REGISTER}
        variant="contained"
        size="large"
        data-testid="cta-get-started"
        sx={{
          bgcolor: 'white',
          color: 'primary.main',
          px: 5,
          py: 1.5,
          '&:hover': { bgcolor: 'grey.100' },
        }}
      >
        Get Started Free
      </Button>
    </Box>
  </Box>
);

export default CtaSection;
