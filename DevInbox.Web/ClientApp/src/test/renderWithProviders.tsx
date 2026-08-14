import { type ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { createQueryClient } from '@shared/api/queryClient';
import { AppThemeProvider } from '@shared/theme/AppThemeProvider';

interface RenderOptions {
  /** Initial route entries passed to MemoryRouter. Defaults to ['/'].  */
  initialEntries?: string[];
  /**
   * Route path pattern to mount `ui` under (e.g. '/inbox/:itemId'). When provided, `ui` is
   * rendered as the element of a single `<Route>` so hooks like `useParams` resolve
   * against `initialEntries`. Defaults to '*' so any initial entry matches without the
   * caller needing to know the exact pattern.
   */
  routePath?: string;
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
  { initialEntries = ['/'], routePath = '*' }: RenderOptions = {},
): RenderResult {
  const client = createQueryClient();

  return render(ui, {
    wrapper: ({ children }) => (
      <AppThemeProvider>
        <SnackbarProvider maxSnack={5}>
          <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path={routePath} element={children} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>
        </SnackbarProvider>
      </AppThemeProvider>
    ),
  });
}
