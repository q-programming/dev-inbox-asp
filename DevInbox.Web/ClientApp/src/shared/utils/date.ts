import { formatDistanceToNow, format } from 'date-fns';

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
/** "yyyy-MM-ddTHH:mm" in local time, as expected by <input type="datetime-local">. */
export const toDatetimeLocal = (value?: Date | string): string => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  return format(date, "yyyy-MM-dd'T'HH:mm");
};