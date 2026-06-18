import { memo } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';

const HELP_LINKS = [
  { label: 'Documentation', href: '#' },
  { label: 'Integration Guide', href: '#' },
  { label: 'API Keys', href: '#' },
] as const;

/** Right-rail tips sidebar shown alongside the settings content. */
const SettingsTips = memo(() => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {/* TIP card */}
    <Paper
      variant="outlined"
      sx={{
        padding: 2,
        bgcolor: (theme) => (theme.palette.mode === 'light' ? '#eef4fb' : 'rgba(44,90,160,0.12)'),
        borderColor: 'primary.light',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
        <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1 }}>
          TIP
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Use{' '}
        <Box
          component="kbd"
          sx={{
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
            bgcolor: 'background.default',
          }}
        >
          Cmd+,
        </Box>{' '}
        to quickly toggle any setting without leaving your keyboard.
      </Typography>
    </Paper>

    {/* Need help? */}
    <Box sx={{ padding: 2 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        Need help?
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {HELP_LINKS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            underline="hover"
            variant="body2"
            sx={{ color: 'primary.main', cursor: 'pointer' }}
          >
            {label}
          </Link>
        ))}
      </Box>
    </Box>
  </Box>
));

SettingsTips.displayName = 'SettingsTips';
export default SettingsTips;
