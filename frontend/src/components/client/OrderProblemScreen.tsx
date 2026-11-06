import type { ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import ClientScreen from './ClientScreen';
import FootNote from './FootNote';

const { colors, fontSize, fontWeight, radius } = tokens;

interface OrderProblemScreenProps {
  storeName: string;
  icon: ReactNode;
  title: string;
  description: string;
  /** Lista do que aconteceu (itens esgotados, preços que mudaram). */
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  sending?: boolean;
  footNote?: string;
}

/** Pedido recusado antes de chegar à cozinha. Nada foi enviado e o carrinho continua guardado. */
export default function OrderProblemScreen({
  storeName,
  icon,
  title,
  description,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  sending = false,
  footNote = 'Nada foi enviado para a cozinha. Seu carrinho continua guardado.',
}: OrderProblemScreenProps) {
  return (
    <ClientScreen
      footer={
        <>
          {primaryLabel && onPrimary && (
            <ActionButton onClick={onPrimary} disabled={sending}>
              {sending ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : primaryLabel}
            </ActionButton>
          )}
          <ActionButton
            tone={primaryLabel ? 'quiet' : 'primary'}
            sx={{ mt: primaryLabel ? 2 : 0 }}
            onClick={onSecondary}
            disabled={sending}
          >
            {secondaryLabel}
          </ActionButton>
          <FootNote>{footNote}</FootNote>
        </>
      }
    >
      <Box
        sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.surface }}
      >
        {icon}
      </Box>
      <Box sx={{ px: 5, pt: 8, pb: 6 }}>
        <Typography
          sx={{
            fontSize: fontSize.small,
            fontWeight: fontWeight.extraBold,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: colors.textSecondary,
          }}
        >
          {storeName}
        </Typography>
        <Typography variant="h2" component="h1" sx={{ mt: 3 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 3, color: colors.textSecondary }}>{description}</Typography>
        {children && (
          <Box sx={{ mt: 6, px: 4, py: 2, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
            {children}
          </Box>
        )}
      </Box>
    </ClientScreen>
  );
}
