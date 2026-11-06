import { Box, CircularProgress, Typography } from '@mui/material';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import ClientScreen from './ClientScreen';
import FootNote from './FootNote';

const { colors, fontSize, fontWeight, radius } = tokens;

export interface AlcoholicItem {
  name: string;
  quantity: number;
}

interface AgeConfirmationScreenProps {
  storeName: string;
  /** Itens alcoólicos do pedido; ausente quando a tela não sabe quais são (ex.: repetir rodada). */
  items?: AlcoholicItem[];
  sending?: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

/** Confirmação de maioridade antes de enviar pedido com bebida alcoólica. Vale para o resto da visita. */
export default function AgeConfirmationScreen({
  storeName,
  items,
  sending = false,
  onConfirm,
  onBack,
}: AgeConfirmationScreenProps) {
  return (
    <ClientScreen
      footer={
        <>
          <ActionButton onClick={onConfirm} disabled={sending}>
            {sending ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : 'Tenho 18 anos ou mais'}
          </ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={onBack} disabled={sending}>
            Voltar ao carrinho
          </ActionButton>
          <FootNote>A venda de bebidas alcoólicas é proibida para menores de 18 anos.</FootNote>
        </>
      }
    >
      <Box
        sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.surface }}
      >
        <Box
          aria-hidden
          sx={{
            width: 88,
            height: 88,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: `3px solid ${colors.text}`,
            fontSize: 28,
            fontWeight: fontWeight.extraBold,
            color: colors.text,
          }}
        >
          18+
        </Box>
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
          Você tem 18 anos ou mais?
        </Typography>
        <Typography sx={{ mt: 3, color: colors.textSecondary }}>
          Seu pedido tem bebida alcoólica. Confirme sua idade para enviar. A equipe pode pedir um documento na
          entrega.
        </Typography>

        {items && items.length > 0 && (
          <Box
            component="ul"
            sx={{ mt: 6, mb: 0, p: 0, listStyle: 'none', border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}
          >
            {items.map((item, index) => (
              <Box
                component="li"
                key={item.name}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 4,
                  px: 4,
                  py: 4,
                  borderTop: index === 0 ? 'none' : `1px solid ${colors.divider}`,
                }}
              >
                <Typography sx={{ fontWeight: fontWeight.bold }}>{item.name}</Typography>
                <Typography sx={{ color: colors.textSecondary }}>× {item.quantity}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </ClientScreen>
  );
}
