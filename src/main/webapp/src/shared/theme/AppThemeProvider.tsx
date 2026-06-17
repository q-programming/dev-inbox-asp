import { type ReactNode, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from './theme';
import useUserStore from '@shared/store/user.store.ts';

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useUserStore();
  const theme = useMemo(() => buildTheme(profile.theme), [profile.theme]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
