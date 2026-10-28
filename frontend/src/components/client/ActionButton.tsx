import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material';
import { tokens } from '../../theme/theme';

type ActionVariant = 'primary' | 'secondary' | 'quiet';

interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
  tone?: ActionVariant;
}

const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

const toneStyles = {
  primary: {
    bgcolor: colors.text,
    color: colors.background,
    '&:hover': { bgcolor: '#000000' },
    '&.Mui-disabled': { bgcolor: colors.border, color: colors.textMuted },
  },
  secondary: {
    bgcolor: colors.background,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    '&:hover': { bgcolor: colors.surface },
  },
  quiet: {
    bgcolor: 'transparent',
    color: colors.textSecondary,
    '&:hover': { bgcolor: colors.surface },
  },
};

export default function ActionButton({ tone = 'primary', sx, ...props }: ActionButtonProps) {
  return (
    <Button
      fullWidth
      disableElevation
      {...props}
      sx={{
        minHeight: tone === 'quiet' ? touchTarget : 56,
        borderRadius: `${radius.button}px`,
        fontSize: fontSize.lead,
        fontWeight: fontWeight.extraBold,
        ...toneStyles[tone],
        ...sx,
      }}
    />
  );
}
