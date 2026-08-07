import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import NoteForm, { NoteFormValues } from './NoteForm';
import { useCreateNoteMutation } from '../hooks/useNotesQuery';
import { useNoteModalStore } from '../store/noteModal.store';

/**
 * Global "add note" modal — a thin Dialog shell around NoteForm, driven entirely
 * by useNoteModalStore. Rendered once (see AppLayout) and opened from anywhere
 * (header "Add note" action, or the "Add note" action on an inbox item detail,
 * which passes attachedToInboxItemId so the note is linked to that item).
 */
const NoteFormModal = () => {
  const { isOpen, attachedToInboxItemId, close, title } = useNoteModalStore();
  const { addAlert } = useAlertStore();
  const createNote = useCreateNoteMutation();

  const itemId = attachedToInboxItemId;

  const handleSubmit = (values: NoteFormValues) => {
    createNote.mutate(
      {
        title: values.title,
        body: values.body || undefined,
        tags: values.tags?.length ? values.tags : undefined,
        followUpAt: values.followUpAt ? new Date(values.followUpAt) : undefined,
        attachedToInboxItemId: itemId,
      },
      {
        onSuccess: () => {
          addAlert({ type: AlertType.SUCCESS, message: 'Note added.' });
          close();
        },
        onError: () => {
          addAlert({ type: AlertType.ERROR, message: 'Failed to add note.' });
        },
      },
    );
  };

  return (
    <Dialog data-testid="note-form-modal" open={isOpen} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title ? `Add note to "${title}"` : itemId ? 'Add note to item' : 'Add note'}
        <IconButton data-testid="note-form-modal-close" size="small" onClick={close}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <NoteForm
          onSubmit={handleSubmit}
          onCancel={close}
          submitting={createNote.isPending}
          submitLabel="Add note"
        />
      </DialogContent>
    </Dialog>
  );
};

export default NoteFormModal;
