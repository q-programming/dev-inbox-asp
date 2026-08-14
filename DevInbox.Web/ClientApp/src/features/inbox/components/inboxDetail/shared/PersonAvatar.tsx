import { PersonReference } from '@api';
import Avatar from '@mui/material/Avatar';

/**
 * Builds up-to-two-letter initials for an avatar fallback. Prefers the person's displayName
 * (split on spaces), falling back to login when displayName is blank — login is always present
 * for a known person, so this only ever falls back to '?' when no person is given at all.
 */
const initials = (person?: PersonReference): string => {
  const source = person?.displayName?.trim() || person?.login?.trim();
  if (!source) {
    return '?';
  }

  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

interface IPersonAvatar {
  person?: PersonReference;
  size?: number;
}

/** Shared avatar used across the GitHub and ADO detail panels for authors/reviewers/assignees. */
const PersonAvatar = ({ person, size = 32 }: IPersonAvatar) => (
  <Avatar
    src={person?.avatarUrl ?? undefined}
    sx={{ width: size, height: size, fontSize: size * 0.4 }}
  >
    {initials(person)}
  </Avatar>
);

export default PersonAvatar;
