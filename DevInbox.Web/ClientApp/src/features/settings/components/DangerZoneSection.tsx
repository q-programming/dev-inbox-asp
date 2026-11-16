import { memo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import useAlertStore, { AlertType } from '@shared/store/alert.store.ts';
import { useDeleteAccount, useLogoutMutation } from '@shared/hooks/useAuthQuery.ts';
import ConfirmModal from '@shared/components/confirmModal/ConfirmModal.tsx';

/**
 * Danger zone section — destructive account actions.
 * Actions are intentionally no-ops until a confirmation flow is implemented.
 */
const DangerZoneSection = memo(() => {
  const { addAlert } = useAlertStore();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const logout = useLogoutMutation();
  const deleteAccount = useDeleteAccount();

  const confirmedDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      onSuccess() {
        addAlert({ message: 'Your account was removed from DevInbox', type: AlertType.SUCCESS });
        logout.mutate();
      },
      onError(error) {
        addAlert({
          message:
            'There were errors while trying to remove your account. Please try again or contact administrator',
          type: AlertType.ERROR,
        });
        console.log(error);
      },
      onSettled() {
        setDeleteConfirmOpen(false);
      },
    });
  };
  return (
    <Box id="danger-zone" sx={{ scrollMarginTop: '72px' }}>
      <Paper
        variant="outlined"
        sx={{
          padding: 2.5,
          borderColor: 'error.main',
          bgcolor: (theme) => (theme.palette.mode === 'light' ? '#fff5f5' : 'rgba(186,26,26,0.08)'),
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main', mb: 0.5 }}>
          Danger Zone
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Deleting your account will permanently remove all integration data and preferences. This
          action cannot be undone.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="small"
          data-testid="deactivate-btn"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          Deactivate Account
        </Button>
      </Paper>
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete DevInbox Account?"
        body="This action cannot be undone, Your whole DevInbox account will be removed and cannot be restored. All integration items will be removed as well"
        confirmLabel="Deactive Account"
        cancelLabel="Cancel"
        loading={deleteAccount.isPending}
        onConfirm={() => {
          confirmedDeleteAccount();
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
});

DangerZoneSection.displayName = 'DangerZoneSection';
export default DangerZoneSection;
