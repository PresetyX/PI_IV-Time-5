import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { tokens } from '../../theme/theme';

interface ClientScreenProps {
  children: ReactNode;
  footer?: ReactNode;
  footerDivider?: boolean;
}

export default function ClientScreen({ children, footer, footerDivider = false }: ClientScreenProps) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: tokens.colors.panel }}>
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 390,
          minHeight: '100dvh',
          mx: 'auto',
          bgcolor: tokens.colors.background,
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
        {footer && (
          <Box
            sx={{
              px: 5,
              pt: 4,
              pb: 6,
              borderTop: footerDivider ? `1px solid ${tokens.colors.divider}` : 'none',
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  );
}
