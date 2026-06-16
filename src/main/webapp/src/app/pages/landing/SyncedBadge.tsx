import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { keyframes } from '@mui/system';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
`;

const SyncedBadge = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      px: 2,
      py: 1,
      borderRadius: 99,
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      boxShadow: 4,
      animation: `${float} 2s ease-in-out infinite`,
    }}
  >
    <FiberManualRecordIcon sx={{ fontSize: 12, color: 'success.main' }} />
    <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.primary" noWrap>
      Synced 2s ago
    </Typography>
  </Box>
);

export default SyncedBadge;
