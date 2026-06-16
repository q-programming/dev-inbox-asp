import { type ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { createQueryClient } from '@shared/api/queryClient';
import { AppThemeProvider } from '@shared/theme/AppThemeProvider';

interface RenderOptions {
  /** Initial route entries passed to MemoryRouter. Defaults to ['/'].  */
  initialEntries?: string[];
}

/**
 * Wraps the given UI in the full provider stack used across the app:
 *   AppThemeProvider → SnackbarProvider → QueryClientProvider (fresh client) → MemoryRouter
 *
 * Every spec that mounts a page or route-aware component should use this
 * instead of hand-rolling the same provider tree.
 */
export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'] }: RenderOptions = {},
): RenderResult {
  const client = createQueryClient();

  return render(
    <AppThemeProvider>
      <SnackbarProvider maxSnack={5}>
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </QueryClientProvider>
      </SnackbarProvider>
    </AppThemeProvider>,
  );
}
