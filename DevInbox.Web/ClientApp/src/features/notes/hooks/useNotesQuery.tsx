import { CreateNoteRequest, NoteDetail, NotesClient } from '@api';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const notesApi = new NotesClient(BASE_URL, { fetch: apiFetch });

/**
 * Note create/update/delete mutations. There is no `useNotesQuery`/list-fetch
 * hook here on purpose — notes are inbox items, so they're browsed via
 * useInboxQuery({ source: ItemSource.Note }) / useInboxItemQuery, not a
 * separate notes list endpoint (see NotesController).
 */
export const useCreateNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<NoteDetail, ApiError, CreateNoteRequest>({
    mutationFn: (data) => notesApi.createNote(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.items });
      queryClient.invalidateQueries({ queryKey: inboxKeys.summary });
      if (variables.attachedToInboxItemId !== undefined) {
        queryClient.invalidateQueries({
          queryKey: [...inboxKeys.detail, variables.attachedToInboxItemId],
        });
      }
    },
    meta: { silent: true },
  });
};

interface UpdateNoteVariables {
  id: number;
  data: CreateNoteRequest;
}

export const useUpdateNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<NoteDetail, ApiError, UpdateNoteVariables>({
    mutationFn: ({ id, data }) => notesApi.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.items });
      queryClient.invalidateQueries({ queryKey: inboxKeys.detail });
    },
  });
};

export const useDeleteNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { noteId: number; noteInboxItemId?: number; attachedToInboxItemId?: number }>({
    mutationFn: ({ noteId }) => notesApi.deleteNote(noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.items });
      queryClient.invalidateQueries({ queryKey: inboxKeys.summary });
      if (variables.noteInboxItemId !== undefined) {
        // refetchType: 'none' marks the deleted note's own detail stale without
        // triggering an automatic refetch — this item is gone, so we must never
        // let a lingering/still-mounted observer issue a GET for it.
        queryClient.invalidateQueries({
          queryKey: [...inboxKeys.detail, variables.noteInboxItemId],
          refetchType: 'none',
        });
      }
      if (variables.attachedToInboxItemId !== undefined) {
        // The attached target item still exists, so refetch normally to drop the
        // now-stale attachedNote from its detail.
        queryClient.invalidateQueries({
          queryKey: [...inboxKeys.detail, variables.attachedToInboxItemId],
        });
      }
    },
  });
};
