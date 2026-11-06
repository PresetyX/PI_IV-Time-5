import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { ClocheIcon } from '../../components/client/icons';
import { InfoNote, ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { orderStatusLabel } from '../../services/bill';
import { formatCents } from '../../services/format';
import { fetchOrder } from '../../services/tabs';
import type { TrackedLine, TrackedOrder } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 5000;
const { colors, fontSize, fontWeight, radius } = tokens;

const STEP_LABEL: Record<string, string> = {
  AWAITING_PAYMENT: 'Esperando o pagamento no caixa', // [Mateus · Card 5]
  RECEIVED: 'Recebido pela cozinha',
  PREPARING: 'Entrou em preparo',
  READY: 'Pronto para entrega',
  DELIVERED: 'Entregue na mesa',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function OrderStatusPage() {
  const { slug = '', orderId = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(slug, orderId));
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
      else setLoadFailed(true);
    }
  }, [slug, orderId, handleExpired]);

  useEffect(() => {
    if (gate) return undefined;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [gate, load]);

  if (gate) return <Navigate to={gate} replace />;
  if (missing) return <Navigate to={`/t/${slug}/conta`} replace />;
  if (state.status === 'loading' || (order === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (order === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  const ready = order.status === 'READY';
  const cancelled = order.status === 'CANCELLED' || order.status === 'CANCELED';
  const steps = [...order.timeline].reverse();

  return (
    <ClientScreen
      footerDivider
      footer={
        <Box sx={{ display: 'flex', gap: 3 }}>
          <ActionButton tone="secondary" onClick={() => navigate(`/t/${slug}/cardapio`)}>
            Pedir mais
          </ActionButton>
          <ActionButton onClick={() => navigate(`/t/${slug}/conta`)}>Ver a conta</ActionButton>
        </Box>
      }
    >
      {ready ? (
        <Box component="header" sx={{ px: 5, pt: 6, pb: 6, bgcolor: 'primary.main', color: '#FFFFFF' }}>
          <Box
            aria-hidden
            sx={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              bgcolor: 'rgba(255,255,255,.18)',
            }}
          >
            <ClocheIcon sx={{ fontSize: 24 }} />
          </Box>
          <Typography component="h1" sx={{ mt: 5, fontSize: fontSize.heading, fontWeight: fontWeight.extraBold, lineHeight: 1.15 }}>
            Seu pedido ficou pronto
          </Typography>
          <Typography sx={{ mt: 1, fontSize: fontSize.small, opacity: 0.9 }}>
            {order.tableNumber > 0
              ? `O garçom já está levando à mesa ${formatTableNumber(order.tableNumber)}.`
              : 'Retire no balcão e diga a sua senha.'}
          </Typography>
        </Box>
      ) : (
        <ScreenHeader
          title={`Pedido #${order.number}`}
          // [Mateus · Card 5] Alteração: pedido de balcão não tem mesa.
          subtitle={`${order.tableNumber > 0 ? `Mesa ${formatTableNumber(order.tableNumber)}` : 'Balcão'} · ${orderStatusLabel(order.status)}`}
          onBack={() => navigate(`/t/${slug}/conta`)}
        />
      )}

      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {cancelled && (
          <Box sx={{ mb: 5 }}>
            <InfoNote>A casa cancelou este pedido e o valor saiu da sua comanda. Se tiver dúvida, chame o garçom.</InfoNote>
          </Box>
        )}
        <Box sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}>
              PEDIDO #{order.number}
            </Typography>
            <Box
              sx={{
                px: 3,
                py: 0.5,
                borderRadius: 999,
                bgcolor: ready ? colors.text : colors.surface,
                color: ready ? colors.background : colors.textSecondary,
                fontSize: fontSize.caption,
                fontWeight: fontWeight.extraBold,
              }}
            >
              {orderStatusLabel(order.status)}
            </Box>
          </Box>
          {order.items.map((item, index) => (
            <Line key={index} item={item} />
          ))}
        </Box>

        <SectionLabel>Linha do tempo</SectionLabel>
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {steps.map((step, index) => (
            <Box component="li" key={`${step.status}-${step.at}`} sx={{ display: 'flex', gap: 3, pb: 3 }}>
              <Box
                aria-hidden
                sx={{
                  mt: '5px',
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: index === 0 ? colors.text : colors.border,
                }}
              />
              <Box>
                <Typography
                  sx={{
                    fontSize: fontSize.small,
                    fontWeight: index === 0 ? fontWeight.extraBold : fontWeight.bold,
                    color: index === 0 ? colors.text : colors.textSecondary,
                  }}
                >
                  {STEP_LABEL[step.status] ?? orderStatusLabel(step.status)}
                </Typography>
                <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>{formatTime(step.at)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </ClientScreen>
  );
}

function Line({ item }: { item: TrackedLine }) {
  const color = item.canceled ? colors.textMuted : colors.text;
  const strike = item.canceled ? 'line-through' : 'none';
  return (
    <Box sx={{ py: 1, display: 'flex', justifyContent: 'space-between', gap: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.small, color, textDecoration: strike }}>
          {item.quantity}x {item.name}
        </Typography>
        {item.options && item.options.length > 0 && (
          <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>{item.options.join(' · ')}</Typography>
        )}
        {item.note &&<Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>{item.note}</Typography>}
      </Box>
      <Typography sx={{ flexShrink: 0, fontSize: fontSize.small, fontWeight: fontWeight.extraBold, color, textDecoration: strike }}>
        {formatCents(item.totalCents)}
      </Typography>
    </Box>
  );
}
