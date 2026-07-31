import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(
  value?: Date | string | null,
): string {
  if (!value) {
    return '';
  }

  return formatDistanceToNow(
    value instanceof Date ? value : new Date(value),
    { addSuffix: true },
  );
}