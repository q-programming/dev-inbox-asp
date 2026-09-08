import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { memo, useState } from 'react';
import { useSettingsMutation } from '../hooks/useSettingsQuery';
import useSettingsStore from '../store/settings.store';
import { UserSettingsDto } from '@api';

const SettingsActions = memo(() => {
  const settingsMutation = useSettingsMutation();
  const {
    applyServerProfile,
    theme,
    density,
    fontSize,
    sideBarCollapsed,
    syncIntervalMinutes,
    sendNotifications,
  } = useSettingsStore();
  const { addAlert } = useAlertStore();

  const [currentSettings, setCurrentSettings] = useState<UserSettingsDto>({
    density,
    theme,
    fontSize,
    sideBarCollapsed,
    syncIntervalMinutes,
    sendNotifications,
  });

  const saveChanges = () => {
    settingsMutation.mutate(
      {
        density,
        theme,
        fontSize,
        sideBarCollapsed,
        syncIntervalMinutes,
        sendNotifications,
      },
      {
        onSuccess: (data) => {
          setCurrentSettings(data);
          addAlert({ type: AlertType.SUCCESS, message: 'Settings updated' });
        },
      },
    );
  };

  const cancelChanges = async () => {
    applyServerProfile(currentSettings);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, marginTop: 2 }}>
      <Button variant="outlined" data-testid="settings-cancel-btn" onClick={cancelChanges}>
        Cancel
      </Button>
      <Button variant="contained" data-testid="settings-save-btn" onClick={saveChanges}>
        Save Changes
      </Button>
    </Box>
  );
});

SettingsActions.displayName = 'SettingsActions';
export default SettingsActions;
