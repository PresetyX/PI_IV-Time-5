import { Box, IconButton, Typography } from '@mui/material';
import { formatTableNumber } from '../../services/tables';
import { tokens } from '../../theme/theme';
import { ArrowLeftIcon } from './icons';

interface BackHeaderProps {
  title: string;
  onBack: () => void;
  tableNumber?: number;
}

const { colors, fontSize, fontWeight, radius, touchTarget } = tokens;

export default function BackHeader({ title, onBack, tableNumber }: BackHeaderProps) {
  return (
    <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 5, pt: 5 }}>
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
      <Typography sx={{ flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>{title}</Typography>
      {tableNumber !== undefined && (
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            py: 1.5,
            border: `1px solid ${colors.border}`,
            borderRadius: 999,
            fontSize: fontSize.button,
            fontWeight: fontWeight.extraBold,
            whiteSpace: 'nowrap',
          }}
        >
          Mesa {formatTableNumber(tableNumber)}
        </Box>
      )}
    </Box>
  );
}
