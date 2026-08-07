import { InboxItemDetail } from '@api';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import useNoteModalStore from '@feature/notes/store/noteModal.store';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { Button, Stack, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

interface IInboxDetailFooter {
  details: InboxItemDetail;
}

/**
 * Shared detail-panel footer: surfaces the single note (if any) attached to this item, or an
 * "Add Note" action when none exists yet — an item can only ever have one attached note.
 */
const InboxDetailFooter = ({ details }: IInboxDetailFooter) => {
  const { open } = useNoteModalStore();
  const { openItem } = useInboxStore();
  const attachedNote = details.attachedNote;

  if (attachedNote) {
    return (
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Paper
          data-testid="inbox-detail-attached-note"
          variant="outlined"
          onClick={() => attachedNote.inboxItemId !== undefined && openItem(attachedNote.inboxItemId)}
          sx={{
            p: 1.5,
            cursor: 'pointer',
            bgcolor: (theme) => (theme.palette.mode === 'light' ? '#fdf6e8' : '#2a2618'),
            borderColor: 'note.border',
            '&:hover': { borderColor: 'note.labelText' },
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <EditNoteIcon
              fontSize="small"
              sx={{ color: 'note.labelText' }}
            />
            <Typography
              variant="overline"
              sx={{ color: 'note.labelText', flex: 1 }}
            >
              Note
            </Typography>
            <ChevronRightIcon
              fontSize="small"
              sx={{ color: 'text.disabled' }}
            />
          </Stack>
          {!!attachedNote.title && <Typography variant="subtitle2">{attachedNote.title}</Typography>}
          {!!attachedNote.body && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {attachedNote.body}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Button
        data-testid="inbox-detail-add-note-button"
        onClick={() => open(details)}
        variant="contained"
        color="primary"
        size="small"
      >
        Add Note
      </Button>
    </Box>
  );
};
export default InboxDetailFooter;
