import { InboxItemDetail } from '@api';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { useDeleteNoteMutation, useUpdateNoteMutation } from '@feature/notes/hooks/useNotesQuery';
import NoteForm, { NoteFormValues } from '@feature/notes/components/NoteForm';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import ConfirmModal from '@shared/components/confirmModal/ConfirmModal';
import { useCallback, useMemo, useState } from 'react';
import InboxDetailHeader from '../InboxDetailHeader';
import { toDatetimeLocal } from '@shared/utils/date';

interface INoteDetail {
  details: InboxItemDetail;
}



const NoteDetail = ({ details }: INoteDetail) => {
  const note = details.note;
  const { addAlert } = useAlertStore();
  const { openItem, closeItem } = useInboxStore();
  const updateNote = useUpdateNoteMutation();
  const deleteNote = useDeleteNoteMutation();
  const linkedItem = note?.linkedItem;
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const noteInboxItemId = useMemo(() => (details.id !== undefined ? Number(details.id) : undefined), [details.id]);
  const attachedToInboxItemId = useMemo(
    () => (linkedItem?.id !== undefined ? Number(linkedItem.id) : undefined),
    [linkedItem?.id],
  );

  const handleSubmit = useCallback((values: NoteFormValues) => {
    if (!note?.noteId) {
      return;
    }
    updateNote.mutate(
      {
        id: note.noteId,
        data: {
          title: values.title,
          body: values.body || undefined,
          tags: values.tags?.length ? values.tags : undefined,
          followUpAt: values.followUpAt ? new Date(values.followUpAt) : undefined,
        },
      },
      {
        onSuccess: () => {
          addAlert({ type: AlertType.SUCCESS, message: 'Note updated.' });
        },
        onError: () => {
          addAlert({ type: AlertType.ERROR, message: 'Failed to update note.' });
        },
      },
    );
  }, [addAlert, note?.noteId, updateNote]);

  const handleDeleteIntent = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!note?.noteId) {
      return;
    }
    setIsDeleteConfirmOpen(false);
    // closeItem() runs only on success (not eagerly) so a failed delete leaves the
    // panel open for retry. The mutation hook uses refetchType: 'none' for this
    // note's own detail key, so there's no race where a GET hits the deleted item
    // regardless of exact unmount/close timing here.
    deleteNote.mutate({ noteId: note.noteId, noteInboxItemId, attachedToInboxItemId }, {
      onSuccess: () => {
        closeItem();
        addAlert({ type: AlertType.SUCCESS, message: 'Note deleted.' });
      },
      onError: () => {
        addAlert({ type: AlertType.ERROR, message: 'Failed to delete note.' });
      },
    });
  }, [addAlert, attachedToInboxItemId, closeItem, deleteNote, note?.noteId, noteInboxItemId]);

  return (
    <Box
      data-testid="note-detail"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <InboxDetailHeader details={details} />
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: { xs: 2, md: 3 },
          py: 2,
        }}
      >
        {!!note && (
          <>
            {!!linkedItem && (
              <Paper
                data-testid="note-detail-linked-item"
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <LinkOutlinedIcon fontSize="small" color="action" />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    Attached to <strong>{linkedItem.title}</strong>
                  </Typography>
                </Stack>
                <Button
                  data-testid="note-detail-go-to-item"
                  size="small"
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  onClick={() => {
                    const id = Number(linkedItem.id);
                    if (!Number.isNaN(id)) {
                      openItem(id);
                    }
                  }}
                >
                  Go to item
                </Button>
              </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
              <NoteForm
                key={note.noteId}
                dense
                defaultValues={{
                  title: note.title ?? '',
                  body: note.body ?? '',
                  tags: note.tags ?? [],
                  followUpAt: toDatetimeLocal(note.followUpAt),
                }}
                onSubmit={handleSubmit}
                onDelete={handleDeleteIntent}
                submitting={updateNote.isPending}
                submitLabel="Save changes"
              />
            </Paper>
          </>
        )}
      </Box>
      <ConfirmModal
        open={isDeleteConfirmOpen}
        title="Delete note?"
        body="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteNote.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};

export default NoteDetail;
