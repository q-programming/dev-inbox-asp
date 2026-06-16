import Box from '@mui/material/Box';
import { Navigate } from 'react-router-dom';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store.ts';
import { useMeQuery } from '@shared/hooks/useAuthQuery.ts';
import { AppRoute } from '@app/routes';
import LandingHeader from './landing/LandingHeader';
import HeroSection from './landing/HeroSection';
import FeaturesSection from './landing/FeaturesSection';
import CtaSection from './landing/CtaSection';
import Footer from '@shared/components/Footer';
import Button from '@mui/material/Button';
import useAlertStore, { AlertType } from '@shared/store/alert.store.ts';

/**
 * Public landing page. Also acts as the OAuth callback landing point — calls /me
 * in the background so GitHub OAuth users are redirected to /inbox automatically.
 *
 * Redirect rules:
 *  - AUTHENTICATED (server-confirmed)  → /inbox
 *  - LOADING / UNAUTHENTICATED         → stay here (show landing)
 *  - /me query returns a user          → /inbox (OAuth callback, store not yet updated)
 */
const LandingPage = () => {
  const { status } = useAuthStore();
  const { data: me, isSuccess } = useMeQuery();
  const { addAlert } = useAlertStore();

  if (status === AuthStatus.AUTHENTICATED) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  if (isSuccess && me) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  return (
    <Box
      data-testid="landing-page"
      sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <CtaSection />
      <Button
        onClick={() => {
          addAlert({
            type: AlertType.SUCCESS,
            message: 'Alerted',
          });
        }}
      >
        Alert!
      </Button>
      <Footer />
    </Box>
  );
};

export default LandingPage;
