import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import AppearanceSection from './components/AppearanceSection';
import DangerZoneSection from './components/DangerZoneSection';
import IntegrationsSection from './components/IntegrationsSection';
import AppearanceSettingsActions from './components/AppearanceSettingsActions';
import SettingsTips from './components/SettingsTips';

/**
 * Settings page — long-form layout with anchored sections.
 * Navigate to settings#appearance or settings#integrations to scroll directly to a section.
 */
const SettingsPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      return;
    }
    const id = hash.slice(1);
    // Defer scroll until after paint so the sections are in the DOM
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [hash]);

  return (
    <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
      {/* ── Main content column ── */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Page header */}
        <Box>
          <Typography
            variant="h6"
            sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, mb: 0.5 }}
          >
            Settings
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure your developer experience, integrations, and notification preferences.
          </Typography>
        </Box>

        <Divider />
        <AppearanceSection />


        <Divider />
        <IntegrationsSection />

        <Divider />
        <DangerZoneSection />
      </Box>

      {/* ── Right tips rail (hidden on small screens) ── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: 260,
          flexShrink: 0,
          position: 'sticky',
          top: 80,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          paragraph: 2,
        }}
      >
        <SettingsTips />
      </Box>
    </Box>
  );
};

export default SettingsPage;
