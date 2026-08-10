import { PersonReference } from '@api';
import Avatar from '@mui/material/Avatar';

/** Builds up-to-two-letter initials from a display name, for avatar fallbacks. */
const initials = (name?: string): string =>
  name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') ?? '?';

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
    {initials(person?.displayName)}
  </Avatar>
);

export default PersonAvatar;
