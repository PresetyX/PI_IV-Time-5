import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import ActionButton from '../../components/client/ActionButton';
import { optionsText, SummaryLine } from '../../components/client/CartParts';
import ClientScreen from '../../components/client/ClientScreen';
import ConnectionLostScreen from '../../components/client/ConnectionLostScreen';
import { ClientError, ClientLoading } from '../../components/client/ClientStates';
import { CheckIcon } from '../../components/client/icons';
import { InfoNote } from '../../components/client/TabParts';
import { guestGatePath, useExpiredSession } from '../../hooks/useGuestSession';
import { useStore } from '../../hooks/useStore';
import { useStoreColor } from '../../hooks/useStoreColor';
import { ApiError } from '../../services/api';
import { formatCents } from '../../services/format';
import { fetchOrder, fetchPickup } from '../../services/tabs';
import { readVisit } from '../../services/visit';
import type { TrackedOrder } from '../../services/tabs';
import { formatTableNumber } from '../../services/tables';
import { tokens } from '../../theme/theme';

const { colors, fontSize, fontWeight, radius } = tokens;

export default function OrderSentPage() {
  const { slug = '', orderId = '' } = useParams();
  const navigate = useNavigate();
  const { state, retry } = useStore(slug);
  useStoreColor(state.status === 'ready' ? state.store.primaryColor : null);
  const handleExpired = useExpiredSession(slug);
  const gate = guestGatePath(slug);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // [Mateus · Card 5] No balcão a tela mostra a senha e manda pagar no caixa.
  const counter = Boolean(readVisit(slug).counter);
  const [ticket, setTicket] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(slug, orderId));
      if (counter) setTicket((await fetchPickup(slug)).pickupTicket);
      setLoadFailed(false);
    } catch (caught) {
      if (handleExpired(caught)) return;
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
      else setLoadFailed(true);
    }
  }, [slug, orderId, handleExpired, counter]);

  useEffect(() => {
    if (!gate) load();
  }, [gate, load]);

  if (gate) return <Navigate to={gate} replace />;
  if (missing) return <Navigate to={`/t/${slug}/conta`} replace />;
  if (state.status === 'loading' || (order === null && !loadFailed)) return <ClientLoading />;
  if (state.status === 'error') return <ClientError notFound={state.notFound} onRetry={retry} />;
  if (order === null) return <ConnectionLostScreen slug={slug} onRetry={load} />;

  return (
    <ClientScreen
      footerDivider
      footer={
        <>
          {counter ? (
            <ActionButton onClick={() => navigate(`/t/${slug}/balcao/senha`, { replace: true })}>Ver minha senha</ActionButton>
          ) : (
            <ActionButton onClick={() => navigate(`/t/${slug}/pedidos/${order.id}`, { replace: true })}>
              Acompanhar pedido
            </ActionButton>
          )}
          <ActionButton tone="quiet" sx={{ mt: 2 }} onClick={() => navigate(`/t/${slug}/comandas/minha`)}>
            Voltar para minha comanda
          </ActionButton>
        </>
      }
    >
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
          <CheckIcon sx={{ fontSize: 24 }} />
        </Box>
        <Typography component="h1" sx={{ mt: 5, fontSize: fontSize.heading, fontWeight: fontWeight.extraBold, lineHeight: 1.15 }}>
          Pedido enviado
        </Typography>
        <Typography sx={{ mt: 1, fontSize: fontSize.small, opacity: 0.9 }}>
          {counter
            ? `Pedido #${order.number}${ticket ? ` · senha ${ticket}` : ''}. Pague no caixa para ele entrar na cozinha.`
            : `Pedido #${order.number} · mesa ${formatTableNumber(order.tableNumber)}. A cozinha já recebeu.`}
        </Typography>
      </Box>

      <Box sx={{ px: 5, pt: 5, pb: 6 }}>
        <Box sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: `${radius.card}px` }}>
          <Typography sx={{ mb: 2, fontSize: fontSize.caption, fontWeight: fontWeight.extraBold, letterSpacing: 1, color: colors.textSecondary }}>
            PEDIDO #{order.number}
          </Typography>
          {order.items.map((item, index) => (
            <SummaryLine
              key={index}
              quantity={item.quantity}
              name={item.name}
              options={optionsText(item.options?.map((label) => ({ label })))}
              note={item.note}
              totalCents={item.totalCents}
              muted={item.canceled}
            />
          ))}
          <Box
            sx={{
              mt: 2,
              pt: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: `1px solid ${colors.divider}`,
            }}
          >
            <Typography sx={{ fontSize: fontSize.small, fontWeight: fontWeight.bold }}>Total</Typography>
            <Typography sx={{ fontSize: fontSize.title, fontWeight: fontWeight.extraBold }}>
              {formatCents(order.totalCents)}
            </Typography>
          </Box>
        </Box>
        <InfoNote>
          {counter
            ? `Vá ao caixa, diga a senha${ticket ? ` ${ticket}` : ''} e pague ${formatCents(order.totalCents)}. Avisamos aqui quando ficar pronto para retirar.`
            : 'Avisamos aqui no celular quando ficar pronto. O valor já entrou na sua comanda.'}
        </InfoNote>
      </Box>
    </ClientScreen>
  );
}
