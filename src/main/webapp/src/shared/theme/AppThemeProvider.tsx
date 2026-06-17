import { type ReactNode, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from './theme';
import useSettingsStore from '@feature/settings/store/settings.store';

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = useSettingsStore((state) => state.theme);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const builtTheme = useMemo(() => buildTheme(theme, fontSize), [theme, fontSize]);
  return (
    <ThemeProvider theme={builtTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
