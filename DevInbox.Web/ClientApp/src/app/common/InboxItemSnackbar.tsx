import { SyncChangeKind, SyncNotificationItemDto } from '@api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import IntegrationIcon from '@shared/components/integrationIcon/IntegrationIcon';
import { TOAST_INFO_BG, TOAST_SUCCESS_BG } from '@shared/theme/theme';
import { SnackbarContent, type CustomContentProps } from 'notistack';
import { forwardRef } from 'react';

export type InboxItemSnackbarProps = CustomContentProps & SyncNotificationItemDto;
  

/**
 * Outlook-style "New/Updated" toast for an inbox item found by a background sync — a solid
 * (non-transparent) success/info background with the integration's icon, instead of the plain
 * text + generic icon used by the default notistack variants.
 */
const InboxItemSnackbar = forwardRef<HTMLDivElement, InboxItemSnackbarProps>((props, ref) => {
  const { id, message, integration, title, changeKind, action, style, className, externalId } = props;
  const theme = useTheme();
  const isNew = changeKind === SyncChangeKind.New;
  const statusLabel = isNew ? 'New' : 'Updated';
  // Fixed hex, matching notistack's own default success/info variants exactly — mode-independent,
  // unlike theme.palette.success/info shades which read washed-out in dark mode.
  const backgroundColor = isNew ? TOAST_SUCCESS_BG : TOAST_INFO_BG;
  const resolvedAction = typeof action === 'function' ? action(id) : action;

  return (
    <SnackbarContent ref={ref} role="alert" style={style} className={className}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          minWidth: 288,
          maxWidth: 400,
          padding: '10px 12px',
          borderRadius: 1,
          backgroundColor,
          color: '#fff',
          boxShadow: theme.shadows[3],
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // Integration logos are dark-line SVGs — force them to render white so they stay
            // legible against the solid success/info background instead of blending into it.
            '& img': { filter: 'brightness(0) invert(1)', opacity: 1 },
          }}
        >
          <IntegrationIcon integration={integration} size={18} />
        </Box>
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, lineHeight: 1.3 }}>
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            {statusLabel}:
          </Typography>
          {` #${externalId} ${title}`}
        </Typography>
        {resolvedAction}
      </Box>
      {/* Kept for screen readers/assistive tech relying on the plain-text message. */}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {message}
      </span>
    </SnackbarContent>
  );
});

InboxItemSnackbar.displayName = 'InboxItemSnackbar';
export default InboxItemSnackbar;
