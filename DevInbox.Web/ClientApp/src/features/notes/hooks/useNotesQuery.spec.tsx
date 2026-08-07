import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import type { CreateNoteRequest, NoteDetail } from '@api';
import { createQueryClient } from '@shared/api/queryClient';
import { server } from '@test/setupBrowserTests';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import useAlertStore from '@shared/store/alert.store';
import {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useUpdateNoteMutation,
} from './useNotesQuery';

const createNoteRequest = (overrides: Partial<CreateNoteRequest> = {}): CreateNoteRequest => ({
  title: 'My note',
  body: 'Note body',
  ...overrides,
});

const createNoteDetail = (overrides: Partial<NoteDetail> = {}): NoteDetail => ({
  noteId: 1,
  title: 'My note',
  body: 'Note body',
  ...overrides,
});

function makeWrapper() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  });
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

describe('useNotesQuery hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAlertStore.setState({ alerts: [] });
  });

  describe('useCreateNoteMutation', () => {
    it('should invalidate inbox items and summary on success for a standalone note', async () => {
      server.use(
        http.post('/api/notes', () => HttpResponse.json(createNoteDetail(), { status: 201 })),
      );

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useCreateNoteMutation(), { wrapper: Wrapper });

      result.current.mutate(createNoteRequest());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.items });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.summary });
      expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
        queryKey: expect.arrayContaining([...inboxKeys.detail]),
      });
    });

    it('should also invalidate the inbox item detail when attached to an inbox item', async () => {
      server.use(
        http.post('/api/notes', () => HttpResponse.json(createNoteDetail(), { status: 201 })),
      );

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useCreateNoteMutation(), { wrapper: Wrapper });

      result.current.mutate(createNoteRequest({ attachedToInboxItemId: 42 }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.items });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.summary });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: [...inboxKeys.detail, 42],
      });
    });

    it('should set isError and not invalidate any queries when the server rejects the request', async () => {
      server.use(http.post('/api/notes', () => HttpResponse.json({}, { status: 400 })));

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useCreateNoteMutation(), { wrapper: Wrapper });

      result.current.mutate(createNoteRequest());

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateNoteMutation', () => {
    it('should invalidate inbox items and detail on success', async () => {
      server.use(
        http.put('/api/notes/:id', () => HttpResponse.json(createNoteDetail({ noteId: 5 }))),
      );

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateNoteMutation(), { wrapper: Wrapper });

      result.current.mutate({ id: 5, data: createNoteRequest() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.items });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.detail });
    });

    it('should set isError when the server returns 500', async () => {
      server.use(http.put('/api/notes/:id', () => HttpResponse.json({}, { status: 500 })));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useUpdateNoteMutation(), { wrapper: Wrapper });

      result.current.mutate({ id: 5, data: createNoteRequest() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteNoteMutation', () => {
    it('should invalidate list and summary, and mark the deleted note detail stale without refetching, on success', async () => {
      server.use(http.delete('/api/notes/:id', () => new HttpResponse(null, { status: 204 })));

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useDeleteNoteMutation(), { wrapper: Wrapper });

      result.current.mutate({ noteId: 5, noteInboxItemId: 17, attachedToInboxItemId: 99 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.items });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.summary });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: [...inboxKeys.detail, 17],
        refetchType: 'none',
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: [...inboxKeys.detail, 99] });
    });

    it('should not invalidate any detail key when there is no attached item and no note inbox item id', async () => {
      server.use(http.delete('/api/notes/:id', () => new HttpResponse(null, { status: 204 })));

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useDeleteNoteMutation(), { wrapper: Wrapper });

      result.current.mutate({ noteId: 5 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: expect.arrayContaining([...inboxKeys.detail]) }),
      );
    });

    it('should set isError when the server returns 500', async () => {
      server.use(http.delete('/api/notes/:id', () => HttpResponse.json({}, { status: 500 })));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDeleteNoteMutation(), { wrapper: Wrapper });

      result.current.mutate({ noteId: 5 });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
