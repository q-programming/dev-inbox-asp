import { ReactNode, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ICollapsibleSection {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  noTopMargin?: boolean;
  'data-testid'?: string;
}

/** Titled detail section whose body can be toggled; expanded by default. */
const CollapsibleSection = ({
  title,
  children,
  defaultExpanded = true,
  noTopMargin = false,
  'data-testid': testId,
}: ICollapsibleSection) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ mt: noTopMargin ? 0 : 2.5, minWidth: 0 }} data-testid={testId}>
      <ButtonBase
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        data-testid={testId ? `${testId}-toggle` : undefined}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderRadius: 1 }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            transform: expanded ? 'none' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        />
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
      </ButtonBase>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ mt: 0.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
};

export default CollapsibleSection;
