import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import SyncIcon from '@mui/icons-material/Sync';
import NoteAltIcon from '@mui/icons-material/NoteAlt';

interface Feature {
  icon: SvgIconComponent;
  title: string;
  description: string;
  /** Grid md columns (out of 12) */
  cols: number;
  /** Render on primary dark background */
  dark?: boolean;
  /** Optional tags displayed as outlined chips */
  tags?: string[];
  /** Show the private note preview block */
  notePreview?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: InboxIcon,
    title: 'Unified Inbox',
    description:
      'One feed to rule them all. See every pending PR, assigned ticket, and mention in a chronological stream. Keyboard-first navigation designed for speed.',
    cols: 8,
    tags: ['Multi-account', 'Keyboard Shortcuts'],
  },
  {
    icon: SyncIcon,
    title: 'Incremental Sync',
    description:
      "Only fetch what's changed. App polling engine minimises API overhead while keeping you current in real-time.",
    cols: 4,
    dark: true,
  },
  {
    icon: NoteAltIcon,
    title: 'Personal Overlays',
    description:
      'Add private context to public items. Layer your thoughts, review notes, or priority tags that only you can see, directly on top of PRs and tickets.',
    cols: 12,
    notePreview: true,
  },
];

const NotePreview = () => (
  <Box
    sx={{
      mt: 2,
      padding: 2,
      border: 1,
      borderColor: 'note.border',
      borderRadius: 2,
      bgcolor: 'background.paper',
      maxWidth: 480,
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="overline" sx={{ color: 'note.labelText' }}>
        PRIVATE NOTE
      </Typography>
      <LockOutlinedIcon sx={{ fontSize: 14, color: 'warning.main' }} />
    </Box>
    <Typography variant="body2" sx={{ fontStyle: 'italic' }} color="text.secondary">
      "Verify the SQL migration script for the v2 schema specifically. Don't forget the rollback
      plan."
    </Typography>
  </Box>
);

/** Feature cards section — "Master Your Technical Context". */
const FeaturesSection = () => (
  <Box
    component="section"
    data-testid="features-section"
    sx={{ px: { xs: 3, md: 8 }, py: { xs: 8, md: 10 }, bgcolor: 'background.default' }}
  >
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ textAlign: 'center' }} gutterBottom>
        Master Your Technical Context
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 6 }}>
        High information density, zero cognitive overload. Built by engineers, for engineers.
      </Typography>

      <Grid container spacing={3}>
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Grid key={feature.title} size={{ xs: 12, md: feature.cols }}>
              <Card
                variant={feature.dark ? 'elevation' : 'outlined'}
                sx={{
                  height: '100%',
                  ...(feature.dark && { bgcolor: 'primary.main', color: 'primary.contrastText' }),
                }}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Icon
                    sx={{
                      mb: 2,
                      display: 'block',
                      color: feature.dark
                        ? 'primary.contrastText'
                        : feature.notePreview
                          ? 'warning.main'
                          : 'text.secondary',
                      opacity: feature.dark ? 0.8 : 1,
                    }}
                  />
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: feature.tags || feature.notePreview ? 2 : 0,
                      maxWidth: feature.cols === 12 ? 540 : 340,
                      opacity: feature.dark ? 0.85 : 1,
                    }}
                    color={feature.dark ? 'inherit' : 'text.secondary'}
                  >
                    {feature.description}
                  </Typography>

                  {feature.tags && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {feature.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          color="success"
                        />
                      ))}
                    </Box>
                  )}

                  {feature.notePreview && <NotePreview />}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  </Box>
);

export default FeaturesSection;
