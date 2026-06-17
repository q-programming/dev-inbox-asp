import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/api/queryClient';
import { AppThemeProvider } from '@shared/theme/AppThemeProvider';
import { SnackbarProvider } from 'notistack';
import App from './App';
import './index.css';
import AlertBridge from '@app/common/AlertBridge.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider
          maxSnack={5}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionProps={{ direction: 'up' }}
          classes={{
            containerAnchorOriginBottomCenter: 'notistack-bottom-center',
          }}
        >
          <AlertBridge />
          <App />
        </SnackbarProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  </StrictMode>,
);
