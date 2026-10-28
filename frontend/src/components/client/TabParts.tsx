import type { ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { tokens } from '../../theme/theme';
import { ArrowLeftIcon, InfoIcon } from './icons';

const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function ScreenHeader({ title, subtitle, onBack }: ScreenHeaderProps) {
  return (
    <Box
      component="header"
      sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 5, py: 4, borderBottom: `1px solid ${colors.divider}` }}
    >
      <IconButton
        onClick={onBack}
        aria-label="Voltar"
        sx={{
          width: touchTarget,
          height: touchTarget,
          flexShrink: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: `${radius.button}px`,
          color: colors.text,
        }}
      >
        <ArrowLeftIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>{subtitle}</Typography>
        )}
      </Box>
    </Box>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        bgcolor: colors.surface,
        fontSize: fontSize.button,
        fontWeight: fontWeight.extraBold,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </Box>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        mt: 6,
        mb: 3,
        fontSize: fontSize.caption,
        fontWeight: fontWeight.extraBold,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.textSecondary,
      }}
    >
      {children}
    </Typography>
  );
}

export function InfoNote({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <Box
      sx={{
        mt: 5,
        p: 4,
        display: 'flex',
        gap: 3,
        alignItems: 'flex-start',
        borderRadius: `${radius.card}px`,
        bgcolor: colors.surface,
        color: colors.textSecondary,
        fontSize: fontSize.small,
        lineHeight: 1.45,
      }}
    >
      <Box sx={{ flexShrink: 0, mt: '1px', display: 'flex' }}>{icon ?? <InfoIcon sx={{ fontSize: 18 }} />}</Box>
      <Box>{children}</Box>
    </Box>
  );
}
