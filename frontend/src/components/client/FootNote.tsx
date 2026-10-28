import type { ReactNode } from 'react';
import { Typography } from '@mui/material';
import { tokens } from '../../theme/theme';

export default function FootNote({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="caption"
      component="p"
      sx={{ mt: 3, textAlign: 'center', fontSize: tokens.fontSize.small, color: tokens.colors.textMuted }}
    >
      {children}
    </Typography>
  );
}
