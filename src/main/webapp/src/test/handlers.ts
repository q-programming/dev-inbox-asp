import { http, HttpResponse } from 'msw';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'REGULAR',
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

  // Auth defaults — override per-test with server.use()
  http.post('/api/auth/me', () => new HttpResponse(null, { status: 204 })),
  http.post('/api/auth/login', () => HttpResponse.json(mockUser)),
  http.post('/api/auth/register', () => HttpResponse.json(mockUser, { status: 201 })),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
