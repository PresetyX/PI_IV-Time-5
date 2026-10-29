import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BrandMark from '../../components/BrandMark';
import { Box, ButtonBase, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ClosedStoreScreen from '../../components/client/ClosedStoreScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import FootNote from '../../components/client/FootNote';
import { BagIcon, ChevronRightIcon, TableIcon, TruckIcon } from '../../components/client/icons';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { formatStreet } from '../../services/store';
import type { ServiceMode, Store } from '../../services/store';
import { formatTableNumber } from '../../services/tables';
import { readVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

export default function ServiceModePage() {
  const { slug = '' } = useParams();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);

  if (state.status === 'loading') return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (!state.store.status.acceptingOrders) return <ClosedStoreScreen store={state.store} />;
  return <ServiceModeChoice store={state.store} />;
}

function ServiceModeChoice({ store }: { store: Store }) {
  const navigate = useNavigate();
  const visit = readVisit(store.slug);
  const table = visit.table;
  const street = formatStreet(store.address);
  const offers = (mode: ServiceMode) => store.serviceModes.includes(mode);
  const serviceFee = store.serviceFeeBasisPoints / 100;

  function chooseTable() {
    if (visit.sessionId && visit.guestToken && table) navigate(`/t/${store.slug}/comandas`);
    else navigate(table ? `/t/${store.slug}/identificacao` : `/t/${store.slug}/mesa?next=identificacao`);
  }

  return (
    <ClientScreen
      footer={
        <>
          <ActionButton tone="secondary" onClick={() => navigate(`/t/${store.slug}/cardapio`)}>
            Só ver o cardápio
          </ActionButton>
          <FootNote>Sem instalar aplicativo. Seus dados são usados só para o atendimento.</FootNote>
        </>
      }
    >
      <Box component="header" sx={{ px: 5, pt: 6, pb: 6, bgcolor: 'primary.main', color: colors.background }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
            bgcolor: colors.background,
            color: colors.text,
          }}
        >
          <BrandMark aria-hidden sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h2" component="p" sx={{ mt: 4, color: 'inherit' }}>
          {store.name}
        </Typography>
        <Typography sx={{ mt: 1, fontSize: fontSize.button, opacity: 0.9 }}>
          {street ? `Aberto agora · ${street}` : 'Aberto agora'}
        </Typography>
      </Box>

      <Box sx={{ px: 5, pt: 7, pb: 6 }}>
        <Typography variant="h3" component="h1">
          Como você quer pedir?
        </Typography>
        <Typography sx={{ mt: 1, fontSize: fontSize.button, color: colors.textSecondary }}>
          Dá para mudar depois, antes de enviar o pedido.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 5 }}>
          <ModeCard
            highlighted={offers('TABLE')}
            disabled={!offers('TABLE')}
            icon={<TableIcon />}
            title="Estou na mesa"
            description={
              serviceFee > 0
                ? `Peça do seu lugar e pague no fim. Taxa de serviço de ${serviceFee}%.`
                : 'Peça do seu lugar e pague no fim.'
            }
            detail={
              !offers('TABLE')
                ? 'Esta casa não atende na mesa'
                : table
                  ? `Mesa ${formatTableNumber(table.number)} detectada pelo QR`
                  : 'Você informa o número da mesa'
            }
            detailColor={table && offers('TABLE') ? 'primary.main' : colors.textMuted}
            onClick={chooseTable}
          />
          <ModeCard
            disabled={!offers('COUNTER')}
            icon={<BagIcon />}
            title="Retirar no balcão"
            description="Pague antes e retire com uma senha."
            detail={
              !offers('COUNTER')
                ? 'Esta casa não atende no balcão'
                : store.averagePrepMinutes
                  ? `Pronto em cerca de ${store.averagePrepMinutes} min`
                  : 'Sem taxa de serviço'
            }
            onClick={() => navigate(`/t/${store.slug}/balcao`)}
          />
          <ModeCard
            disabled={!offers('DELIVERY')}
            icon={<TruckIcon />}
            title="Receber em casa"
            description="A casa entrega na região."
            detail={offers('DELIVERY') ? 'Taxa de entrega calculada pelo endereço' : 'Esta casa não faz entrega'}
            onClick={() => navigate(`/t/${store.slug}/entrega`)}
          />
        </Box>
      </Box>
    </ClientScreen>
  );
}

interface ModeCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  detail: string;
  detailColor?: string;
  highlighted?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ModeCard({
  icon,
  title,
  description,
  detail,
  detailColor = colors.textMuted,
  highlighted = false,
  disabled = false,
  onClick,
}: ModeCardProps) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        minHeight: 96,
        px: 4,
        py: 4,
        textAlign: 'left',
        borderRadius: `${radius.card}px`,
        border: highlighted ? `2px solid ${colors.text}` : `1px solid ${colors.border}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          bgcolor: highlighted ? colors.text : colors.surface,
          color: highlighted ? colors.background : colors.text,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.lead, fontWeight: fontWeight.extraBold }}>{title}</Typography>
        <Typography sx={{ mt: 0.5, fontSize: fontSize.button, color: colors.textSecondary }}>{description}</Typography>
        <Typography sx={{ mt: 1, fontSize: fontSize.body, fontWeight: fontWeight.extraBold, color: detailColor }}>
          {detail}
        </Typography>
      </Box>
      <ChevronRightIcon sx={{ fontSize: 22, color: colors.text, flexShrink: 0 }} />
    </ButtonBase>
  );
}
