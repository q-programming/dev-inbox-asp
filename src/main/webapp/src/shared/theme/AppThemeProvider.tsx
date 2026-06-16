import { type ReactNode, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from './theme';
import useAuthStore from '@shared/store/auth.store.ts';

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuthStore();
  const theme = useMemo(() => buildTheme(profile.theme), [profile.theme]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
