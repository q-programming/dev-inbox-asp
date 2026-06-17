import { type ReactNode, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from './theme';
import useUserStore from '@shared/store/user.store.ts';

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = useUserStore((state) => state.profile.theme);
  const fontSize = useUserStore((state) => state.profile.fontSize);
  const builtTheme = useMemo(() => buildTheme(theme, fontSize), [theme, fontSize]);
  return (
    <ThemeProvider theme={builtTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
