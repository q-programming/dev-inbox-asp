import { http, HttpResponse } from 'msw';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'REGULAR',
  integrations: [],
};

export const handlers = [
  http.get('/api/healthz', () => HttpResponse.json({ status: 'UP' })),

  http.get('/api/inbox', () =>
    HttpResponse.json({
      items: [],
      totalElements: 0,
      page: 0,
      size: 50,
    }),
  ),

  // Default no-op summary/status responses so components rendering AppSidebar/heartbeat
  // (e.g. Layout, AppSidebar specs) don't fall through to the Vite dev proxy — override
  // per-test with server.use() when specific summary/status data is needed.
  http.get('/api/inbox/summary', () => HttpResponse.json({})),
  http.get('/api/inbox/status', () => HttpResponse.json({})),

  // Default settings response so any component reading settings (e.g. AppThemeProvider,
  // SettingsActions) during unrelated tests doesn't fall through to the Vite dev proxy —
  // override per-test with server.use() when specific settings data is needed.
  http.get('/api/settings', () =>
    HttpResponse.json({
      theme: 'LIGHT',
      density: 'COMFORTABLE',
      fontSize: 14,
      sideBarCollapsed: false,
    }),
  ),

  // Auth defaults — override per-test with server.use()
  http.post('/api/auth/me', () => new HttpResponse(null, { status: 204 })),
  http.post('/api/auth/login', () => HttpResponse.json(mockUser)),
  http.post('/api/auth/register', () => HttpResponse.json(mockUser, { status: 201 })),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.post('/api/integrations/github/pat', () =>
    HttpResponse.json({ id: 1, status: 'ACTIVE', type: 'GITHUB' }),
  ),
  http.delete('/api/integrations/github', () => new HttpResponse(null, { status: 204 })),
  http.post('/api/integrations/ado/pat', () =>
    HttpResponse.json({ id: 2, status: 'ACTIVE', type: 'ADO' }),
  ),
  http.delete('/api/integrations/ado', () => new HttpResponse(null, { status: 204 })),
];
