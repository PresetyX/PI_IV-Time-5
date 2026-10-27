import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../theme/theme';

interface StatusMessageProps {
  title: string;
  description?: string;
  tone?: 'neutral' | 'error';
  action?: ReactNode;
}

export default function StatusMessage({ title, description, tone = 'neutral', action }: StatusMessageProps) {
  return (
    <Box
      role={tone === 'error' ? 'alert' : 'status'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        px: 6,
        py: 12,
        textAlign: 'center',
      }}
    >
      <Typography variant="h3" sx={{ color: tone === 'error' ? tokens.colors.error : tokens.colors.text }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: tokens.colors.textSecondary }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
