import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { CheckIcon, ClocheIcon, ClockIcon, CloseIcon } from '../../components/client/icons';
import { InfoNote, ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { fetchBill, orderStatusLabel } from '../../services/bill';
import type { Bill } from '../../services/bill';
import { formatCents } from '../../services/format';
import { fetchOrder, formatClock } from '../../services/tabs';
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

  if (cancelled) {
    return (
      <CancelledOrder
        slug={slug}
        order={order}
        onBill={() => navigate(`/t/${slug}/conta`)}
        onCallWaiter={() => navigate(`/t/${slug}/garcom`)}
        onOrderMore={() => navigate(`/t/${slug}/cardapio`)}
      />
    );
  }

  const active = order.items.filter((item) => !item.canceled);
  const delivered = active.filter((item) => item.status === 'DELIVERED').length;
  if (ready && delivered > 0 && delivered < active.length) {
    return (
      <PartialDelivery
        order={order}
        delivered={delivered}
        total={active.length}
        onBack={() => navigate(`/t/${slug}/conta`)}
        onCallWaiter={() => navigate(`/t/${slug}/garcom`)}
        onOrderMore={() => navigate(`/t/${slug}/cardapio`)}
      />
    );
  }

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

const ITEM_STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Na fila da cozinha',
  PREPARING: 'Em preparo',
  READY: 'Pronto, o garçom já vai levar',
};

interface PartialDeliveryProps {
  order: TrackedOrder;
  delivered: number;
  total: number;
  onBack: () => void;
  onCallWaiter: () => void;
  onOrderMore: () => void;
}

function PartialDelivery({ order, delivered, total, onBack, onCallWaiter, onOrderMore }: PartialDeliveryProps) {
  const place = order.tableNumber > 0 ? `Mesa ${formatTableNumber(order.tableNumber)}` : 'Balcão';
  const firstPending = order.items.findIndex((item) => !item.canceled && item.status !== 'DELIVERED');

  return (
    <ClientScreen
      footerDivider
      footer={
        <Box sx={{ display: 'flex', gap: 3 }}>
          <ActionButton tone="secondary" onClick={onCallWaiter}>
            Chamar garçom
          </ActionButton>
          <ActionButton onClick={onOrderMore}>Pedir mais</ActionButton>
        </Box>
      }
    >
      <ScreenHeader
        title={`Pedido #${order.number}`}
        subtitle={`${place} · enviado às ${formatClock(order.createdAt)}`}
        onBack={onBack}
        action={
          <Box
            sx={{
              px: 3,
              py: 1,
              borderRadius: 999,
              bgcolor: colors.surface,
              fontSize: fontSize.caption,
              fontWeight: fontWeight.extraBold,
            }}
          >
            {delivered} de {total} entregues
          </Box>
        }
      />

      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        <Box sx={{ p: 4, borderRadius: `${radius.card}px`, bgcolor: colors.surface }}>
          <Typography component="h1" sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
            Parte do pedido já está na mesa
          </Typography>
          <Typography sx={{ mt: 1, fontSize: fontSize.small, color: colors.textSecondary }}>
            O resto já está pronto e o garçom leva em seguida. Itens do mesmo pedido podem chegar em horas diferentes.
          </Typography>
          <Box
            role="progressbar"
            aria-label="Itens entregues"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={delivered}
            sx={{ mt: 3, height: 6, borderRadius: 999, bgcolor: colors.border, overflow: 'hidden' }}
          >
            <Box sx={{ width: `${(delivered / total) * 100}%`, height: '100%', bgcolor: colors.text }} />
          </Box>
        </Box>

        <SectionLabel>Itens do pedido</SectionLabel>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {order.items.map((item, index) => (
            <PartialLine key={index} item={item} highlighted={index === firstPending} />
          ))}
        </Box>

        <InfoNote icon={<ClockIcon sx={{ fontSize: 18 }} />}>
          Se preferir que tudo saia junto, avise o garçom.
        </InfoNote>
      </Box>
    </ClientScreen>
  );
}

