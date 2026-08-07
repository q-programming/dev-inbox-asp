import { zodResolver } from '@hookform/resolvers/zod';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

export const noteFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().trim().max(10_000, 'Body is too long').optional(),
  tags: z.array(z.string()).optional(),
  // Bound to a <TextField type="datetime-local">, so kept as the raw local-time string here —
  // NoteForm's callers convert to/from Date at the API boundary.
  followUpAt: z.string().optional(),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export interface INoteForm {
  defaultValues?: Partial<NoteFormValues>;
  onSubmit: (values: NoteFormValues) => void | Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  submitting?: boolean;
  submitLabel?: string;
  /** Renders a compact "form-only" layout without the outer Cancel/Submit button row spacing — used when embedded inline (e.g. NoteDetail) rather than in a modal. */
  dense?: boolean;
}

/**
 * The note create/edit form itself — title, body, tags and an optional follow-up
 * date. Deliberately has no notion of "modal" or "inline": NoteFormModal wraps it
 * for the create flow, NoteDetail embeds it directly for on-the-fly editing.
 */
const NoteForm = ({ defaultValues, onSubmit, onCancel, onDelete, submitting, submitLabel = 'Save note', dense }: INoteForm) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: '',
      body: '',
      tags: [],
      followUpAt: '',
      ...defaultValues,
    },
  });

  return (
    <Box
      component="form"
      data-testid="note-form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1.5 : 2 }}
    >
      <TextField
        data-testid="note-form-title"
        label="Title"
        fullWidth
        autoFocus={!dense}
        error={!!errors.title}
        helperText={errors.title?.message}
        {...register('title')}
      />

      <TextField
        data-testid="note-form-body"
        label="Body"
        fullWidth
        multiline
        minRows={dense ? 4 : 6}
        error={!!errors.body}
        helperText={errors.body?.message}
        {...register('body')}
      />

      <Controller
        name="tags"
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <Autocomplete
            {...field}
            multiple
            freeSolo
            options={[]}
            value={value ?? []}
            onChange={(_event, newValue) => onChange(newValue)}
            renderValue={(tagValue, getItemProps) =>
              tagValue.map((option, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip variant="outlined" size="small" label={option} {...itemProps} key={key} />;
              })
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Add a tag and press enter" data-testid="note-form-tags" />
            )}
          />
        )}
      />

      <TextField
        data-testid="note-form-follow-up"
        label="Follow up"
        type="datetime-local"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        error={!!errors.followUpAt}
        helperText={errors.followUpAt?.message}
        {...register('followUpAt')}
      />

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: dense ? 0.5 : 1 }}>
        {!!onCancel && (
          <Button data-testid="note-form-cancel" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        {!!onDelete && (
          <Button data-testid="note-form-delete" onClick={onDelete} disabled={submitting} type="button" color="error">
            Delete
          </Button>
        )}
        <Button
          data-testid="note-form-submit"
          type="submit"
          variant="contained"
          disabled={submitting || (dense && !isDirty)}
          endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
};

export default NoteForm;
