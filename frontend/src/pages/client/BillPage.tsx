import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { ScreenHeader } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { fetchBill, orderStatusLabel } from '../../services/bill';
import type { Bill, BillLine } from '../../services/bill';
import { formatCents } from '../../services/format';
import { formatClock } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 8000;
const { colors, fontSize, fontWeight, radius } = tokens;

export default function BillPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [bill, setBill] = useState<Bill | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setBill(await fetchBill(slug));
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
      else setLoadFailed(true);
    }
  }, [slug, handleExpired]);

  useEffect(() => {
    if (gate) return undefined;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [gate, load]);

  if (gate) return <Navigate to={gate} replace />;
  if (missing) return <Navigate to={`/t/${slug}/comandas`} replace />;
  if (state.status === 'loading' || (bill === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (bill === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          <ActionButton onClick={() => navigate(`/t/${slug}/pix`)}>Pagar por Pix</ActionButton>
          <ActionButton tone="secondary" onClick={() => navigate(`/t/${slug}/garcom`)} sx={{ mt: 2 }}>
            Pagar com garçom
          </ActionButton>
        </>
      }
    >
      <ScreenHeader
        title={`Comanda de ${bill.ownerName}`}
        subtitle={`Mesa ${formatTableNumber(bill.tableNumber)} · aberta às ${formatClock(bill.openedAt)}`}
        onBack={() => navigate(`/t/${slug}/comandas/minha`)}
      />
      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {bill.orders.length === 0 && (
          <Typography sx={{ py: 6, textAlign: 'center', color: colors.textMuted }}>
            Nenhum pedido nesta comanda ainda.
          </Typography>
        )}
        {bill.orders.map((order) => (
          <Box key={order.id} sx={{ mb: 5 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1 }}>
                PEDIDO #{order.number}
              </Typography>
              <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>
                {orderStatusLabel(order.status)}
              </Typography>
            </Box>
            <Box sx={{ border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px`, overflow: 'hidden' }}>
              {order.items.map((item, index) => (
                <Line key={index} item={item} first={index === 0} />
              ))}
            </Box>
          </Box>
        ))}

        {bill.orders.length > 0 && (
          <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: colors.surface }}>
            <Sum label="Consumo" cents={bill.consumptionCents} />
            <Sum label="Serviço (10%, opcional)" cents={bill.serviceFeeCents} />
            <Box sx={{ mt: 3, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${colors.border}` }}>
              <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>Total</Typography>
              <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>
                {formatCents(bill.totalCents)}
              </Typography>
            </Box>
          </Box>
        )}
        <Typography sx={{ mt: 3, fontSize: fontSize.caption, color: colors.textMuted }}>
          A conta é só sua. Quem está na mesma mesa paga a comanda dela.
        </Typography>
      </Box>
    </ClientScreen>
  );
}

function Line({ item, first }: { item: BillLine; first: boolean }) {
  const muted = item.canceled ? colors.textMuted : colors.text;
  const strike = item.canceled ? 'line-through' : 'none';
  return (
    <Box
      sx={{
        px: 4,
        py: 3,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 3,
        borderTop: first ? 'none' : `1px solid ${colors.divider}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSize.button, fontWeight: fontWeight.bold, color: muted, textDecoration: strike }}>
          {item.quantity}x {item.name}
        </Typography>
        {item.note && <Typography sx={{ fontSize: fontSize.caption, color: colors.textMuted }}>{item.note}</Typography>}
      </Box>
      <Typography
        sx={{ flexShrink: 0, fontSize: fontSize.button, fontWeight: fontWeight.extraBold, color: muted, textDecoration: strike }}
      >
        {formatCents(item.totalCents)}
      </Typography>
    </Box>
  );
}

function Sum({ label, cents }: { label: string; cents: number }) {
  return (
    <Box sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', color: colors.textSecondary }}>
      <Typography sx={{ fontSize: fontSize.button }}>{label}</Typography>
      <Typography sx={{ fontSize: fontSize.button, fontWeight: fontWeight.extraBold }}>{formatCents(cents)}</Typography>
    </Box>
  );
}