function PartialLine({ item, highlighted }: { item: TrackedLine; highlighted: boolean }) {
  const done = item.status === 'DELIVERED';
  const detail = item.canceled
    ? 'Cancelado'
    : done
      ? `Entregue${item.deliveredAt ? ` às ${formatClock(item.deliveredAt)}` : ''}`
      : (ITEM_STATUS_LABEL[item.status ?? ''] ?? orderStatusLabel(item.status ?? ''));
  const strike = item.canceled ? 'line-through' : 'none';
  return (
    <Box
      component="li"
      sx={{
        p: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        border: highlighted ? `2px solid ${colors.text}` : `1px solid ${colors.border}`,
        borderRadius: `${radius.card}px`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bgcolor: done ? colors.textSecondary : 'transparent',
          border: done ? 'none' : `${highlighted ? 2 : 1}px solid ${highlighted ? colors.text : colors.border}`,
          color: '#FFFFFF',
        }}
      >
        {done && <CheckIcon sx={{ fontSize: 16 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: fontSize.small,
            fontWeight: fontWeight.extraBold,
            color: item.canceled ? colors.textMuted : colors.text,
            textDecoration: strike,
          }}
        >
          {item.quantity}x {item.name}
        </Typography>
        <Typography
          sx={{
            fontSize: fontSize.caption,
            fontWeight: highlighted ? fontWeight.extraBold : undefined,
            color: highlighted ? colors.text : colors.textMuted,
          }}
        >
          {detail}
        </Typography>
      </Box>
      <Typography
        sx={{
          flexShrink: 0,
          fontSize: fontSize.small,
          fontWeight: fontWeight.extraBold,
          color: item.canceled ? colors.textMuted : colors.text,
          textDecoration: strike,
        }}
      >
        {formatCents(item.totalCents)}
      </Typography>
    </Box>
  );
}

const CANCEL_REASON_LABEL: Record<string, string> = {
  OUT_OF_STOCK: 'Faltou ingrediente para preparar o pedido.',
  WRONG_ORDER: 'O pedido foi lançado errado.',
  DUPLICATE: 'O pedido chegou duplicado.',
  GAVE_UP: 'O pedido foi cancelado a pedido da mesa.',
};

interface CancelledOrderProps {
  slug: string;
  order: TrackedOrder;
  onBill: () => void;
  onCallWaiter: () => void;
  onOrderMore: () => void;
}

function CancelledOrder({ slug, order, onBill, onCallWaiter, onOrderMore }: CancelledOrderProps) {
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => {
    let alive = true;
    fetchBill(slug)
      .then((next) => alive && setBill(next))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug]);

  const removed = order.items.reduce((sum, item) => sum + item.totalCents, 0);
  const place = order.tableNumber > 0 ? `Mesa ${formatTableNumber(order.tableNumber)}` : 'Balcão';
  const reason = order.cancelReason ? CANCEL_REASON_LABEL[order.cancelReason] : undefined;
  const lines = bill ? bill.orders.flatMap((billOrder) => billOrder.items) : [];
  const errorTint = `${colors.error}14`;

  return (
    <ClientScreen
      footerDivider
      footer={
        <Box sx={{ display: 'flex', gap: 3 }}>
          <ActionButton tone="secondary" onClick={onOrderMore}>
            Pedir outra coisa
          </ActionButton>
          <ActionButton onClick={onCallWaiter}>Chamar garçom</ActionButton>
        </Box>
      }
    >
      <ScreenHeader
        title="Seus pedidos"
        subtitle={bill ? `${place} · Comanda de ${bill.ownerName}` : place}
        onBack={onBill}
        action={
          <ActionButton
            tone="secondary"
            fullWidth={false}
            onClick={onBill}
            sx={{ minHeight: 36, px: 3, fontSize: fontSize.caption, whiteSpace: 'nowrap' }}
          >
            Minha conta
          </ActionButton>
        }
      />

      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        <Box
          role="alert"
          sx={{ p: 4, border: `1px solid ${colors.error}`, borderRadius: `${radius.card}px` }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              aria-hidden
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                bgcolor: errorTint,
                color: colors.error,
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography component="h1" sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>
                Pedido #{order.number} cancelado
              </Typography>
              {order.cancelledAt && (
                <Typography sx={{ fontSize: fontSize.caption, color: colors.textSecondary }}>
                  A casa cancelou às {formatClock(order.cancelledAt)}
                </Typography>
              )}
            </Box>
          </Box>

          {(reason || order.cancelNote) && (
            <Box sx={{ mt: 4, p: 3, borderRadius: `${radius.button}px`, bgcolor: errorTint, color: colors.error }}>
              <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1 }}>
                MOTIVO
              </Typography>
              {reason && <Typography sx={{ mt: 1, fontSize: fontSize.small }}>{reason}</Typography>}
              {order.cancelNote && <Typography sx={{ fontSize: fontSize.small }}>{order.cancelNote}</Typography>}
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: fontSize.small, color: colors.textSecondary }}>Valor retirado da conta</Typography>
            <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>{formatCents(removed)}</Typography>
          </Box>
        </Box>

        {bill && (
          <Box sx={{ mt: 4, p: 4, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
            <Typography sx={{ mb: 2, fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}>
              SUA CONTA AGORA
            </Typography>
            {lines.map((item, index) => {
              const strike = item.canceled ? 'line-through' : 'none';
              const color = item.canceled ? colors.textMuted : colors.text;
              return (
                <Box key={index} sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', gap: 3 }}>
                  <Typography sx={{ fontSize: fontSize.small, color, textDecoration: strike }}>
                    {item.quantity}x {item.name}
                  </Typography>
                  <Typography sx={{ flexShrink: 0, fontSize: fontSize.small, fontWeight: fontWeight.extraBold, color, textDecoration: strike }}>
                    {formatCents(item.totalCents)}
                  </Typography>
                </Box>
              );
            })}
            {bill.serviceFeeCents > 0 && (
              <Box sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', color: colors.textSecondary }}>
                <Typography sx={{ fontSize: fontSize.small }}>Serviço</Typography>
                <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>
                  {formatCents(bill.serviceFeeCents)}
                </Typography>
              </Box>
            )}
            <Box sx={{ mt: 2, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${colors.border}` }}>
              <Typography sx={{ fontSize: fontSize.base, fontWeight: fontWeight.extraBold }}>Total</Typography>
              <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>
                {formatCents(bill.totalCents)}
              </Typography>
            </Box>
          </Box>
        )}

        <Typography sx={{ mt: 3, fontSize: fontSize.caption, color: colors.textMuted }}>
          Se você já pagou por Pix e o valor mudou, a diferença é devolvida pela casa no caixa.
        </Typography>
      </Box>
    </ClientScreen>
  );
}
