import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { describeNextOpening, groupOpeningHours } from '../../services/hours';
import type { Store } from '../../services/store';
import { tokens } from '../../theme/theme';
import ActionButton from './ActionButton';
import ClientScreen from './ClientScreen';
import FootNote from './FootNote';
import { ClockIcon } from './icons';

const { colors, fontSize, fontWeight, radius } = tokens;

function closedMessage(store: Store): string {
  const { status } = store;
  if (status.open && status.paused) {
    return 'A cozinha pausou os pedidos por alguns minutos. Você pode dar uma olhada no cardápio enquanto isso.';
  }
  if (status.open) {
    return 'A cozinha já encerrou os pedidos de hoje. Você pode dar uma olhada no cardápio enquanto isso.';
  }
  if (status.nextOpening) {
    return `O cardápio volta a aceitar pedidos ${describeNextOpening(status.nextOpening)}. Você pode dar uma olhada enquanto isso.`;
  }
  return 'Esta casa ainda não informou o horário de funcionamento.';
}

export default function ClosedStoreScreen({ store }: { store: Store }) {
  const navigate = useNavigate();
  const groups = groupOpeningHours(store.openingHours);

  return (
    <ClientScreen
      footer={
        <>
          <ActionButton tone="secondary" onClick={() => navigate(`/t/${store.slug}/cardapio`)}>
            Ver o cardápio mesmo assim
          </ActionButton>
          <FootNote>Nenhum pedido é aceito fora do horário.</FootNote>
        </>
      }
    >
      <Box
        sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.surface }}
      >
        <ClockIcon sx={{ fontSize: 64, color: colors.text }} />
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
          {store.name}
        </Typography>
        <Typography variant="h2" component="h1" sx={{ mt: 3 }}>
          Estamos fechados agora
        </Typography>
        <Typography sx={{ mt: 3, color: colors.textSecondary }}>{closedMessage(store)}</Typography>

        {groups.length > 0 && (
          <Box
            component="dl"
            sx={{ mt: 6, mb: 0, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}
          >
            {groups.map((group, index) => (
              <Box
                key={group.label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 4,
                  px: 4,
                  py: 4,
                  borderTop: index === 0 ? 'none' : `1px solid ${colors.divider}`,
                }}
              >
                <Typography component="dt" sx={{ fontWeight: fontWeight.extraBold }}>
                  {group.label}
                </Typography>
                <Typography component="dd" sx={{ m: 0, fontSize: fontSize.button, color: colors.textSecondary }}>
                  {group.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </ClientScreen>
  );
}
