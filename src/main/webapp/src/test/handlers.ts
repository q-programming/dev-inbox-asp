import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/healthz', () =>
    HttpResponse.json({ status: 'UP' }),
  ),

  http.get('/api/inbox', () =>
    HttpResponse.json({
      items: [],
      totalElements: 0,
      page: 0,
      size: 50,
    }),
  ),
];
