import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import { optionsText, SummaryLine } from '../../components/client/CartParts';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { BagIcon, CheckIcon } from '../../components/client/icons';
import { InfoNote, ScreenHeader, SectionLabel } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import { fetchPickup } from '../../services/tabs';
import type { PickupInfo, PickupOrder } from '../../services/tabs';
import { updateVisit } from '../../services/visit';
import { tokens } from '../../theme/theme';

const REFRESH_MS = 5000;
const { colors, fontSize, fontWeight, radius } = tokens;

const STATUS: Record<string, { label: string; tone: 'dark' | 'light' | 'muted' }> = {
  AWAITING_PAYMENT: { label: 'Pague no caixa', tone: 'dark' },
  RECEIVED: { label: 'Na fila da cozinha', tone: 'light' },
  PREPARING: { label: 'Em preparo', tone: 'light' },
  READY: { label: 'Pronto! Retire no balcão', tone: 'dark' },
  DELIVERED: { label: 'Retirado', tone: 'muted' },
  CANCELLED: { label: 'Cancelado', tone: 'muted' },
  CANCELED: { label: 'Cancelado', tone: 'muted' },
};

/**
 * [Mateus · Card 5] Senha do balcão. A mesma tela mostra a senha com o status dos pedidos, o destaque de
 * "pronto para retirar" e a "retirada confirmada" quando a comanda fecha.
 */
export default function PickupPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [pickup, setPickup] = useState<PickupInfo | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setPickup(await fetchPickup(slug));
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
  if (missing) return <Navigate to={`/t/${slug}/balcao`} replace />;
  if (state.status === 'loading' || (pickup === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (pickup === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  const toMenu = () => navigate(`/t/${slug}/cardapio`);

  if (pickup.tabStatus === 'CLOSED') {
    return (
      <ClientScreen
        footer={
          <ActionButton
            onClick={() => {
              // Comanda encerrada: um novo pedido no balcão começa com nova entrada (e nova senha).
              updateVisit(slug, { sessionId: undefined, guestToken: undefined });
              navigate(`/t/${slug}/balcao`, { replace: true });
            }}
          >
            Fazer outro pedido
          </ActionButton>
        }
      >
        <Banner icon={<CheckIcon sx={{ fontSize: 24 }} />} title="Retirada confirmada" ticket={pickup.pickupTicket}>
          Obrigado, {pickup.customerName}! Bom apetite.
        </Banner>
        <Box sx={{ px: 5, pt: 5, pb: 6 }}>
          <OrdersCard orders={pickup.orders} />
        </Box>
      </ClientScreen>
    );
  }

  if (pickup.pickupTicket === null || pickup.orders.length === 0) {
    return (
      <ClientScreen footer={<ActionButton onClick={toMenu}>Ver o cardápio</ActionButton>}>
        <ScreenHeader title="Senha do balcão" subtitle={state.store.name} onBack={toMenu} />
        <Box sx={{ px: 5, pt: 8 }}>
          <Typography variant="h2" component="h1">
            Você ainda não tem senha
          </Typography>
          <Typography sx={{ mt: 3, color: colors.textSecondary }}>
            A senha aparece aqui assim que você enviar o primeiro pedido.
          </Typography>
        </Box>
      </ClientScreen>
    );
  }

  const ready = pickup.orders.some((order) => order.status === 'READY');
  const unpaid = pickup.orders.filter((order) => order.status === 'AWAITING_PAYMENT');
  const unpaidTotal = unpaid.reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          <ActionButton tone="secondary" onClick={toMenu}>
            Pedir mais
          </ActionButton>
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={() => navigate(`/t/${slug}/comandas/minha`)}>
            Minha comanda
          </ActionButton>
        </>
      }
    >
      {ready ? (
        <Banner icon={<BagIcon sx={{ fontSize: 24 }} />} title="Seu pedido está pronto" ticket={pickup.pickupTicket}>
          Retire no balcão e diga a sua senha.
        </Banner>
      ) : (
        <Box component="header" sx={{ px: 5, pt: 6, pb: 6, textAlign: 'center', borderBottom: `1px solid ${colors.divider}` }}>
          <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}>
            SUA SENHA
          </Typography>
          <Typography component="h1" sx={{ mt: 1, fontSize: 72, fontWeight: fontWeight.extraBold, lineHeight: 1 }}>
            {pickup.pickupTicket}
          </Typography>
          <Typography sx={{ mt: 2, fontSize: fontSize.small, color: colors.textSecondary }}>
            {state.store.name} · {pickup.customerName}
          </Typography>
        </Box>
      )}

      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        {unpaid.length > 0 && (
          <Box sx={{ mb: 5 }}>
            <InfoNote>
              Vá ao caixa, diga a senha <strong>{pickup.pickupTicket}</strong> e pague {formatCents(unpaidTotal)}. O
              pedido só entra na cozinha depois do pagamento.
            </InfoNote>
          </Box>
        )}
        <OrdersCard orders={pickup.orders} />
      </Box>
    </ClientScreen>
  );
}

function Banner({ icon, title, ticket, children }: { icon: ReactNode; title: string; ticket: number | null; children: ReactNode }) {
  return (
    <Box component="header" sx={{ px: 5, pt: 6, pb: 6, bgcolor: 'primary.main', color: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
        <Box
          aria-hidden
          sx={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', bgcolor: 'rgba(255,255,255,.18)' }}
        >
          {icon}
        </Box>
        {ticket !== null && (
          <Typography sx={{ fontSize: fontSize.heading, fontWeight: fontWeight.extraBold }}>Senha {ticket}</Typography>
        )}
      </Box>
      <Typography component="h1" sx={{ mt: 5, fontSize: fontSize.heading, fontWeight: fontWeight.extraBold, lineHeight: 1.15 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 1, fontSize: fontSize.small, opacity: 0.9 }}>{children}</Typography>
    </Box>
  );
}

function OrdersCard({ orders }: { orders: PickupOrder[] }) {
  return (
    <>
      <SectionLabel>Seus pedidos</SectionLabel>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {orders.map((order) => {
          const status = STATUS[order.status] ?? { label: order.status, tone: 'light' as const };
          const muted = status.tone === 'muted';
          return (
            <Box key={order.id} sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                <Typography sx={{ fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}>
                  PEDIDO #{order.number}
                </Typography>
                <Box
                  sx={{
                    px: 3,
                    py: 0.5,
                    borderRadius: 999,
                    bgcolor: status.tone === 'dark' ? colors.text : colors.surface,
                    color: status.tone === 'dark' ? colors.background : colors.textSecondary,
                    fontSize: fontSize.caption,
                    fontWeight: fontWeight.extraBold,
                  }}
                >
                  {status.label}
                </Box>
              </Box>
              {order.items.map((item, index) => (
                <SummaryLine
                  key={index}
                  quantity={item.quantity}
                  name={item.name}
                  options={optionsText(item.options.map((label) => ({ label })))}
                  muted={muted}
                />
              ))}
              <Box sx={{ mt: 2, pt: 3, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${colors.divider}` }}>
                <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.bold }}>Total</Typography>
                <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.extraBold }}>{formatCents(order.totalCents)}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
